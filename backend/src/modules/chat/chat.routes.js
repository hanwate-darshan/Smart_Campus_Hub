const express = require("express");
const { 
  createRoom, 
  getRooms, 
  getMessages 
} = require("./chat.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

// Student Routes
router.post("/rooms", requireRole("student"), createRoom);
router.get("/rooms", requireRole("student"), getRooms);
router.get("/rooms/:id/messages", requireRole("student"), getMessages);

module.exports = router;
