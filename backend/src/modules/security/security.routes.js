const express = require("express");
const { updateDutyStatus } = require("./security.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);
router.use(requireRole("security"));

router.patch("/status", updateDutyStatus);

module.exports = router;
