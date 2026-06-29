const complaintService = require("./complaint.service");
const { uploadToCloudinary } = require("../../utils/cloudinary");
const { createComplaintSchema, updateStatusSchema, addCommentSchema } = require("./complaint.validator");
const logger = require("../../config/logger");

exports.checkSimilar = async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title || !category) {
      return res.status(400).json({ success: false, error: "Title and category are required." });
    }

    const result = await complaintService.checkSimilarComplaints({
      title,
      category,
      excludeStudentId: req.user._id
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error("Error in checkSimilar controller", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.submitComplaint = async (req, res) => {
  try {
    const { error, value } = createComplaintSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    let imageUrl = null;
    if (req.file) {
      // Assuming uploadToCloudinary signature is (file.path, folder)
      // If it takes stream or buffer, it might differ, but let's assume path.
      // Usually req.file.path exists if we use multer dest or we can pass req.file.buffer depending on config.
      // Often, utils/cloudinary accepts the raw file or path. Let's pass the file buffer if available or path.
      // Based on lost-found or listing upload.
      const uploadResult = await uploadToCloudinary(req.file.path || req.file.buffer, "smart-campus/complaints");
      imageUrl = uploadResult.secure_url || uploadResult.url || uploadResult;
    }

    const complaint = await complaintService.createComplaint({
      studentId: req.user._id,
      studentName: req.user.name,
      studentEmail: req.user.email,
      title: value.title,
      description: value.description,
      category: value.category,
      isAnonymous: value.isAnonymous,
      imageUrl
    });

    return res.status(201).json({ success: true, data: complaint, message: "Complaint submitted successfully." });
  } catch (err) {
    if (err.status === 400 || err.status === 429) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    logger.error("Error in submitComplaint controller", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await complaintService.getMyComplaints({
      studentId: req.user._id,
      page: page || 1,
      limit: limit || 10
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error("Error in getMyComplaints controller", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getAllComplaints = async (req, res) => {
  try {
    const { category, status, search, page, limit } = req.query;
    const result = await complaintService.getAllComplaints({
      category,
      status,
      search,
      page: page || 1,
      limit: limit || 10
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error("Error in getAllComplaints controller", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const complaint = await complaintService.updateComplaintStatus({
      complaintId: req.params.id,
      newStatus: value.status,
      comment: value.comment,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      updatedByName: req.user.name || "Admin/Teacher"
    });

    return res.status(200).json({ success: true, data: complaint, message: "Status updated." });
  } catch (err) {
    if (err.status === 400 || err.status === 404) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    logger.error("Error in updateStatus controller", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { error, value } = addCommentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    console.log("Adding comment by user:", req.user._id, "Role:", req.user.role, "Name:", req.user.name);
    const complaint = await complaintService.addComment({
      complaintId: req.params.id,
      authorId: req.user._id,
      authorRole: req.user.role,
      authorName: req.user.name || "Admin/Teacher",
      text: value.text
    });

    return res.status(200).json({ success: true, data: complaint, message: "Comment added." });
  } catch (err) {
    if (err.status === 400 || err.status === 404) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    logger.error("Error in addComment controller", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await complaintService.getComplaintById({
      complaintId: req.params.id,
      requestingUserId: req.user._id,
      requestingUserRole: req.user.role
    });
    return res.status(200).json({ success: true, data: complaint });
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    logger.error("Error in getComplaintById controller", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
exports.getStats = async (req, res) => {
  try {
    const stats = await complaintService.getComplaintStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    logger.error("Error in getStats controller", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.deleteComplaint = async (req, res) => {
  try {
    await complaintService.deleteComplaint(req.params.id);
    return res.status(200).json({ success: true, message: "Complaint deleted successfully." });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ success: false, error: err.message });
    }
    logger.error("Error in deleteComplaint controller", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
