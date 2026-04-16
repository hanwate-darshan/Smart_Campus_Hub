const adminService = require('./admin.service');
const { createUserSchema, rejectUserSchema, listUsersSchema } = require('./admin.validator');

const getPendingUsers = async (req, res) => {
  try {
    const { users, count } = await adminService.getPendingUsers();
    res.status(200).json({ success: true, data: users, count });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Failed to fetch pending users',
    });
  }
};

const approveUser = async (req, res) => {
  try {
    await adminService.approveUser(req.params.id);
    res.status(200).json({ success: true, message: 'Student approved successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Failed to approve user',
    });
  }
};

const rejectUser = async (req, res) => {
  try {
    const { error, value } = rejectUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message, message: 'Validation failed' });
    }

    await adminService.rejectUser(req.params.id, value.reason);
    res.status(200).json({ success: true, message: 'Student rejected' });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Failed to reject user',
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message, message: 'Validation failed' });
    }

    const user = await adminService.createUser(value);
    res.status(201).json({ success: true, data: user, message: 'User created successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Failed to create user',
    });
  }
};

const listUsers = async (req, res) => {
  try {
    const { error, value } = listUsersSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message, message: 'Validation failed' });
    }

    const result = await adminService.listUsers(value);
    res.status(200).json({ success: true, data: result.users, total: result.total, page: result.page, totalPages: result.totalPages });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Failed to list users',
    });
  }
};

const suspendUser = async (req, res) => {
  try {
    await adminService.suspendUser(req.params.id);
    res.status(200).json({ success: true, message: 'User suspended successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Failed to suspend user',
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Failed to fetch dashboard stats',
    });
  }
};

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
  createUser,
  listUsers,
  suspendUser,
  getDashboardStats,
};
