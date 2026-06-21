const { createClient } = require('redis');

let redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('Failed to connect to REDIS_URL, falling back to localhost:', err);
        // Reinitialize client with localhost fallback
        const fallbackClient = createClient({ url: 'redis://localhost:6379' });
        fallbackClient.on('error', (e) => console.log('Fallback Redis Error', e));
        fallbackClient.on('connect', () => console.log('Fallback Redis Connected'));
        await fallbackClient.connect();
        module.exports.redisClient = fallbackClient; // export fallback
    }
};

module.exports = { redisClient, connectRedis };
