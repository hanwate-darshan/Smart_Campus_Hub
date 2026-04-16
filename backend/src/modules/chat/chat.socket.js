const ChatRoom = require("../../models/ChatRoom.model");
const Message = require("../../models/Message.model");
const pushNotification = require("../../utils/pushNotification");

// Simple in-memory rate limiter: { userId_roomId: count }
const rateLimits = new Map();
setInterval(() => rateLimits.clear(), 60000); // Clear every minute

const registerChatHandlers = (chatNs, socket) => {
  const userId = socket.data.user._id.toString();
  const userName = socket.data.user.name;

  // 1. Join Room
  socket.on("join_room", async ({ roomId }) => {
    try {
      const room = await ChatRoom.findOne({ _id: roomId, participants: userId });
      if (!room) {
        return socket.emit("error", "Access denied to this room");
      }
      socket.join(`room:${roomId}`);
      console.log(`[Chat] ${userName} joined room: ${roomId}`);
    } catch (err) {
      socket.emit("error", "Failed to join room");
    }
  });

  // 2. Send Message
  socket.on("message_send", async ({ roomId, content }) => {
    try {
      // Step 1: Membership Check
      const room = await ChatRoom.findById(roomId);
      if (!room || !room.participants.map(p => p.toString()).includes(userId)) {
        return socket.emit("error", "Unauthorized or Room not found");
      }

      // Step 2: Lock Check
      if (room.isLocked) {
        return socket.emit("error", "This chat is no longer available.");
      }

      // Step 3: Validation
      if (!content || content.length > 1000) {
        return socket.emit("error", "Invalid message content");
      }

      // Step 4: Rate Limiting (30 msgs/min per user per room)
      const limitKey = `${userId}_${roomId}`;
      const count = (rateLimits.get(limitKey) || 0) + 1;
      if (count > 30) {
        return socket.emit("error", "Too many messages. Slow down!");
      }
      rateLimits.set(limitKey, count);

      // Step 5: Save to DB
      const message = await Message.create({
        roomId,
        senderId: userId,
        content,
        readBy: [userId]
      });

      // Step 6: Update ChatRoom metadata
      room.lastMessage = content;
      room.lastMessageAt = new Date();
      await room.save();

      // Step 7: Emit to room
      chatNs.to(`room:${roomId}`).emit("message_new", {
        messageId: message._id,
        roomId,
        senderId: userId,
        senderName: userName,
        content,
        createdAt: message.createdAt
      });

      // Step 8: Notify recipient via pushNotification
      const recipientId = room.participants.find(p => p.toString() !== userId);
      pushNotification(recipientId, {
        type: "new_message",
        title: `New Message from ${userName}`,
        message: content.length > 50 ? content.substring(0, 47) + "..." : content,
        link: `/student/marketplace/chat/${roomId}`
      });

    } catch (err) {
      console.error("[Chat Socket] Send error:", err);
      socket.emit("error", "Message delivery failed");
    }
  });

  // 3. Mark as Read
  socket.on("message_read", async ({ roomId }) => {
    try {
      await Message.updateMany(
        { roomId, senderId: { $ne: userId }, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );
      chatNs.to(`room:${roomId}`).emit("messages_read", { roomId, readBy: userId });
    } catch (err) {
      socket.emit("error", "Failed to update read status");
    }
  });

  // 4. Typing Indicators
  socket.on("typing_start", ({ roomId }) => {
    socket.to(`room:${roomId}`).emit("user_typing", { roomId, userId, name: userName });
  });

  socket.on("typing_stop", ({ roomId }) => {
    socket.to(`room:${roomId}`).emit("user_stopped_typing", { roomId, userId });
  });
};

module.exports = registerChatHandlers;
