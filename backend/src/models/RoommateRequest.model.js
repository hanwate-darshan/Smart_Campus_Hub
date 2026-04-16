const mongoose = require("mongoose");

const roommateRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    chatRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
    },
  },
  {
    timestamps: true,
  }
);

// Unique index to prevent multiple requests between same two users
roommateRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

const RoommateRequest = mongoose.model("RoommateRequest", roommateRequestSchema);

module.exports = RoommateRequest;
