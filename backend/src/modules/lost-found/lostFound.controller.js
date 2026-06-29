const LostItem = require("../../models/LostItem.model");
const User = require("../../models/User.model");
const { uploadToCloudinary } = require("../../utils/cloudinary");
const pushNotification = require("../../utils/pushNotification");

/**
 * @desc Report a Found Item
 * @route POST /api/lost-found/
 * @access Private (Student)
 */
exports.reportFoundItem = async (req, res, next) => {
  try {
    const { title, description, locationFound } = req.body;
    const foundById = req.user._id;

    if (!req.file) {
      return res.status(400).json({ success: false, error: "Image is mandatory." });
    }

    // Daily Limit: Max 3 items per day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await LostItem.countDocuments({ 
      foundById, 
      createdAt: { $gte: startOfDay } 
    });

    if (todayCount >= 3) {
      return res.status(429).json({ success: false, error: "Daily limit reached (Max 3 reports/day)." });
    }

    const imageUrl = await uploadToCloudinary(req.file.buffer, "smart-campus/lost-found");

    const item = await LostItem.create({
      foundById,
      title,
      description,
      locationFound,
      imageUrl,
      status: "pending_approval",
    });

    // Notify all admins about the new item pending approval
    const admins = await User.find({ role: "admin" }).select("_id");
    admins.forEach(admin => {
      pushNotification(admin._id.toString(), {
        type: "lost_found_approval",
        title: "Lost Item Verification ⚠️",
        message: `A new lost item '${item.title}' needs your approval.`,
        link: "/admin/lost-found"
      });
    });

    try {
      const { getIO } = require("../../config/socket");
      getIO().of("/notifications").to("admin").emit("new_activity");
    } catch (err) {
      console.error("Socket emit failed in reportFoundItem:", err.message);
    }

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get Lost/Found Items
 * @route GET /api/lost-found/
 * @access Private
 */
exports.getItems = async (req, res, next) => {
  try {
    let { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Default status for browsing is "active" (pending + in_office)
    let queryStatus = status || "active";
    let filter = {};
    
    if (queryStatus === "active") {
      filter.status = { $in: ["pending", "in_office"] };
    } else {
      filter.status = queryStatus;
    }

    const items = await LostItem.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LostItem.countDocuments(filter);

    // Privacy Filter: Strip sensitive details for public browsing
    const sanitized = items.map(item => {
      const obj = item.toObject();
      delete obj.foundById;
      delete obj.verifiedBy;
      return obj;
    });

    res.json({
      success: true,
      data: sanitized,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Verify Item Receipt (Move to Office)
 * @route PATCH /api/lost-found/:id/verify
 * @access Private (Teacher)
 */
exports.verifyItem = async (req, res, next) => {
  try {
    const item = await LostItem.findById(req.params.id);

    if (!item) return res.status(404).json({ success: false, error: "Item not found" });
    if (item.status !== "pending") {
      return res.status(400).json({ success: false, error: "Only pending items can be verified." });
    }

    item.status = "in_office";
    item.verifiedBy = req.user._id;
    item.verifiedAt = new Date();
    await item.save();

    // Notify all students about availability in office
    const students = await User.find({ role: "student" }).select("_id");
    students.forEach(student => {
      pushNotification(student._id, {
        type: "lost_found_update",
        title: "Item in Office! 🏢",
        message: `The '${item.title}' is now at the office. Please claim it.`,
        link: "/student/lost-found"
      });
    });

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Return Item to Student
 * @route PATCH /api/lost-found/:id/return
 * @access Private (Teacher)
 */
exports.returnItem = async (req, res, next) => {
  try {
    const { returnedToStudentId } = req.body;
    const item = await LostItem.findById(req.params.id);

    if (!item) return res.status(404).json({ success: false, error: "Item not found" });
    if (item.status !== "in_office") {
      return res.status(400).json({ success: false, error: "Only items in the office can be returned." });
    }

    if (returnedToStudentId) {
      const student = await User.findById(returnedToStudentId);
      if (!student) return res.status(400).json({ success: false, error: "Receiver student not found" });
    }

    item.status = "returned";
    item.returnedTo = returnedToStudentId || null;
    item.returnedAt = new Date();
    await item.save();

    res.json({ success: true, message: "Item successfully returned and journey completed." });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Admin Approve Lost Item
 * @route PATCH /api/lost-found/:id/approve
 * @access Private (Admin)
 */
exports.approveItem = async (req, res, next) => {
  try {
    const item = await LostItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: "Item not found" });
    if (item.status !== "pending_approval") {
      return res.status(400).json({ success: false, error: "Only items pending approval can be approved." });
    }

    item.status = "pending";
    await item.save();

    // Notify all students
    const students = await User.find({ role: "student" }).select("_id");
    students.forEach(student => {
      pushNotification(student._id, {
        type: "lost_found_update",
        title: "New Item Found! 🔍",
        message: `A ${item.title} was found at ${item.locationFound}. Is it yours?`,
        link: "/student/lost-found"
      });
    });

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Admin Reject Lost Item
 * @route PATCH /api/lost-found/:id/reject
 * @access Private (Admin)
 */
exports.rejectItem = async (req, res, next) => {
  try {
    const item = await LostItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: "Item not found" });
    if (item.status !== "pending_approval") {
      return res.status(400).json({ success: false, error: "Only items pending approval can be rejected." });
    }

    item.status = "rejected";
    await item.save();

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};
