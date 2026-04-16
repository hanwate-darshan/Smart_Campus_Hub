const mongoose = require("mongoose");

const roommateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [0, "Budget cannot be negative"],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    year: {
      type: String,
      required: true,
      enum: ["1st", "2nd", "3rd", "4th"],
    },
    smoking: {
      type: Boolean,
      required: [true, "Smoking preference is required"],
    },
    sleepSchedule: {
      type: String,
      required: true,
      enum: ["early", "late"],
    },
    cleanliness: {
      type: String,
      required: true,
      enum: ["low", "medium", "high"],
    },
    hobbies: {
      type: [String],
      validate: {
        validator: function (v) {
          return v && v.length <= 10;
        },
        message: "You can list up to 10 hobbies",
      },
    },
    bio: {
      type: String,
      maxlength: [200, "Bio cannot exceed 200 characters"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const RoommateProfile = mongoose.model("RoommateProfile", roommateProfileSchema);

module.exports = RoommateProfile;
