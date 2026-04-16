const express = require("express");
const { 
  getNotifications, 
  markAllRead, 
  markAsRead, 
  getUnreadCount 
} = require("./notification.controller");
const { authenticate } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/mark-all-read", markAllRead);
router.patch("/:id/read", markAsRead);

module.exports = router;
