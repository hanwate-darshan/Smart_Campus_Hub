const { Queue, Worker } = require("bullmq");
const ChatRoom = require("../models/ChatRoom.model");
const Listing = require("../models/Listing.model");
const pushNotification = require("../utils/pushNotification");
const logger = require("../config/logger");
const { getIo } = require("../config/socket");

const createBullConnection = require("../config/bullConnection");

const DEAL_REMINDER_QUEUE_NAME = "deal-reminder-check";

const dealReminderQueue = new Queue(DEAL_REMINDER_QUEUE_NAME, { connection: createBullConnection() });

const dealReminderWorker = new Worker(
  DEAL_REMINDER_QUEUE_NAME,
  async (job) => {
    logger.info(`[JOB] Starting deal completion reminder check: ${job.id}`);
    
    // 24 hours ago
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rooms = await ChatRoom.find({
      type: "marketplace",
      dealStatus: "none",
      isLocked: false,
      lastMessageAt: { $ne: null, $lt: cutoff },
      reminderSentAt: null
    }).populate("listingId");

    let notificationsSent = 0;

    for (const room of rooms) {
      if (!room.listingId || room.listingId.status !== "approved") {
        continue;
      }

      const sellerId = room.listingId.sellerId.toString();
      const buyerId = room.participants.find(p => p.toString() !== sellerId)?.toString();

      if (!buyerId) continue;

      pushNotification(sellerId, {
        type: "deal_check_in",
        title: "Did you complete this deal?",
        message: 'If you met and sold "' + room.listingId.title + '", please mark it as sold.',
        link: "/student/marketplace/chat/" + room._id
      });

      pushNotification(buyerId, {
        type: "deal_check_in",
        title: "Did you complete this deal?",
        message: 'If you bought "' + room.listingId.title + '", let the seller know to confirm.',
        link: "/student/marketplace/chat/" + room._id
      });

      // Update room
      room.reminderSentAt = new Date();
      await room.save();
      notificationsSent += 2;

      // Emit socket event
      try {
        const io = getIo();
        io.to(`room:${room._id}`).emit("deal_reminder", {
          roomId: room._id,
          message: "Did you complete this deal? If sold, the seller should mark it."
        });
      } catch (err) {
        logger.error(`[JOB] Failed to emit socket event for room ${room._id}:`, err);
      }
    }

    logger.info(`[JOB] Deal reminder check completed. Sent ${notificationsSent} notifications.`);
    return notificationsSent;
  }, { connection: createBullConnection() });

// Schedule the recurring job (every 4 hours as requested)
const initDealReminderJob = async () => {
  try {
    const repeatableJobs = await dealReminderQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await dealReminderQueue.removeRepeatableByKey(job.key);
    }

    await dealReminderQueue.add(
      "check-deal-reminder",
      {},
      {
        repeat: {
          pattern: "0 */4 * * *", // Every 4 hours
        },
      }
    );
    logger.info("[JOB] Marketplace Deal Reminder job scheduled (Every 4 hours).");
  } catch (err) {
    logger.error("[JOB] Failed to schedule deal reminder job: ", err);
  }
};

module.exports = {
  initDealReminderJob,
  dealReminderQueue
};
