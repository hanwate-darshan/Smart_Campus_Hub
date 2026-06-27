const express = require("express");
const {
  triggerSOS,
  cancelSOS,
  acceptSOS,
  updateSOSStatus,
  getActiveSOS,
  getMySOSHistory,
  getAllSOS,
} = require("./sos.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

// Student routes
router.post("/trigger", requireRole("student"), triggerSOS);
router.post("/:id/cancel", requireRole("student"), cancelSOS);
router.get("/my-history", requireRole("student"), getMySOSHistory);

// Security routes
router.patch("/:id/accept", requireRole("security"), acceptSOS);
router.patch("/:id/status", requireRole("security"), updateSOSStatus);

// Admin/Security routes
router.get("/active", requireRole("security", "admin"), getActiveSOS);
router.get("/all", requireRole("admin"), getAllSOS);

module.exports = router;
