const express = require('express');
const { query } = require('../services/db');
const { getQueueDepth, enqueueJob } = require('../services/jobQueue');

const router = express.Router();

// GET /api/jobs
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);
    const offset = parseInt(req.query.offset || '0');
    const status = req.query.status;

    const params = status ? [status, limit, offset] : [limit, offset];
    const where = status ? 'WHERE status = $1' : '';
    const limitIdx = status ? '$2' : '$1';
    const offsetIdx = status ? '$3' : '$2';

    const result = await query(
      `SELECT * FROM processing_jobs ${where} ORDER BY created_at DESC LIMIT ${limitIdx} OFFSET ${offsetIdx}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM processing_jobs ${where}`,
      status ? [status] : []
    );

    const queueDepth = await getQueueDepth();

    res.json({
      jobs: result.rows,
      total: countResult.rows[0].total,
      queue_depth: queueDepth,
      limit,
      offset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/queue/stats
router.get('/queue/stats', async (req, res) => {
  try {
    const statusCounts = await query(
      `SELECT status, COUNT(*)::int AS count FROM processing_jobs GROUP BY status`
    );
    const queueDepth = await getQueueDepth();

    const stats = { queue_depth: queueDepth };
    for (const row of statusCounts.rows) {
      stats[row.status] = row.count;
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id/status
router.get('/:id/status', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, status, job_type, created_at, started_at, completed_at, error_message
       FROM processing_jobs WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = result.rows[0];
    const durationMs =
      job.started_at && job.completed_at
        ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
        : null;

    res.json({
      id: job.id,
      status: job.status,
      job_type: job.job_type,
      duration_ms: durationMs,
      error: job.error_message || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM processing_jobs WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/retry
router.post('/:id/retry', async (req, res) => {
  try {
    const result = await query(
      `UPDATE processing_jobs
       SET status = 'queued', error_message = NULL, started_at = NULL, completed_at = NULL
       WHERE id = $1 AND status = 'failed'
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Job not found or is not in a failed state' });
    }

    const job = result.rows[0];
    await enqueueJob({
      job_id: job.id,
      job_type: job.job_type,
      payload: job.input_data,
    });

    res.json({ message: 'Job re-queued', job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;