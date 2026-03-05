const express = require('express');
const { query } = require('../services/db');

const router = express.Router();

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

// GET /api/export/csv/:contractId
router.get('/csv/:contractId', async (req, res) => {
  try {
    const result = await query(
      `SELECT
        re.recognition_date,
        re.accounting_period,
        re.recognized_amount,
        re.deferred_amount,
        re.recognition_method,
        re.period_start,
        re.period_end,
        c.customer_name,
        c.contract_number,
        p.name AS pob_name
      FROM recognition_entries re
      JOIN contracts c ON c.id = re.contract_id
      LEFT JOIN performance_obligations p ON p.id::text = re.performance_obligation_id
      WHERE re.contract_id = $1
      ORDER BY re.recognition_date ASC`,
      [req.params.contractId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No recognition entries found for this contract' });
    }

    const headers = [
      'Recognition Date', 'Accounting Period', 'Customer', 'Contract Number',
      'Performance Obligation', 'Recognized Amount', 'Deferred Amount',
      'Recognition Method', 'Period Start', 'Period End',
    ];

    const rows = result.rows.map((r) => [
      formatDate(r.recognition_date),
      r.accounting_period,
      `"${r.customer_name}"`,
      r.contract_number,
      `"${r.pob_name || ''}"`,
      parseFloat(r.recognized_amount).toFixed(2),
      parseFloat(r.deferred_amount).toFixed(2),
      r.recognition_method,
      formatDate(r.period_start),
      formatDate(r.period_end),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="revenue_${req.params.contractId}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/quickbooks/:contractId
router.get('/quickbooks/:contractId', async (req, res) => {
  try {
    const result = await query(
      `SELECT
        re.recognition_date, re.accounting_period,
        re.recognized_amount, re.recognition_method,
        c.customer_name, c.contract_number
      FROM recognition_entries re
      JOIN contracts c ON c.id = re.contract_id
      WHERE re.contract_id = $1
      ORDER BY re.recognition_date ASC`,
      [req.params.contractId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No recognition entries found' });
    }

    const lines = [
      '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO',
      '!SPL\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO',
      '!ENDTRNS',
    ];

    for (const r of result.rows) {
      const date = new Date(r.recognition_date).toLocaleDateString('en-US');
      const amount = parseFloat(r.recognized_amount).toFixed(2);
      lines.push(`TRNS\tINVOICE\t${date}\tAccounts Receivable\t${r.customer_name}\t${amount}\t${r.contract_number} ${r.accounting_period}`);
      lines.push(`SPL\tINVOICE\t${date}\tRevenue:${r.recognition_method}\t-${amount}\t${r.accounting_period}`);
      lines.push('ENDTRNS');
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="quickbooks_${req.params.contractId}.iif"`);
    res.send(lines.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/json/:contractId
router.get('/json/:contractId', async (req, res) => {
  try {
    const result = await query(
      `SELECT re.*, c.customer_name, c.contract_number, p.name AS pob_name
       FROM recognition_entries re
       JOIN contracts c ON c.id = re.contract_id
       LEFT JOIN performance_obligations p ON p.id::text = re.performance_obligation_id
       WHERE re.contract_id = $1
       ORDER BY re.recognition_date ASC`,
      [req.params.contractId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No recognition entries found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="revenue_${req.params.contractId}.json"`);
    res.json({
      exported_at: new Date().toISOString(),
      contract_id: req.params.contractId,
      total_entries: result.rows.length,
      entries: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;