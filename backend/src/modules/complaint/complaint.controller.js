const Complaint = require("../../models/Complaint.model");
const User = require("../../models/User.model");
const { uploadToCloudinary } = require("../../utils/cloudinary");
const pushNotification = require("../../utils/pushNotification");

// Step 1: Submit Complaint
exports.submitComplaint = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { title, description, category, isAnonymous } = req.body;

    // Daily Limit Checks
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayComplaints = await Complaint.find({
      studentId,
      createdAt: { $gte: startOfDay },
    });

    if (todayComplaints.length >= 3) {
      return res.status(429).json({ success: false, error: "Daily limit reached (Max 3 complaints per day)." });
    }

    if (isAnonymous === "true" || isAnonymous === true) {
      const anonToday = todayComplaints.filter(c => c.isAnonymous);
      if (anonToday.length >= 1) {
        return res.status(429).json({ success: false, error: "Anonymous daily limit reached (Max 1 per day)." });
      }
    }

    let imageUrl = "";
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "smart-campus/complaints");
    }

    const complaint = await Complaint.create({
      studentId,
      title,
      description,
      category,
      isAnonymous: isAnonymous === "true" || isAnonymous === true,
      imageUrl,
    });

    // Notify Admins
    const admins = await User.find({ role: "admin" }).select("_id");
    admins.forEach(admin => {
      pushNotification(admin._id, {
        type: category === "ragging" ? "urgent_complaint" : "complaint_update",
        title: category === "ragging" ? "🚨 URGENT: Ragging Report" : "New Complaint Submitted",
        message: `${req.user.name} submitted a ${category} complaint: ${title}`,
        link: "/admin/complaints"
      });
    });

    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

// Step 2: Get My Complaints (Student)
exports.getMyComplaints = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const complaints = await Complaint.find({ studentId: req.user._id })
      .select("title category status createdAt comments")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments({ studentId: req.user._id });

    // Transform to include comment count
    const formatted = complaints.map(c => ({
      ...c.toObject(),
      commentsCount: c.comments.length,
      comments: undefined,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// Step 3: Get All Complaints (Admin/Teacher)
exports.getAllComplaints = async (req, res, next) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const complaints = await Complaint.find(query)
      .populate("studentId", "name profilePicUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(query);

    // Apply Privacy Enforcement
    const sanitized = complaints.map(c => {
      const obj = c.toObject();
      if (obj.isAnonymous) {
        obj.studentId = null;
        obj.studentName = "Anonymous Student";
        delete obj.studentId;
      } else if (obj.studentId) {
        obj.studentName = obj.studentId.name;
        obj.studentProfilePic = obj.studentId.profilePicUrl;
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      data: sanitized,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
};

// Step 4: Update Status
exports.updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, comment } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) return res.status(404).json({ success: false, error: "Complaint not found" });

    const STATUS_ORDER = ["submitted", "in_review", "in_progress", "resolved", "closed"];
    
    if (!STATUS_ORDER.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status value" });
    }

    if (complaint.status === status) {
      return res.status(400).json({
        success: false,
        error: `Complaint is already ${status.replace("_", " ")}`,
      });
    }

    complaint.status = status;
    if (comment) {
      complaint.comments.push({
        authorId: req.user._id,
        authorRole: req.user.role,
        text: `Status changed to ${status.replace("_", " ")}. Note: ${comment}`,
      });
    }

    await complaint.save();

    // Notify Student
    if (!complaint.isAnonymous) {
      pushNotification(complaint.studentId, {
        type: "complaint_update",
        title: "Complaint Status Updated",
        message: `Your complaint "${complaint.title}" is now: ${status.replace("_", " ")}`,
        link: "/student/complaints"
      });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

// Step 5: Add Comment
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || text.length > 500) {
      return res.status(400).json({ success: false, error: "Comment text must be between 1 and 500 chars" });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, error: "Complaint not found" });

    complaint.comments.push({
      authorId: req.user._id,
      authorRole: req.user.role,
      text,
    });

    await complaint.save();

    // Notify Student
    if (!complaint.isAnonymous && req.user._id.toString() !== complaint.studentId.toString()) {
      pushNotification(complaint.studentId, {
        type: "complaint_update",
        title: "New Response Received",
        message: `${req.user.name} commented on your complaint.`,
        link: "/student/complaints"
      });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

// Step 6: Get Stats (Dashboard)
exports.getComplaintStats = async (req, res, next) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = {
      submitted: 0,
      in_review: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };

    stats.forEach((item) => {
      formattedStats[item._id] = item.count;
    });

    res.json({ success: true, data: formattedStats });
  } catch (err) {
    next(err);
  }
};
