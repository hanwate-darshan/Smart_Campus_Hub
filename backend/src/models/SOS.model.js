const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
      },
    },
    status: {
      type: String,
      enum: ["active", "assigned", "reached", "resolved", "cancelled", "fake"],
      default: "active",
    },
    assignedSecurityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: {
      type: Date,
    },
    reachedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    locationHistory: [
      {
        coordinates: {
          type: [Number],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isFake: {
      type: Boolean,
      default: false,
    },
    fakeCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
sosSchema.index({ location: "2dsphere" });
sosSchema.index({ status: 1, createdAt: -1 });
sosSchema.index({ studentId: 1 });

const SOS = mongoose.model("SOS", sosSchema);

module.exports = SOS;
