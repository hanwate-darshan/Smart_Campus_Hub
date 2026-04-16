/**
 * Custom Security Middlewares for Express 5 Compatibility
 */

/**
 * Sanitize an object to prevent NoSQL injection by stripping $ and . from keys
 */
const sanitize = (obj) => {
  if (obj instanceof Array) {
    for (let i = 0; i < obj.length; i++) {
      sanitize(obj[i]);
    }
  } else if (obj !== null && typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitize(obj[key]);
      }
    });
  }
};

const mongoSanitizeExpress5 = (req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  // We avoid mutating req.query directly because it's a readonly getter in Express 5
  // However, sanitize() works by deleting keys or changing values inside the object, 
  // which works even if the object itself cannot be replaced.
  if (req.query) {
    try {
      sanitize(req.query);
    } catch (e) {
      // Ignore if properties inside req.query are also frozen
    }
  }
  next();
};

module.exports = { mongoSanitizeExpress5 };
