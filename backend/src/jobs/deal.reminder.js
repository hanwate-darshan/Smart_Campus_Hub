const { Queue, Worker } = require("bullmq");
const ChatRoom = require("../models/ChatRoom.model");
const Listing = require("../models/Listing.model");
const pushNotification = require("../utils/pushNotification");
const logger = require("../config/logger");

const REDIS_OPTIONS = {
  connection: {
    url: process.env.REDIS_URL
  }
};

const DEAL_REMINDER_QUEUE_NAME = "deal-reminder-check";

const dealReminderQueue = new Queue(DEAL_REMINDER_QUEUE_NAME, REDIS_OPTIONS);

const dealReminderWorker = new Worker(
  DEAL_REMINDER_QUEUE_NAME,
  async (job) => {
    logger.info(`[JOB] Starting deal completion reminder check: ${job.id}`);
    
    // 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find rooms that were created more than 24 hours ago and haven't had a deal reminder sent
    const rooms = await ChatRoom.find({
      type: "marketplace",
      isLocked: false,
      createdAt: { $lt: twentyFourHoursAgo },
      dealReminderNotifiedAt: null
    }).populate("listingId");

    let notificationsSent = 0;

    for (const room of rooms) {
      if (!room.listingId || room.listingId.status !== "approved") {
        continue;
      }

      // Notify both participants
      for (const participantId of room.participants) {
        // Is this participant the seller?
        const isSeller = room.listingId.sellerId.toString() === participantId.toString();

        pushNotification(participantId, {
          type: "system_alert",
          title: "Did you complete this deal?",
          message: isSeller 
            ? `If you have sold "${room.listingId.title}", please mark it as sold in the chat.`
            : `Did you buy "${room.listingId.title}"? If so, remind the seller to mark it as sold.`,
          link: `/student/marketplace/chat/${room._id}`
        });
      }

      // Update room
      room.dealReminderNotifiedAt = new Date();
      await room.save();
      notificationsSent += room.participants.length;
    }

    logger.info(`[JOB] Deal reminder check completed. Sent ${notificationsSent} notifications.`);
    return notificationsSent;
  },
  REDIS_OPTIONS
);

// Schedule the recurring job (every 6 hours)
const initDealReminderJob = async () => {
  try {
    // Remove existing repeatable jobs to avoid duplicates
    const repeatableJobs = await dealReminderQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await dealReminderQueue.removeRepeatableByKey(job.key);
    }

    await dealReminderQueue.add(
      "check-deal-reminder",
      {},
      {
        repeat: {
          pattern: "0 */6 * * *", // Every 6 hours
        },
      }
    );
    logger.info("[JOB] Marketplace Deal Reminder job scheduled (Every 6 hours).");
  } catch (err) {
    logger.error("[JOB] Failed to schedule deal reminder job: ", err);
  }
};

module.exports = {
  initDealReminderJob,
  dealReminderQueue
};
