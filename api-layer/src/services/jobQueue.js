require('dotenv').config();
const Redis = require('ioredis');

const QUEUE_NAME = 'job_queue';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));

async function enqueueJob(job) {
  const fullJob = { ...job, created_at: new Date().toISOString() };
  await redis.lpush(QUEUE_NAME, JSON.stringify(fullJob));
  console.log(`Job enqueued: ${job.job_type} [${job.job_id}]`);
}

async function dequeueJob() {
  const result = await redis.brpop(QUEUE_NAME, 5);
  if (!result) return null;
  try {
    return JSON.parse(result[1]);
  } catch {
    console.error('Failed to parse job from queue');
    return null;
  }
}

async function getQueueDepth() {
  return redis.llen(QUEUE_NAME);
}

async function cacheSet(key, value, ttlSeconds = 3600) {
  await redis.setex(`cache:${key}`, ttlSeconds, JSON.stringify(value));
}

async function cacheGet(key) {
  const raw = await redis.get(`cache:${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = { redis, enqueueJob, dequeueJob, getQueueDepth, cacheSet, cacheGet };