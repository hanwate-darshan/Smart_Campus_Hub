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

    // ── Check 1: Daily Limit (Temporarily disabled for testing) ──
    // const startOfDay = new Date();
    // startOfDay.setHours(0, 0, 0, 0);
    // const sosCount = await SOS.countDocuments({ studentId, createdAt: { $gte: startOfDay } });
    // if (sosCount >= 10) {
    //   return res.status(429).json({ success: false, error: "SOS limit reached for today (Max 10/day)." });
    // }

    // ── Check 2: Already Active SOS ──
    const existingActive = await SOS.findOne({
      studentId,
      status: { $in: ["active", "assigned", "reached"] }
    }).populate("assignedSecurityId", "name phone");

    if (existingActive) {
      // Auto-cancel if it's older than 2 hours (Stale SOS bug fix)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      if (existingActive.createdAt < twoHoursAgo) {
        existingActive.status = "cancelled";
        existingActive.cancelledAt = new Date();
        await existingActive.save();
        console.log(`[SOS] Auto-cancelled stale SOS: ${existingActive._id}`);
      } else {
        return res.status(409).json({
          success: false,
          error: "You already have an active SOS. Please cancel it before triggering a new one.",
          data: { 
            sosId: existingActive._id, 
            status: existingActive.status,
            assignedGuard: existingActive.assignedSecurityId
              ? { name: existingActive.assignedSecurityId.name, phone: existingActive.assignedSecurityId.phone }
              : null,
            createdAt: existingActive.createdAt
          }
        });
      }
    }

    // ── Check 3: Campus Boundary (Geofence) ──
    const campusPolygonStr = process.env.CAMPUS_POLYGON_COORDS;
    if (campusPolygonStr) {
      const campusPolygon = parsePolygon(campusPolygonStr);
      if (campusPolygon.length > 0) {
        const isInsideCampus = isPointInPolygon([longitude, latitude], campusPolygon);
        if (!isInsideCampus) {
          // Bypassing boundary check for testing purposes
          console.warn("[SOS] Warning: SOS triggered from outside campus boundaries.");
        }
      }
    }

    // ── Create SOS Document ──
    const sos = await SOS.create({
      studentId,
      location: { type: "Point", coordinates: [longitude, latitude] },
      status: "active",
    });

    // ── Step 7: Find Nearest Available Security Guard ──
    let nearestGuard = null;
    try {
      nearestGuard = await User.findOne({
        role: "security",
        dutyStatus: { $in: ["available", "busy"] },
        "lastLocation.coordinates": { $exists: true, $ne: [] },
        "lastLocation.type": "Point",
      }).near("lastLocation", {
        center: { type: "Point", coordinates: [longitude, latitude] },
        maxDistance: 5000, // 5km radius
        spherical: true,
      });
    } catch (geoErr) {
      // Fallback: if geospatial query fails (e.g. no guard has location set),
      // we still continue — all guards will be notified below
      console.warn("[SOS] Nearest guard query failed, falling back to broadcast:", geoErr.message);
    }

    // We no longer auto-assign the SOS to the nearest guard in the DB.
    // The nearest guard will be notified as priority, but they (or any other guard) MUST explicitly accept it.
    // This fixes the "Failed to accept SOS. It might be already assigned." error for all guards.
    
    // ── Step 8: Real-time Broadcast ──
    const alertPayload = {
      sosId: sos._id,
      studentName: req.user.name,
      studentPhone: req.user.phone || "N/A",
      location: sos.location,
      timestamp: sos.createdAt,
      assignedGuardId: nearestGuard?._id || null,
    };

    // Broadcast to ALL guards in security pool (so any available guard can respond)
    getIO().of("/sos").to("security:pool").emit("sos_alert", alertPayload);

    // Also send a targeted "assigned to you" event to the nearest guard specifically
    if (nearestGuard) {
      getIO().of("/sos").to(`user:${nearestGuard._id}`).emit("sos_assigned_to_you", {
        ...alertPayload,
        message: `You are the nearest guard. Please respond immediately.`,
      });

      // Notify the nearest guard via persistent notification too
      pushNotification(nearestGuard._id, {
        type: "sos_alert",
        title: "🚨 URGENT: SOS — You are nearest!",
        message: `${req.user.name} needs help! You are the closest guard. Move immediately.`,
        link: "/security/dashboard"
      });
    } else {
      // No guard with known location — notify all guards via DB notification
      const guards = await User.find({ role: "security" }).select("_id");
      guards.forEach(guard => {
        pushNotification(guard._id, {
          type: "sos_alert",
          title: "🚨 URGENT: SOS ALERT",
          message: `${req.user.name} needs help! Location tracked.`,
          link: "/security/dashboard"
        });
      });
    }

    res.status(201).json({
      success: true,
      data: {
        sosId: sos._id,
        status: sos.status,
        assignedGuard: nearestGuard
          ? { name: nearestGuard.name, phone: nearestGuard.phone || "N/A" }
          : null,
      }
    });
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

    const cancelPayload = { sosId: sos._id, status: "cancelled" };

    // Notify the specific SOS room (student + assigned security)
    getIO().of("/sos").to(`sos:${sos._id}`).emit("sos_status_update", {
      ...cancelPayload,
      message: "SOS has been cancelled by the student."
    });

    // Bug #2 Fix: Also emit "sos_cancelled" so security dashboard listener fires correctly
    getIO().of("/sos").to("security:pool").emit("sos_cancelled", cancelPayload);

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
    if (sos.status !== "active") {
      // If it's already assigned to THIS guard (auto-assign algorithm), just acknowledge it
      if (sos.status === "assigned" && sos.assignedSecurityId?.toString() === req.user._id.toString()) {
        // Proceed to acknowledge
      } else {
        return res.status(400).json({ success: false, error: "SOS already assigned or resolved" });
      }
    }

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

    // Real-time update for the specific SOS room (student + accepting guard)
    getIO().of("/sos").to(`sos:${sos._id}`).emit("sos_status_update", {
      sosId: sos._id,
      status: "assigned",
      securityName: req.user.name,
      securityPhone: req.user.phone,
      securityId: req.user._id
    });

    // "Already handled" — dismiss alert for ALL other guards in security pool
    getIO().of("/sos").to("security:pool").emit("sos_accepted", {
      sosId: sos._id,
      acceptedBy: req.user.name,
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
    const { status } = req.body; // 'reached', 'resolved', or 'fake'
    const sos = await SOS.findOne({ _id: req.params.id, assignedSecurityId: req.user._id });

    if (!sos) return res.status(404).json({ success: false, error: "SOS assignment not found." });

    sos.status = status;
    if (status === "reached") sos.reachedAt = new Date();
    if (status === "resolved") sos.resolvedAt = new Date();
    
    if (status === "fake") {
      sos.isFake = true;
      sos.resolvedAt = new Date();
    }
    await sos.save();

    let pushTitle = "";
    let pushMessage = "";

    if (status === "fake") {
      // Find the student and increment fakeSosCount
      const student = await User.findById(sos.studentId);
      if (student) {
        student.fakeSosCount = (student.fakeSosCount || 0) + 1;
        if (student.fakeSosCount >= 3) {
          student.status = "suspended";
          pushTitle = "Account Suspended 🚫";
          pushMessage = "You have reached the maximum number of fake SOS alerts. Your account has been suspended.";
        } else {
          pushTitle = "Fake SOS Warning ⚠️";
          pushMessage = `Your SOS was marked as fake. Misuse leads to suspension. (Strike ${student.fakeSosCount}/3)`;
        }
        await student.save();
      }
    } else {
      pushTitle = status === "reached" ? "Security Reached! 📍" : "Emergency Resolved ✅";
      pushMessage = status === "reached" 
        ? "Security has arrived at your location." 
        : "The situation has been marked as resolved.";
    }

    // Notify Student
    pushNotification(sos.studentId, {
      type: "sos_update",
      title: pushTitle,
      message: pushMessage,
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
      .populate("assignedSecurityId", "name phone")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get All SOS History (Analytics)
 * @route GET /api/sos/all
 * @access Private (Admin)
 */
exports.getAllSOS = async (req, res, next) => {
  try {
    const allSOS = await SOS.find()
      .populate("studentId", "name phone email")
      .populate("assignedSecurityId", "name phone")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: allSOS });
  } catch (err) {
    next(err);
  }
};
