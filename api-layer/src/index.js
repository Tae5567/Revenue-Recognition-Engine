require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./services/db');
const { redis } = require('./services/jobQueue');
const contractRoutes = require('./routes/contracts');
const transactionRoutes = require('./routes/transactions');
const jobRoutes = require('./routes/jobs');
const exportRoutes = require('./routes/export');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/contracts', contractRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/export', exportRoutes);

app.get('/health', async (req, res) => {
  try {
    const { query } = require('./services/db');
    await query('SELECT 1');
    const pingResult = await redis.ping();
    res.json({
      status: 'healthy',
      service: 'api-layer',
      db: 'connected',
      redis: pingResult === 'PONG' ? 'connected' : 'error',
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({
    service: 'Revenue Recognition API Layer',
    version: '1.0.0',
    endpoints: ['/api/contracts', '/api/transactions', '/api/jobs', '/api/export', '/health'],
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message });
});

const PORT = parseInt(process.env.PORT || '4000', 10);

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`API Layer running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

module.exports = { app };