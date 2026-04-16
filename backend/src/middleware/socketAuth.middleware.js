const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }

    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    if (user.status !== "approved") {
      return next(new Error("Authentication error: Account not active"));
    }

    // Attach user to socket data for access in handlers
    socket.data.user = user;
    next();
  } catch (error) {
    console.error("Socket Auth Error:", error);
    next(new Error("Internal server error during socket authentication"));
  }
};

module.exports = { socketAuth };
