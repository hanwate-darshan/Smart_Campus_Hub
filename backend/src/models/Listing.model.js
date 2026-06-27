const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    images: {
      type: [String],
      required: [true, "At least one image is required"],
      validate: {
        validator: function (v) {
          return v && v.length >= 1 && v.length <= 3;
        },
        message: "Listing must have between 1 and 3 images",
      },
    },
    category: {
      type: String,
      required: true,
      enum: {
        values: ["books", "electronics", "stationery", "hostel_items", "cycles", "clothing", "other"],
        message: "{VALUE} is not a valid category",
      },
    },
    condition: {
      type: String,
      required: false,
      enum: ["new", "like_new", "used", "heavily_used"]
    },
    status: {
      type: String,
      enum: ["pending", "approved", "sold", "expired", "rejected"],
      default: "pending",
    },
    soldConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    reportedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: []
    }],
    interestedCount: {
      type: Number,
      default: 0
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
listingSchema.index({ status: 1, expiresAt: 1 });
listingSchema.index({ sellerId: 1 });
listingSchema.index({ status: 1, createdAt: -1 });

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;
