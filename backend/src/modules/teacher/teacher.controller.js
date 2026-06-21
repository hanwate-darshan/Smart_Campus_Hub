const teacherService = require('./teacher.service');
const { updateProfileSchema } = require('./teacher.validator');

const getProfile = async (req, res) => {
  try {
    const profile = await teacherService.getProfile(req.user.id);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Failed to fetch profile',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message, message: 'Validation failed' });
    }

    const updatedUser = await teacherService.updateProfile(req.user.id, value, req.file);
    res.status(200).json({ success: true, data: updatedUser, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      message: 'Failed to update profile',
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
