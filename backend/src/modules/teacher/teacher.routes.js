const express = require('express');
const multer = require('multer');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { getProfile, updateProfile } = require('./teacher.controller');

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
router.use(requireRole('teacher'));

router.get('/profile', getProfile);
router.patch('/profile', upload.single('profilePic'), updateProfile);

module.exports = router;
