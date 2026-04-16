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

module.exports = {
  register,
  login,
  refresh,
  logout,
  googleLogin
};
