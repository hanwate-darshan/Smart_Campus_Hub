const express = require('express');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const {
  getPendingUsers,
  approveUser,
  rejectUser,
  createUser,
  listUsers,
  suspendUser,
  unblockUser,
  deleteUser,
  getDashboardStats,
} = require('./admin.controller');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/dashboard-stats', getDashboardStats);
router.get('/pending-users', getPendingUsers);
router.patch('/users/:id/approve', approveUser);
router.patch('/users/:id/reject', rejectUser);
router.post('/create-user', createUser);
router.get('/users', listUsers);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/unblock', unblockUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
