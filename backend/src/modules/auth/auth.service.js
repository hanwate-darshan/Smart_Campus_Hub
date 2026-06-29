const User = require('../../models/User.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { redisClient } = require('../../config/redis');
const { uploadToCloudinary } = require('../../utils/cloudinary');
const { getIO } = require('../../config/socket');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateTokens = async (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, status: user.status },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  await redisClient.set(`refresh:${user._id}`, refreshToken, {
    EX: 7 * 24 * 60 * 60 // 7 days
  });

  return { accessToken, refreshToken };
};

const registerUser = async (userData, file) => {
  const email = userData.email.trim().toLowerCase();
  
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(userData.password, salt);

  let idProofUrl = '';
  if (file) {
    idProofUrl = await uploadToCloudinary(file.buffer, 'smart-campus/id-proofs');
  }

  const user = new User({
    name: userData.name,
    email: email,
    passwordHash,
    phone: userData.phone,
    role: 'student',
    status: 'pending',
    idProofUrl
  });

  await user.save();

  const ActivityLog = require('../../models/ActivityLog.model');
  await ActivityLog.create({
    type: 'new_registration',
    message: `New registration request from ${user.name}`,
    userId: user._id,
  });

  // Notify all online admins about new pending registration
  try {
    const io = getIO();
    io.of('/notifications').to('admin').emit('notification_push', {
      type: 'new_registration',
      title: 'New Student Registration',
      message: `${user.name} (${user.email}) has submitted a registration request.`,
      link: '/admin/approvals',
    });
    
    io.of('/notifications').to('admin').emit('new_activity');
  } catch (err) {
    console.error('Socket emit to admin failed:', err.message);
  }

  return {
    userId: user._id,
    name: user.name,
    email: user.email,
    status: user.status
  };
};

const loginUser = async ({ email, password, role }) => {
  const user = await User.findOne({ email, role });
  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  if (user.status === 'pending') {
    const error = new Error('Your account is pending admin approval');
    error.statusCode = 403;
    throw error;
  }
  if (user.status === 'rejected') {
    const error = new Error('Your registration was not approved. Contact administration.');
    error.statusCode = 403;
    throw error;
  }
  if (user.status === 'suspended') {
    const error = new Error('Your account has been suspended.');
    error.statusCode = 403;
    throw error;
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  };
};

const googleLoginService = async ({ token, role }) => {
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    const error = new Error('Invalid Google token');
    error.statusCode = 401;
    throw error;
  }

  const payload = ticket.getPayload();
  const email = payload['email'];
  const name = payload['name']; // get name from payload
  const profilePicUrl = payload['picture'];

  let user = await User.findOne({ email, role });
  
  if (!user) {
    if (role === 'student') {
      // Auto-register new student with Google
      user = new User({
        name: name,
        email: email,
        passwordHash: 'google_oauth_no_password',
        role: 'student',
        status: 'pending',
        profilePicUrl: profilePicUrl
      });
      await user.save();

      const ActivityLog = require('../../models/ActivityLog.model');
      await ActivityLog.create({
        type: 'new_registration',
        message: `New Google registration from ${user.name}`,
        userId: user._id,
      });
    } else {
      const error = new Error('No account found for this Google email with the selected role. Please contact admin.');
      error.statusCode = 401;
      throw error;
    }
  }

  // Check user status (same as loginUser)
  if (user.status === 'pending') {
    const error = new Error('Your account is pending admin approval');
    error.statusCode = 403;
    throw error;
  }
  if (user.status === 'rejected') {
    const error = new Error('Your registration was not approved. Contact administration.');
    error.statusCode = 403;
    throw error;
  }
  if (user.status === 'suspended') {
    const error = new Error('Your account has been suspended.');
    error.statusCode = 403;
    throw error;
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  };
};

const refreshTokenService = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const userId = decoded.id;

    const storedToken = await redisClient.get(`refresh:${userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      const error = new Error('Invalid refresh token');
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      throw error;
    }

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role, status: user.status },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    return { accessToken: newAccessToken };
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }
};

const logoutService = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    await redisClient.del(`refresh:${decoded.id}`);
  } catch (err) {
    // If invalid token, ignore and complete logout gracefully
  }
  return true;
};

module.exports = {
  registerUser,
  loginUser,
  refreshTokenService,
  logoutService,
  googleLoginService
};
