const { createClient } = require('redis');

// In-memory store fallback if Redis connection fails or is unavailable
const memoryStore = new Map();
const memoryFallbackClient = {
  isFallback: true,
  async get(key) {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },
  async set(key, value, options) {
    let expiresAt = null;
    if (options && options.EX) {
      expiresAt = Date.now() + options.EX * 1000;
    }
    memoryStore.set(key, { value: String(value), expiresAt });
    return 'OK';
  },
  async del(key) {
    const existed = memoryStore.has(key);
    memoryStore.delete(key);
    return existed ? 1 : 0;
  },
  async connect() { return this; },
  async disconnect() {},
  on() { return this; }
};

let activeClient = memoryFallbackClient;

// Proxy object so any imports of redisClient seamlessly delegate to activeClient
const redisClient = new Proxy({}, {
  get(target, prop) {
    if (activeClient && typeof activeClient[prop] === 'function') {
      return activeClient[prop].bind(activeClient);
    }
    return activeClient ? activeClient[prop] : undefined;
  }
});

const connectRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[Redis] No REDIS_URL provided. Running with in-memory fallback.');
    activeClient = memoryFallbackClient;
    return activeClient;
  }

  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 4000,
        reconnectStrategy: (retries) => {
          if (retries >= 2) return false; // Stop retrying after 2 attempts
          return 1000;
        }
      }
    });

    client.on('error', (err) => {
      // Prevent uncaught error event crash
    });

    // Timeout promise after 4.5 seconds to guarantee startServer never hangs
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timed out after 4500ms')), 4500)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    console.log('[Redis] Connected successfully to Redis server');
    activeClient = client;
    return client;
  } catch (err) {
    console.warn(`[Redis] Connection failed (${err.message}). Using in-memory fallback.`);
    activeClient = memoryFallbackClient;
    return activeClient;
  }
};

module.exports = { redisClient, connectRedis };

