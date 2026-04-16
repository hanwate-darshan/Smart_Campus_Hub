const { redisClient } = require('../config/redis');
const logger = require('../config/logger');

const MARKETPLACE_CACHE_KEY = 'marketplace:listings:all';

/**
 * Middleware to check cache for marketplace listings
 */
const cacheMiddleware = async (req, res, next) => {
  // Only cache GET /api/listings with default params (e.g. no search/category for now for simplicity)
  // Or we can vary by query params. Let's keep it simple as per PHASE 10B.
  if (req.method !== 'GET' || Object.keys(req.query).length > 0) {
    return next();
  }

  try {
    const cachedData = await redisClient.get(MARKETPLACE_CACHE_KEY);
    if (cachedData) {
      logger.info('Cache Hit: Marketplace Listings');
      return res.json(JSON.parse(cachedData));
    }
    next();
  } catch (err) {
    logger.error('Redis Cache Error', err);
    next();
  }
};

/**
 * Set cache for marketplace
 */
const setMarketplaceCache = async (data) => {
  try {
    await redisClient.set(MARKETPLACE_CACHE_KEY, JSON.stringify(data), {
      EX: 30 // 30 seconds TTL
    });
    logger.info('Cache Set: Marketplace Listings');
  } catch (err) {
    logger.error('Redis Set Cache Error', err);
  }
};

/**
 * Invalidate marketplace cache
 */
const invalidateMarketplaceCache = async () => {
  try {
    await redisClient.del(MARKETPLACE_CACHE_KEY);
    logger.info('Cache Invalidated: Marketplace');
  } catch (err) {
    logger.error('Redis Invalidate Error', err);
  }
};

module.exports = {
  cacheMiddleware,
  setMarketplaceCache,
  invalidateMarketplaceCache
};
