const express = require("express");
const { 
  upsertProfile, 
  getMatches, 
  sendRequest, 
  acceptRequest, 
  rejectRequest,
  getRequests,
  closeChat
} = require("./roommate.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const multer = require("multer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.use(authenticate);
router.use(requireRole("student"));

router.post("/profile", upload.array("images", 3), upsertProfile);
router.get("/matches", getMatches);
router.get("/requests", getRequests);
router.post("/request/:userId", sendRequest);
router.patch("/request/:id/accept", acceptRequest);
router.patch("/request/:id/reject", rejectRequest);
router.post("/close-chat/:roomId", closeChat);

module.exports = router;
