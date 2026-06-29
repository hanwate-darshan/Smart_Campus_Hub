const mongoose = require("mongoose");

const lostItemSchema = new mongoose.Schema(
  {
    foundById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [80, "Title cannot exceed 80 characters"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, "Image is mandatory for lost items"],
    },
    locationFound: {
      type: String,
      required: [true, "Please specify where the item was found"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending_approval", "pending", "in_office", "returned", "rejected", "archived"],
        message: "{VALUE} is not a valid status",
      },
      default: "pending_approval",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
    },
    returnedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    returnedAt: {
      type: Date,
    },
    archivedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
lostItemSchema.index({ status: 1 });
lostItemSchema.index({ createdAt: 1 });

const LostItem = mongoose.model("LostItem", lostItemSchema);

module.exports = LostItem;
