const express = require('express');
const multer = require('multer');
const { register, login, refresh, logout, googleLogin } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/register', upload.single('idProof'), register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);

module.exports = router;
