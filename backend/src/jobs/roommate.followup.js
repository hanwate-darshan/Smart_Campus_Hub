const { Queue, Worker } = require("bullmq");
const ChatRoom = require("../models/ChatRoom.model");
const Message = require("../models/Message.model");
const pushNotification = require("../utils/pushNotification");
const logger = require("../config/logger");
const { getIo } = require("../config/socket");

const REDIS_OPTIONS = {
  connection: {
    url: process.env.REDIS_URL
  }
};

const ROOMMATE_FOLLOWUP_QUEUE_NAME = "roommate-followup-queue";

const roommateFollowupQueue = new Queue(ROOMMATE_FOLLOWUP_QUEUE_NAME, REDIS_OPTIONS);

const roommateFollowupWorker = new Worker(
  ROOMMATE_FOLLOWUP_QUEUE_NAME,
  async (job) => {
    const { chatRoomId } = job.data;
    logger.info(`[JOB] Starting roommate followup for chat: ${chatRoomId}`);
    
    const room = await ChatRoom.findById(chatRoomId);
    if (!room) {
      logger.error(`[JOB] ChatRoom ${chatRoomId} not found`);
      return;
    }

    if (room.isLocked) {
      logger.info(`[JOB] ChatRoom ${chatRoomId} is already locked, skipping.`);
      return;
    }

    room.dealReminderNotifiedAt = new Date();
    await room.save();

    const systemMessage = await Message.create({
      chatRoomId,
      senderId: null, // System message
      content: "Automated Follow-up: It has been 48 hours. Have you finalized your roommate? If yes, please use the button above to secure and close this chat."
    });

    for (const participant of room.participants) {
      pushNotification(participant, {
        type: "roommate_followup",
        title: "Have you finalized the room?",
        message: "It's been 48 hours. Open chat to confirm and close.",
        link: "/student/marketplace/chat/" + room._id
      });
    }

    try {
      const io = getIo();
      io.to(`room:${room._id}`).emit("message_new", systemMessage);
      io.to(`room:${room._id}`).emit("roommate_followup_ready", {
        roomId: room._id
      });
    } catch (err) {
      logger.error(`[JOB] Failed to emit socket event for room ${room._id}:`, err);
    }

    logger.info(`[JOB] Roommate followup check completed for chat: ${chatRoomId}`);
    return;
  },
  REDIS_OPTIONS
);

module.exports = {
  roommateFollowupQueue
};
