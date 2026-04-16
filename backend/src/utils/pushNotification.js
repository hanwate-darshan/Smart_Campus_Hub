const Notification = require("../models/Notification.model");
const { getIO } = require("../config/socket");

/**
 * Centrally handle notification persistence and real-time delivery
 * @param {String} userId - ID of the recipient
 * @param {Object} payload - { type, title, message, link }
 */
const pushNotification = async (userId, payload) => {
  try {
    // 1. Save to Database
    const notification = await Notification.create({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link || null,
    });

    // 2. Emit via Socket.io
    const io = getIO();
    io.of("/notifications").to(`user:${userId}`).emit("notification_push", {
      notificationId: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (err) {
    console.error(`[PushNotification Error] for user ${userId}:`, err.message);
    // We don't throw here to avoid crashing the main transaction
    return null;
  }
};

module.exports = pushNotification;
