const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const logger = require('../config/logger');

const authenticate = async (req, res, next) => {
  try {
    // Step 1: Read Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    // Step 2: Extract token from header
    const token = authHeader.split(' ')[1];

    // Step 3: Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // Step 4: Find user by id
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // Step 5: Check user status
    if (user.status !== "approved") {
      return res.status(403).json({ success: false, message: "Account not active" });
    }

    // Step 6 & 7: Set req.user and update lastActiveAt (fire and forget)
    req.user = user;
    
    User.findByIdAndUpdate(user._id, { lastActiveAt: new Date() }).catch(err => logger.error("Failed to update lastActiveAt: ", err));

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error during authentication" });
  }
};

module.exports = { authenticate };
