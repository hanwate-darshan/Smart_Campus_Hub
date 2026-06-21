const User = require('../../models/User.model');
const { uploadToCloudinary } = require('../../utils/cloudinary');

const getProfile = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

const updateProfile = async (userId, data, file) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Update allowed text fields
  if (data.name !== undefined) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone;
  if (data.bio !== undefined) user.bio = data.bio;
  if (data.department !== undefined) user.department = data.department;

  // Handle image upload
  if (file) {
    user.profilePicUrl = await uploadToCloudinary(file.buffer, 'smart-campus/profile-pics');
  }

  await user.save();
  return user; // toJSON() will strip passwordHash
};

module.exports = {
  getProfile,
  updateProfile,
};
