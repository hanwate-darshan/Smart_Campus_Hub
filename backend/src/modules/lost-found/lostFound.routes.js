const express = require("express");
const multer = require("multer");
const { 
  reportFoundItem, 
  getItems, 
  verifyItem, 
  returnItem 
} = require("./lostFound.controller");
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

// All routes require authentication
router.use(authenticate);

// Public/Student routes
router.post("/", requireRole("student"), upload.single("image"), reportFoundItem);
router.get("/", getItems);

// Teacher routes
router.patch("/:id/verify", requireRole("teacher"), verifyItem);
router.patch("/:id/return", requireRole("teacher"), returnItem);

module.exports = router;
