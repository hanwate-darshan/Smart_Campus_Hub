const express = require("express");
const multer = require("multer");
const { updateDutyStatus, getProfile, updateProfile } = require("./security.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

router.use(authenticate);
router.use(requireRole("security"));

router.patch("/status", updateDutyStatus);
router.get("/profile", getProfile);
router.patch("/profile", upload.single("profilePic"), updateProfile);

module.exports = router;
