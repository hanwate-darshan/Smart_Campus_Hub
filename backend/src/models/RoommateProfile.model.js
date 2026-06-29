const mongoose = require("mongoose");

const roommateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"],
    },
    budgetRange: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
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
    location: {
      state: { type: String, required: [true, "State is required"], trim: true },
      city: { type: String, required: [true, "City is required"], trim: true },
      area: { type: String, required: [true, "Area is required"], trim: true }
    },

    duration: {
      type: String,
      required: true,
      enum: ["semester", "year", "long_term"],
    },
    bio: {
      type: String,
      maxlength: [200, "Bio cannot exceed 200 characters"],
      trim: true,
    },
    images: [{
      type: String
    }],
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
