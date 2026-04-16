const User = require("../../models/User.model");

exports.updateDutyStatus = async (req, res, next) => {
  try {
    const { dutyStatus } = req.body;
    if (!["available", "busy", "offline"].includes(dutyStatus)) {
      return res.status(400).json({ success: false, error: "Invalid duty status" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { dutyStatus },
      { new: true }
    ).select("dutyStatus");

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
