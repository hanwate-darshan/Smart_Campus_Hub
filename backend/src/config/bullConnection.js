const IORedis = require('ioredis');
require('dotenv').config();

const createBullConnection = () => {
  return new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    tls: (process.env.REDIS_URL || '').startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  });
};

module.exports = createBullConnection;
