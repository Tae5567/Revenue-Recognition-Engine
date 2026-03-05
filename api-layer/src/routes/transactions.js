require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../services/db');
const { enqueueJob } = require('../services/jobQueue');
const { parseTransactionFile } = require('../services/fileParser');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const ENGINE_URL = process.env.PROCESSING_ENGINE_URL || 'http://localhost:8000';

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const contractId = req.query.contract_id;
    const params = contractId ? [contractId] : [];
    const where = contractId ? 'WHERE contract_id = $1' : '';

    const result = await query(
      `SELECT * FROM transactions ${where} ORDER BY transaction_date DESC LIMIT 200`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions/upload  — CSV or JSON file
router.post('/upload', upload.single('transactions'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a CSV or JSON file in the "transactions" field.' });
    }

    let parseResult;
    try {
      parseResult = parseTransactionFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    } catch (parseErr) {
      return res.status(422).json({ error: parseErr.message });
    }

    if (parseResult.valid_rows === 0) {
      return res.status(422).json({
        error: 'No valid transactions found in file',
        parse_errors: parseResult.errors,
      });
    }

    const savedIds = [];
    for (const txn of parseResult.transactions) {
      const txnId = uuidv4();
      await query(
        `INSERT INTO transactions (
          id, contract_id, customer_id, transaction_date, amount,
          usage_quantity, usage_unit, transaction_type, description, raw_data
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT DO NOTHING`,
        [
          txnId,
          txn.contract_id,
          txn.customer_id,
          txn.transaction_date,
          txn.amount,
          txn.usage_quantity,
          txn.usage_unit,
          txn.transaction_type,
          txn.description,
          JSON.stringify(txn.raw_data),
        ]
      );
      savedIds.push(txnId);
    }

    const jobId = uuidv4();
    await query(
      `INSERT INTO processing_jobs (id, job_type, status, input_data)
       VALUES ($1, 'process_transactions', 'queued', $2)`,
      [jobId, JSON.stringify({ transaction_ids: savedIds, record_count: savedIds.length })]
    );

    await enqueueJob({
      job_id: jobId,
      job_type: 'process_transactions',
      transaction_ids: savedIds,
    });

    res.status(202).json({
      job_id: jobId,
      transactions_saved: savedIds.length,
      parse_errors: parseResult.errors,
      total_rows: parseResult.total_rows,
      status: 'queued',
      poll_url: `/api/jobs/${jobId}/status`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions/process/:contractId — immediate processing
router.post('/process/:contractId', async (req, res) => {
  const { contractId } = req.params;

  try {
    const contractResult = await query('SELECT * FROM contracts WHERE id = $1', [contractId]);
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: `Contract ${contractId} not found` });
    }
    const contract = contractResult.rows[0];

    const pobResult = await query(
      'SELECT * FROM performance_obligations WHERE contract_id = $1',
      [contractId]
    );

    const txnResult = await query(
      'SELECT * FROM transactions WHERE contract_id = $1 ORDER BY transaction_date ASC',
      [contractId]
    );

    if (txnResult.rows.length === 0) {
      return res.status(400).json({
        error: 'No transactions found for this contract. Upload transactions first.',
      });
    }

    const contractPayload = {
      ...(contract.ai_parsed_terms || {}),
      contract_id: contractId,
      customer_name: contract.customer_name,
      contract_number: contract.contract_number,
      start_date: contract.start_date,
      end_date: contract.end_date,
      total_contract_value: parseFloat(contract.total_contract_value),
      billing_type: contract.billing_type,
      performance_obligations: pobResult.rows.map((p) => ({
        id: p.id,
        name: p.name,
        pob_type: p.pob_type,
        satisfaction_method: p.satisfaction_method,
        allocated_value: parseFloat(p.allocated_value),
        standalone_selling_price: p.standalone_selling_price
          ? parseFloat(p.standalone_selling_price)
          : null,
        start_date: p.start_date || contract.start_date,
        end_date: p.end_date || contract.end_date,
        description: p.description || null,
      })),
    };

    const transactionsPayload = txnResult.rows.map((t) => ({
      id: t.id,
      contract_id: t.contract_id,
      customer_id: t.customer_id,
      transaction_date: t.transaction_date,
      amount: parseFloat(t.amount),
      usage_quantity: t.usage_quantity ? parseFloat(t.usage_quantity) : null,
      usage_unit: t.usage_unit || null,
      transaction_type: t.transaction_type,
      description: t.description || null,
    }));

    let engineResponse;
    try {
      engineResponse = await axios.post(
        `${ENGINE_URL}/recognition/process`,
        { transactions: transactionsPayload, contract: contractPayload },
        { timeout: 60000 }
      );
    } catch (axiosErr) {
      return res.status(502).json({
        error: 'Processing engine unavailable. Is FastAPI running on port 8000?',
        detail: axiosErr.response ? axiosErr.response.data : axiosErr.message,
      });
    }

    const schedule = engineResponse.data.recognition_schedule;
    let inserted = 0;

    for (const entry of schedule) {
      const result = await query(
        `INSERT INTO recognition_entries (
          transaction_id, contract_id, performance_obligation_id,
          recognition_date, recognized_amount, deferred_amount,
          recognition_method, period_start, period_end,
          accounting_period, status, audit_trail
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'recognized',$11)
        ON CONFLICT DO NOTHING
        RETURNING id`,
        [
          entry.transaction_id,
          entry.contract_id,
          entry.performance_obligation_id || null,
          entry.recognition_date,
          entry.recognized_amount,
          entry.deferred_amount,
          entry.recognition_method,
          entry.period_start || null,
          entry.period_end || null,
          entry.accounting_period,
          JSON.stringify(entry.audit_trail),
        ]
      );
      if (result.rows.length > 0) inserted++;
    }

    await query(
      `INSERT INTO audit_log (entity_type, entity_id, action, details)
       VALUES ('contract', $1, 'recognition_processed', $2)`,
      [
        contractId,
        JSON.stringify({
          entries_created: inserted,
          total_recognized: engineResponse.data.total_recognized,
        }),
      ]
    );

    res.json({
      status: 'processed',
      contract_id: contractId,
      transactions_processed: txnResult.rows.length,
      entries_created: inserted,
      total_recognized: engineResponse.data.total_recognized,
      period_summary: engineResponse.data.period_summary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;