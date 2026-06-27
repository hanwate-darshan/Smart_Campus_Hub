const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length === 2;
        },
        message: "ChatRoom must have exactly 2 participants",
      },
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      default: null,
    },
    roommateRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoommateRequest",
      default: null,
    },
    type: {
      type: String,
      required: true,
      enum: ["marketplace", "roommate"],
    },
    lastMessage: {
      type: String,
      trim: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    noResponseNotifiedAt: {
      type: Date,
      default: null,
    },
    dealReminderNotifiedAt: {
      type: Date,
      default: null,
    },
    dealStatus: {
      type: String,
      enum: ["none", "pending_confirmation", "confirmed_sold", "deal_failed"],
      default: "none",
    },
    soldClaimedAt: {
      type: Date,
      default: null,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ listingId: 1 });

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

module.exports = ChatRoom;
