const User = require('../../models/User.model');
const ActivityLog = require('../../models/ActivityLog.model');
const bcrypt = require('bcrypt');
const { redisClient } = require('../../config/redis');
const { getIO } = require('../../config/socket');
const { sendEmail } = require('../../utils/email');

const getPendingUsers = async () => {
  const users = await User.find({ role: 'student', status: 'pending' })
    .select('name email phone idProofUrl createdAt')
    .sort({ createdAt: 1 });

  return { users, count: users.length };
};

const approveUser = async (userId) => {
  const user = await User.findOne({ _id: userId, role: 'student', status: 'pending' });
  if (!user) {
    const error = new Error('Pending student not found');
    error.statusCode = 404;
    throw error;
  }

  user.status = 'approved';
  await user.save();

  await ActivityLog.create({
    type: 'account_approved',
    message: `Approved student account for ${user.name}`,
    userId: user._id,
  });

  // Socket.io notification
  try {
    const io = getIO();
    io.of('/notifications').to(`user:${userId}`).emit('notification_push', {
      type: 'account_approved',
      title: 'Account Approved!',
      message: 'Your Smart Campus Hub account has been approved. You can now login.',
      link: '/',
    });
    
    // Notify admins of activity
    io.of('/notifications').to('admin').emit('new_activity');
  } catch (err) {
    console.error('Socket emit failed:', err.message);
  }

  // Send approval email
  await sendEmail({
    to: user.email,
    subject: 'Your Smart Campus Hub account is approved',
    html: `<p>Hello ${user.name},</p><p>Your account has been approved. You can now login at Smart Campus Hub.</p>`,
  });

  return user;
};

const rejectUser = async (userId, reason) => {
  const user = await User.findOne({ _id: userId, role: 'student', status: 'pending' });
  if (!user) {
    const error = new Error('Pending student not found');
    error.statusCode = 404;
    throw error;
  }

  user.status = 'rejected';
  await user.save();

  const rejectMessage = reason || 'Your registration was not approved. Contact administration.';

  await ActivityLog.create({
    type: 'account_rejected',
    message: `Rejected student registration for ${user.name}`,
    userId: user._id,
  });

  // Socket.io notification
  try {
    const io = getIO();
    io.of('/notifications').to(`user:${userId}`).emit('notification_push', {
      type: 'account_rejected',
      title: 'Registration Not Approved',
      message: rejectMessage,
    });
    
    // Notify admins of activity
    io.of('/notifications').to('admin').emit('new_activity');
  } catch (err) {
    console.error('Socket emit failed:', err.message);
  }

  // Send rejection email
  await sendEmail({
    to: user.email,
    subject: 'Smart Campus Hub - Registration Update',
    html: `<p>Hello ${user.name},</p><p>${rejectMessage}</p>`,
  });

  return user;
};

const createUser = async (userData) => {
  if (userData.role === 'student' || userData.role === 'admin') {
    const error = new Error('Cannot create student or admin accounts via this route');
    error.statusCode = 400;
    throw error;
  }

  const existing = await User.findOne({ email: userData.email });
  if (existing) {
    const error = new Error('Email already in use');
    error.statusCode = 409;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(userData.password, salt);

  const user = new User({
    name: userData.name,
    email: userData.email,
    passwordHash,
    phone: userData.phone || undefined,
    role: userData.role,
    status: 'approved',
    createdByAdmin: true,
  });

  await user.save();

  await ActivityLog.create({
    type: 'user_created',
    message: `Admin created a new ${user.role} account for ${user.name}`,
    userId: user._id,
  });

  try {
    const io = getIO();
    io.of('/notifications').to('admin').emit('new_activity');
  } catch (err) {
    console.error('Socket emit failed:', err.message);
  }

  return user; // toJSON() automatically strips passwordHash
};

const listUsers = async ({ role, status, page, limit }) => {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

const suspendUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  user.status = 'suspended';
  await user.save();

  await ActivityLog.create({
    type: 'account_suspended',
    message: `Suspended account for ${user.name}`,
    userId: user._id,
  });

  // Delete refresh token from Redis
  try {
    await redisClient.del(`refresh:${userId}`);
  } catch (err) {
    console.error('Redis DEL failed:', err.message);
  }

  // Socket.io notification
  try {
    const io = getIO();
    io.of('/notifications').to(`user:${userId}`).emit('notification_push', {
      type: 'account_suspended',
      title: 'Account Suspended',
      message: 'Your account has been suspended. Contact administration.',
    });
    
    // Notify admins of activity
    io.of('/notifications').to('admin').emit('new_activity');
  } catch (err) {
    console.error('Socket emit failed:', err.message);
  }

  return user;
};

const unblockUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  user.status = 'approved';
  await user.save();

  await ActivityLog.create({
    type: 'account_unblocked',
    message: `Unblocked account for ${user.name}`,
    userId: user._id,
  });

  // Socket.io notification
  try {
    const io = getIO();
    io.of('/notifications').to(`user:${userId}`).emit('notification_push', {
      type: 'account_unblocked',
      title: 'Account Reactivated',
      message: 'Your account has been reactivated.',
    });
    
    // Notify admins of activity
    io.of('/notifications').to('admin').emit('new_activity');
  } catch (err) {
    console.error('Socket emit failed:', err.message);
  }

  return user;
};

const deleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  await User.findByIdAndDelete(userId);

  await ActivityLog.create({
    type: 'account_deleted',
    message: `Deleted account for ${user.name}`,
    // user._id is deleted, but we can still store the id string or leave it
  });

  // Socket.io notification
  try {
    const io = getIO();
    io.of('/notifications').to('admin').emit('new_activity');
  } catch (err) {
    console.error('Socket emit failed:', err.message);
  }

  return true;
};

const getDashboardStats = async () => {
  const [
    totalStudents,
    pendingApprovals,
    totalTeachers,
    totalSecurity,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments({ role: 'student', status: 'approved' }),
    User.countDocuments({ role: 'student', status: 'pending' }),
    User.countDocuments({ role: 'teacher' }),
    User.countDocuments({ role: 'security' }),
    ActivityLog.find().sort({ createdAt: -1 }).limit(10),
  ]);

  return {
    totalStudents,
    pendingApprovals,
    totalTeachers,
    totalSecurity,
    activeComplaints: 0, // Mocked pending implementation
    activeSOS: 0, // Mocked pending implementation
    recentActivity,
  };
};

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
  createUser,
  listUsers,
  suspendUser,
  unblockUser,
  deleteUser,
  getDashboardStats,
};
