const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "maintenance",
          "hostel",
          "food",
          "wifi",
          "academic",
          "ragging",
          "other",
        ],
        message: "{VALUE} is not a valid category",
      },
    },
    imageUrl: {
      type: String,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: ["submitted", "in_review", "in_progress", "resolved", "closed"],
        message: "{VALUE} is not a valid status",
      },
      default: "submitted",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    escalatedAt: {
      type: Date,
      default: null,
    },
    comments: [
      {
        authorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        authorRole: {
          type: String,
          required: true,
        },
        authorName: {
          type: String,
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ studentId: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ category: 1, createdAt: -1 });

const Complaint = mongoose.model("Complaint", complaintSchema);

module.exports = Complaint;
