const { Queue, Worker } = require("bullmq");
const ChatRoom = require("../models/ChatRoom.model");
const Message = require("../models/Message.model");
const pushNotification = require("../utils/pushNotification");
const logger = require("../config/logger");

const createBullConnection = require("../config/bullConnection");

const NO_RESPONSE_QUEUE_NAME = "chat-no-response-check";

const noResponseQueue = new Queue(NO_RESPONSE_QUEUE_NAME, { connection: createBullConnection() });

const noResponseWorker = new Worker(
  NO_RESPONSE_QUEUE_NAME,
  async (job) => {
    logger.info(`[JOB] Starting chat no-response check: ${job.id}`);
    
    // 48 hours ago
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Step 1: Find applicable rooms
    const rooms = await ChatRoom.find({
      type: "marketplace",
      isLocked: false,
      lastMessageAt: { $ne: null, $lt: fortyEightHoursAgo },
      noResponseNotifiedAt: null
    });

    let notificationsSent = 0;

    // Step 2 & 3 & 4: Process each room
    for (const room of rooms) {
      // Find the last message
      const lastMessage = await Message.findOne({ roomId: room._id })
        .sort({ createdAt: -1 });

      if (lastMessage) {
        const senderId = lastMessage.senderId;
        
        // Notify the waiting sender
        pushNotification(senderId, {
          type: "no_response",
          title: "No Response Yet",
          message: "The seller/buyer hasn't responded in 48 hours. You may want to try another listing.",
          link: "/student/marketplace"
        });

        // Update room
        room.noResponseNotifiedAt = new Date();
        await room.save();
        notificationsSent++;
      }
    }

    logger.info(`[JOB] Chat no-response check completed. Sent ${notificationsSent} notifications.`);
    return notificationsSent;
  }, { connection: createBullConnection() });

// Schedule the recurring job (every 6 hours)
const initNoResponseJob = async () => {
  try {
    // Remove existing repeatable jobs to avoid duplicates
    const repeatableJobs = await noResponseQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await noResponseQueue.removeRepeatableByKey(job.key);
    }

    await noResponseQueue.add(
      "check-no-response",
      {},
      {
        repeat: {
          pattern: "0 */6 * * *", // Every 6 hours
        },
      }
    );
    logger.info("[JOB] Chat No-Response Auto-Check job scheduled (Every 6 hours).");
  } catch (err) {
    logger.error("[JOB] Failed to schedule chat no-response job: ", err);
  }
};

module.exports = {
  initNoResponseJob,
  noResponseQueue
};
