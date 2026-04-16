const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      // examples: "sos_update", "complaint_update", "listing_approved", 
      // "roommate_request", "account_approved", "new_message", etc.
    },
    title: {
      type: String,
      required: true,
      maxlength: 80,
    },
    message: {
      type: String,
      required: true,
      maxlength: 200,
    },
    link: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookups
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
