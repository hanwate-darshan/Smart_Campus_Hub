const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

module.exports = { requireRole };

// EXAMPLE USAGE:
// const { authenticate } = require('./auth.middleware');
// const { requireRole } = require('./role.middleware');
// router.get('/admin-only', authenticate, requireRole('admin'), handler);
// router.get('/multi', authenticate, requireRole('teacher', 'admin'), handler);
