require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../services/db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const ENGINE_URL = process.env.PROCESSING_ENGINE_URL || 'http://localhost:8000';

// GET /api/contracts
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        c.*,
        COUNT(DISTINCT t.id)::int                     AS transaction_count,
        COALESCE(SUM(re.recognized_amount), 0)::float AS total_recognized,
        COALESCE(MAX(re.deferred_amount), 0)::float   AS current_deferred
      FROM contracts c
      LEFT JOIN transactions t ON t.contract_id = c.id
      LEFT JOIN recognition_entries re ON re.contract_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contracts/:id
router.get('/:id', async (req, res) => {
  try {
    const contractResult = await query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const pobResult = await query(
      'SELECT * FROM performance_obligations WHERE contract_id = $1 ORDER BY name',
      [req.params.id]
    );

    res.json({ ...contractResult.rows[0], performance_obligations: pobResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contracts/upload
router.post('/upload', upload.single('contract'), async (req, res) => {
  try {
    const contractText = req.file
      ? req.file.buffer.toString('utf-8')
      : req.body.contract_text || '';

    if (!contractText.trim()) {
      return res.status(400).json({ error: 'No contract text provided' });
    }

    let parsed;
    try {
      const parseResponse = await axios.post(
        `${ENGINE_URL}/contracts/parse`,
        { contract_text: contractText },
        { timeout: 30000 }
      );
      parsed = parseResponse.data.parsed_terms;
      parsed.ai_confidence = parseResponse.data.confidence;
      parsed.flags = parseResponse.data.flags;
    } catch (axiosErr) {
      const detail = axiosErr.response ? axiosErr.response.data : axiosErr.message;
      return res.status(502).json({
        error: 'AI parsing service unavailable. Is the processing engine running on port 8000?',
        detail,
      });
    }

    const contractId = uuidv4();

    await query(
      `INSERT INTO contracts (
        id, customer_name, contract_number, start_date, end_date,
        total_contract_value, billing_type, status, raw_contract_text,
        ai_parsed_terms, payment_terms
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10)`,
      [
        contractId,
        parsed.customer_name || 'Unknown',
        parsed.contract_number || `CONTRACT-${Date.now()}`,
        parsed.start_date || null,
        parsed.end_date || null,
        parsed.total_contract_value || 0,
        parsed.billing_type || 'fixed',
        contractText,
        JSON.stringify(parsed),
        JSON.stringify(parsed.payment_schedule || {}),
      ]
    );

    const pobs = parsed.performance_obligations || [];
    for (const pob of pobs) {
      await query(
        `INSERT INTO performance_obligations (
          id, contract_id, name, pob_type, satisfaction_method,
          allocated_value, standalone_selling_price, description
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          uuidv4(),
          contractId,
          pob.name,
          pob.pob_type,
          pob.satisfaction_method,
          pob.allocated_value,
          pob.standalone_selling_price || null,
          pob.description || null,
        ]
      );
    }

    await query(
      `INSERT INTO audit_log (entity_type, entity_id, action, details)
       VALUES ('contract', $1, 'created', $2)`,
      [contractId, JSON.stringify({ ai_confidence: parsed.ai_confidence, pob_count: pobs.length })]
    );

    res.status(201).json({
      contract_id: contractId,
      parsed_terms: parsed,
      confidence: parsed.ai_confidence,
      flags: parsed.flags || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contracts/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM contracts WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json({ message: 'Contract deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;