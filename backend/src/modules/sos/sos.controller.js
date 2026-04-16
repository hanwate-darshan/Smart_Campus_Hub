const SOS = require("../../models/SOS.model");
const User = require("../../models/User.model");
const pushNotification = require("../../utils/pushNotification");
const { getIO } = require("../../config/socket");
const { isPointInPolygon, parsePolygon } = require("../../utils/geofence");

/**
 * @desc Trigger SOS Alert
 * @route POST /api/sos/trigger
 * @access Private (Student)
 */
exports.triggerSOS = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const studentId = req.user._id;

    // Daily Limit Check
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sosCount = await SOS.countDocuments({ studentId, createdAt: { $gte: startOfDay } });
    if (sosCount >= 3) {
      return res.status(429).json({ success: false, error: "SOS limit reached for today (Max 3/day)." });
    }

    const sos = await SOS.create({
      studentId,
      location: { type: "Point", coordinates: [longitude, latitude] },
      status: "active",
    });

    // Notify ALL Security Guards via real-time and DB notification
    const guards = await User.find({ role: "security" }).select("_id");
    guards.forEach(guard => {
      pushNotification(guard._id, {
        type: "sos_alert",
        title: "🚨 URGENT: SOS ALERT",
        message: `${req.user.name} needs help! Location tracked.`,
        link: "/security/dashboard"
      });
    });

    // Broadcast to SOS namespace for live map updates (Security Pool)
    getIO().of("/sos").to("security:pool").emit("sos_alert", {
      sosId: sos._id,
      studentName: req.user.name,
      studentPhone: req.user.phone || "N/A",
      location: sos.location,
      timestamp: sos.createdAt
    });

    res.status(201).json({ success: true, data: { sosId: sos._id, status: sos.status } });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Cancel SOS Alert
 * @route POST /api/sos/:id/cancel
 * @access Private (Student)
 */
exports.cancelSOS = async (req, res, next) => {
  try {
    const sos = await SOS.findOne({ _id: req.params.id, studentId: req.user._id });

    if (!sos) return res.status(404).json({ success: false, error: "SOS not found" });
    if (sos.status !== "active" && sos.status !== "assigned") {
      return res.status(400).json({ success: false, error: "Cannot cancel SOS in current status." });
    }

    sos.status = "cancelled";
    sos.cancelledAt = new Date();
    await sos.save();

    // Notify connected clients in SOS room
    getIO().of("/sos").to(`sos:${sos._id}`).emit("sos_status_update", {
      sosId: sos._id,
      status: "cancelled",
      message: "SOS has been cancelled by the student."
    });

    res.json({ success: true, message: "SOS cancelled successfully." });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Accept SOS (Respond to alert)
 * @route PATCH /api/sos/:id/accept
 * @access Private (Security)
 */
exports.acceptSOS = async (req, res, next) => {
  try {
    const sos = await SOS.findById(req.params.id);
    if (!sos) return res.status(404).json({ success: false, error: "SOS alert not found" });
    if (sos.status !== "active") return res.status(400).json({ success: false, error: "SOS already assigned or resolved" });

    sos.assignedSecurityId = req.user._id;
    sos.status = "assigned";
    sos.assignedAt = new Date();
    await sos.save();

    // Notify Student
    pushNotification(sos.studentId, {
      type: "sos_update",
      title: "Help is on the way! 🚨",
      message: `${req.user.name} (Security) has accepted your SOS and is moving to your location.`,
      link: "/student/sos"
    });

    // Real-time update for the specific SOS room
    getIO().of("/sos").to(`sos:${sos._id}`).emit("sos_status_update", {
      sosId: sos._id,
      status: "assigned",
      securityName: req.user.name,
      securityId: req.user._id
    });

    res.json({ success: true, message: "SOS accepted. Move to location immediately." });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Update SOS Status (Reached/Resolved)
 * @route PATCH /api/sos/:id/status
 * @access Private (Security)
 */
exports.updateSOSStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // 'reached' or 'resolved'
    const sos = await SOS.findOne({ _id: req.params.id, assignedSecurityId: req.user._id });

    if (!sos) return res.status(404).json({ success: false, error: "SOS assignment not found." });

    sos.status = status;
    if (status === "reached") sos.reachedAt = new Date();
    if (status === "resolved") sos.resolvedAt = new Date();
    await sos.save();

    // Notify Student
    pushNotification(sos.studentId, {
      type: "sos_update",
      title: status === "reached" ? "Security Reached! 📍" : "Emergency Resolved ✅",
      message: status === "reached" 
        ? "Security has arrived at your location." 
        : "The situation has been marked as resolved.",
      link: "/student/sos"
    });

    // Live update for dashboards
    getIO().of("/sos").to(`sos:${sos._id}`).emit("sos_status_update", {
      sosId: sos._id,
      status
    });

    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get Active SOS Alerts
 * @route GET /api/sos/active
 * @access Private (Security/Admin)
 */
exports.getActiveSOS = async (req, res, next) => {
  try {
    const activeSOS = await SOS.find({ 
      status: { $in: ["active", "assigned", "reached"] } 
    })
    .populate("studentId", "name phone")
    .populate("assignedSecurityId", "name phone")
    .sort({ createdAt: -1 });

    res.json({ success: true, data: activeSOS });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get Student SOS History
 * @route GET /api/sos/my-history
 * @access Private (Student)
 */
exports.getMySOSHistory = async (req, res, next) => {
  try {
    const history = await SOS.find({ studentId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};
