const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
    },
    phone: {
      type: String,
    },
    role: {
      type: String,
      enum: {
        values: ["student", "teacher", "admin", "security"],
        message: "{VALUE} is not a valid role",
      },
      default: "student",
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected", "suspended"],
        message: "{VALUE} is not a valid status",
      },
      default: "pending",
    },
    dutyStatus: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
      required: function() { return this.role === "security"; }
    },
    idProofUrl: {
      type: String,
    },
    profilePicUrl: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: [200, "Bio cannot exceed 200 characters"],
    },
    department: {
      type: String,
    },
    year: {
      type: String,
      enum: {
        values: ["1st", "2nd", "3rd", "4th"],
        message: "{VALUE} is not a valid year",
      },
    },
    fcmToken: {
      type: String,
    },
    lastLocation: {
      type: {
        type: String,
      },
      coordinates: {
        type: [Number],
      },
    },
    createdByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// 2dsphere index for geospatial queries on lastLocation
userSchema.index({ lastLocation: "2dsphere" });

// Unique index on email (also declared via unique: true above, explicit for clarity)
userSchema.index({ email: 1 }, { unique: true });

// Automatically strip passwordHash from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  return userObject;
};

module.exports = mongoose.model("User", userSchema);
