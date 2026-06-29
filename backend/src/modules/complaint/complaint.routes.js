const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const complaintController = require("./complaint.controller");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// POST /check-similar
router.post(
  "/check-similar",
  authenticate,
  requireRole("student"),
  complaintController.checkSimilar
);

// POST /
router.post(
  "/",
  authenticate,
  requireRole("student"),
  upload.single("image"),
  complaintController.submitComplaint
);

// GET /mine
router.get(
  "/mine",
  authenticate,
  requireRole("student"),
  complaintController.getMyComplaints
);

// GET /
router.get(
  "/",
  authenticate,
  requireRole("teacher", "admin", "student"),
  complaintController.getAllComplaints
);

// GET /stats
router.get(
  "/stats",
  authenticate,
  requireRole("teacher", "admin"),
  complaintController.getStats
);

// GET /:id
router.get(
  "/:id",
  authenticate,
  complaintController.getComplaintById
);

// PATCH /:id/status
router.patch(
  "/:id/status",
  authenticate,
  requireRole("teacher", "admin"),
  complaintController.updateStatus
);

// POST /:id/comment
router.post(
  "/:id/comment",
  authenticate,
  requireRole("teacher", "admin"),
  complaintController.addComment
);

// DELETE /:id
router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  complaintController.deleteComplaint
);

module.exports = router;
