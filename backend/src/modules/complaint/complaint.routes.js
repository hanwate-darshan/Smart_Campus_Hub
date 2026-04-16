const express = require("express");
const multer = require("multer");
const { 
  submitComplaint, 
  getMyComplaints, 
  getAllComplaints, 
  updateComplaintStatus, 
  addComment,
  getComplaintStats
} = require("./complaint.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

// Multer Config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
});

router.use(authenticate);

// Student Routes
router.post("/", requireRole("student"), upload.single("image"), submitComplaint);
router.get("/mine", requireRole("student"), getMyComplaints);

// Teacher/Admin Routes
router.get("/stats", requireRole("teacher", "admin"), getComplaintStats);
router.get("/", requireRole("teacher", "admin"), getAllComplaints);
router.patch("/:id/status", requireRole("teacher", "admin"), updateComplaintStatus);
router.post("/:id/comment", requireRole("teacher", "admin"), addComment);

module.exports = router;
