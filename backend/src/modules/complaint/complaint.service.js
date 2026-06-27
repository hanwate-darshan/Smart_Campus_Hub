const Complaint = require("../../models/Complaint.model");
const User = require("../../models/User.model");
const pushNotification = require("../../utils/pushNotification");
const { sendEmail } = require("../../utils/email.utils");
const { containsProfanity } = require("../../utils/profanityFilter");
const { getIo } = require("../../config/socket");
const logger = require("../../config/logger");

// ─────────────────────────────────────
// FUNCTION 1: checkSimilarComplaints (ADD-ON FEATURE)
// ─────────────────────────────────────
const checkSimilarComplaints = async ({ title, category, excludeStudentId }) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const complaints = await Complaint.find({
    category,
    createdAt: { $gte: cutoff },
    studentId: { $ne: excludeStudentId }
  });

  const newWords = title.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  let similarCount = 0;
  let uniqueStudents = new Set();

  for (const comp of complaints) {
    const existingWords = comp.title.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    let matchCount = 0;

    for (const word of newWords) {
      if (existingWords.includes(word)) matchCount++;
    }

    if (newWords.length > 0 && (matchCount / newWords.length) > 0.5) {
      similarCount++;
      uniqueStudents.add(comp.studentId.toString());
    }
  }

  return {
    hasSimilar: similarCount > 0,
    similarCount,
    uniqueStudentsCount: uniqueStudents.size
  };
};

// ─────────────────────────────────────
// FUNCTION 2: createComplaint
// ─────────────────────────────────────
const createComplaint = async ({ studentId, title, description, category, isAnonymous, imageUrl, studentEmail, studentName }) => {
  // Step 1: PROFANITY CHECK
  if (containsProfanity(title) || containsProfanity(description)) {
    const err = new Error("Your complaint contains inappropriate language. Please revise and resubmit.");
    err.status = 400;
    throw err;
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Step 2: Rate limit total complaints per day
  const dailyTotalCount = await Complaint.countDocuments({
    studentId,
    createdAt: { $gte: startOfDay }
  });
  if (dailyTotalCount >= 3) {
    const err = new Error("Maximum 3 complaints per day.");
    err.status = 429;
    throw err;
  }

  // Step 3: Rate limit anonymous complaints per day
  if (isAnonymous) {
    const dailyAnonymousCount = await Complaint.countDocuments({
      studentId,
      isAnonymous: true,
      createdAt: { $gte: startOfDay }
    });
    if (dailyAnonymousCount >= 1) {
      const err = new Error("Maximum 1 anonymous complaint per day.");
      err.status = 429;
      throw err;
    }
  }

  // Step 4: Create document
  const complaint = new Complaint({
    studentId,
    title,
    description,
    category,
    isAnonymous,
    imageUrl,
    status: "submitted"
  });
  await complaint.save();

  // Step 5 & 6: Notify Admins & Teachers
  try {
    const io = getIo();
    if (category === "ragging") {
      io.to("admin:room").emit("notification_push", {
        type: "urgent_complaint",
        title: "URGENT: Ragging Complaint",
        message: "A ragging complaint has been submitted. Immediate attention required.",
        link: "/admin/complaints"
      });
    }
    io.to("teacher:room").emit("notification_push", {
      type: "new_complaint",
      title: "New Complaint",
      message: `${category} — ${title}`,
      link: "/teacher/complaints"
    });
  } catch (err) {
    logger.error("Failed to emit complaint socket notification", err);
  }

  // Step 7: EMAIL CONFIRMATION (ADD-ON)
  try {
    await sendEmail({
      to: studentEmail,
      subject: "We received your complaint",
      html: `
        <h3>Complaint Received</h3>
        <p>Hi ${studentName},</p>
        <p>Your complaint '<strong>${title}</strong>' has been received and will be reviewed within 24-48 hours.</p>
        <p>You can track its status anytime in the app under 'My Complaints'.</p>
      `
    });
  } catch (err) {
    logger.error(`Failed to send confirmation email to ${studentEmail}`, err);
  }

  return complaint;
};

// ─────────────────────────────────────
// FUNCTION 3: getMyComplaints
// ─────────────────────────────────────
const getMyComplaints = async ({ studentId, page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  const complaints = await Complaint.find({ studentId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalComplaints = await Complaint.countDocuments({ studentId });
  const totalPages = Math.ceil(totalComplaints / limit);

  return {
    complaints,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalComplaints,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// ─────────────────────────────────────
// FUNCTION 4: getAllComplaints
// ─────────────────────────────────────
const getAllComplaints = async ({ category, status, search, page = 1, limit = 10 }) => {
  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
  }

  const skip = (page - 1) * limit;
  
  // Sort: escalated first, then newest
  const complaints = await Complaint.find(filter)
    .sort({ escalatedAt: -1, createdAt: -1 }) // Assuming escalatedAt exists means it's not null, MongoDB sorts nulls first sometimes, but let's sort by escalatedAt -1. Actually, a better way is to sort by a boolean if possible, but standard sort is fine.
    .skip(skip)
    .limit(limit)
    .populate("studentId", "name email phone")
    .lean(); // Use lean to easily modify studentId

  const totalComplaints = await Complaint.countDocuments(filter);
  const totalPages = Math.ceil(totalComplaints / limit);

  // Privacy Rule
  const safeComplaints = complaints.map(comp => {
    if (comp.isAnonymous) {
      comp.studentId = { name: "Anonymous Student", email: null, phone: null };
    }
    return comp;
  });

  return {
    complaints: safeComplaints,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalComplaints,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// ─────────────────────────────────────
// FUNCTION 5: updateComplaintStatus
// ─────────────────────────────────────
const updateComplaintStatus = async ({ complaintId, newStatus, comment, updatedBy, updatedByRole, updatedByName }) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    const err = new Error("Complaint not found");
    err.status = 404;
    throw err;
  }

  // Validate transitions unless admin
  if (updatedByRole !== "admin") {
    const validTransitions = {
      "submitted": ["in_review"],
      "in_review": ["in_progress"],
      "in_progress": ["resolved"],
      "resolved": ["closed"],
      "closed": []
    };
    if (!validTransitions[complaint.status]?.includes(newStatus)) {
      const err = new Error("Invalid status transition.");
      err.status = 400;
      throw err;
    }
  }

  // Profanity check on comment
  if (comment && containsProfanity(comment)) {
    const err = new Error("Comment contains inappropriate language.");
    err.status = 400;
    throw err;
  }

  complaint.status = newStatus;

  if (comment) {
    complaint.comments.push({
      authorId: updatedBy,
      authorRole: updatedByRole,
      authorName: updatedByName,
      text: comment,
      createdAt: new Date()
    });
  }

  await complaint.save();

  if (!complaint.isAnonymous) {
    pushNotification(complaint.studentId, {
      type: "complaint_update",
      title: "Complaint Status Updated",
      message: `Your complaint "${complaint.title}" is now ${newStatus.replace('_', ' ')}`,
      link: "/student/complaints"
    });
  }

  return complaint;
};

// ─────────────────────────────────────
// FUNCTION 6: addComment
// ─────────────────────────────────────
const addComment = async ({ complaintId, authorId, authorRole, authorName, text }) => {
  if (containsProfanity(text)) {
    const err = new Error("Comment contains inappropriate language.");
    err.status = 400;
    throw err;
  }

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    const err = new Error("Complaint not found");
    err.status = 404;
    throw err;
  }

  complaint.comments.push({
    authorId,
    authorRole,
    authorName,
    text,
    createdAt: new Date()
  });

  await complaint.save();

  if (!complaint.isAnonymous) {
    pushNotification(complaint.studentId, {
      type: "complaint_comment",
      title: "New Response",
      message: `${authorName} added a response`,
      link: "/student/complaints"
    });
  }

  return complaint;
};

// ─────────────────────────────────────
// FUNCTION 7: getComplaintById
// ─────────────────────────────────────
const getComplaintById = async ({ complaintId, requestingUserId, requestingUserRole }) => {
  const complaint = await Complaint.findById(complaintId).populate("studentId", "name email").lean();
  
  if (!complaint) {
    const err = new Error("Complaint not found");
    err.status = 404;
    throw err;
  }

  if (requestingUserRole === "student") {
    if (complaint.studentId._id.toString() !== requestingUserId.toString()) {
      const err = new Error("Forbidden access");
      err.status = 403;
      throw err;
    }
  }

  if (complaint.isAnonymous) {
    complaint.studentId = { name: "Anonymous Student", email: null };
  }

  return complaint;
};

// ─────────────────────────────────────
// FUNCTION 8: getComplaintStats
// ─────────────────────────────────────
const getComplaintStats = async () => {
  const [total, pending, resolved, escalated, recent] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: { $in: ["submitted", "in_review", "in_progress"] } }),
    Complaint.countDocuments({ status: "resolved" }),
    Complaint.countDocuments({ status: "escalated" }), // Or any other criteria
    Complaint.find().sort({ createdAt: -1 }).limit(5).populate("studentId", "name").lean()
  ]);

  // Format recent for frontend
  const formattedRecent = recent.map(comp => ({
    id: comp._id,
    title: comp.title,
    studentName: comp.isAnonymous ? "Anonymous Student" : (comp.studentId?.name || "Unknown"),
    status: comp.status,
    createdAt: comp.createdAt
  }));

  return {
    total,
    pending,
    resolved,
    escalated,
    recent: formattedRecent
  };
};

module.exports = {
  checkSimilarComplaints,
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  addComment,
  getComplaintById,
  getComplaintStats
};
