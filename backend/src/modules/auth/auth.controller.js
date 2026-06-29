const authService = require('./auth.service');
const { registerSchema, loginSchema, refreshSchema, logoutSchema } = require('./auth.validator');

const register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message, message: 'Validation failed' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'idProof file is required', message: 'Validation failed' });
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Only jpg/png/pdf are allowed for idProof', message: 'Validation failed' });
    }
    
    // Limits handled by multer, but just in case
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File size exceeds 5MB limit', message: 'Validation failed' });
    }

    const data = await authService.registerUser(value, req.file);

    res.status(201).json({
      success: true,
      message: 'Registration submitted. Wait for admin approval.',
      data
    });
  } catch (err) {
    require('../../config/logger').error("REGISTRATION ERROR: " + (err.stack || err.message));
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: `Duplicate Key Error: ${err.message}`,
        message: 'Registration failed'
      });
    }
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Internal server error',
      message: 'Registration failed'
    });
  }
};

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message, message: 'Validation failed' });
    }

    const data = await authService.loginUser(value);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Login failed'
    });
  }
};

const refresh = async (req, res) => {
  try {
    const { error, value } = refreshSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message, message: 'Validation failed' });
    }

    const data = await authService.refreshTokenService(value.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Refresh successful',
      data
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Refresh failed'
    });
  }
};

const logout = async (req, res) => {
  try {
    const { error, value } = logoutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message, message: 'Validation failed' });
    }

    await authService.logoutService(value.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Logout failed'
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token, role } = req.body;
    if (!token || !role) {
      return res.status(400).json({ success: false, message: 'Google token and role are required' });
    }

    const data = await authService.googleLoginService({ token, role });

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      data
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Google login failed'
    });
  }
};

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const emailUtils = require('../../utils/email.utils');

// Forgot password – send reset link via email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const user = await require('../../models/User.model').findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    // Use a fallback secret in development if RESET_TOKEN_SECRET is not set
const secret = process.env.RESET_TOKEN_SECRET || 'dev_reset_secret_key';
const token = jwt.sign({ id: user._id, email: user.email }, secret, { expiresIn: process.env.RESET_TOKEN_EXPIRY || '1h' });
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    await emailUtils.sendMail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p>Hello ${user.name},</p><p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`
    });
    return res.status(200).json({ success: true, message: 'Password reset email sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
};

// Reset password – verify token and update password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and newPassword are required' });
    }
    const payload = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
    const user = await require('../../models/User.model').findById(payload.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    user.passwordHash = hash;
    await user.save();
    return res.status(200).json({ success: true, message: 'Password has been reset' });
  } catch (err) {
    console.error('Reset password error:', err);
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  googleLogin,
  forgotPassword,
  resetPassword
};

