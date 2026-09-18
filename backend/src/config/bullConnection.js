const IORedis = require('ioredis');
require('dotenv').config();

const createBullConnection = () => {
  const client = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 4000,
    retryStrategy: (times) => {
      if (times > 3) return null; // stop retrying after 3 attempts
      return 1000;
    },
    tls: (process.env.REDIS_URL || '').startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  });

  client.on('error', (err) => {
    // Avoid spamming unhandled error events
  });

  return client;
};

module.exports = createBullConnection;

