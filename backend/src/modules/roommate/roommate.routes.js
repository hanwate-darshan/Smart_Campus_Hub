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

const router = express.Router();

router.use(authenticate);
router.use(requireRole("student"));

router.post("/profile", upsertProfile);
router.get("/matches", getMatches);
router.get("/requests", getRequests);
router.post("/request/:userId", sendRequest);
router.patch("/request/:id/accept", acceptRequest);
router.patch("/request/:id/reject", rejectRequest);
router.post("/close-chat/:roomId", closeChat);

module.exports = router;
