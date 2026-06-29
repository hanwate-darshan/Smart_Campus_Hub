const express = require("express");
const multer = require("multer");
const { 
  createListing, 
  getListings, 
  getListingDetails, 
  updateListingStatus, 
  claimSoldController,
  confirmPurchaseController,
  getMyListingsWithDealStatus,
  reportListing,
  checkDuplicateListing,
  deleteListing
} = require("./listing.controller");
const { validateCreateListing } = require("./listing.validator");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

// Multer Config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
});

const { cacheMiddleware } = require("../../utils/cache");

router.use(authenticate);

// Student Routes
router.post("/check-duplicate", requireRole("student"), checkDuplicateListing);
router.post("/", requireRole("student"), upload.array("images", 3), validateCreateListing, createListing);
router.get("/", requireRole("student", "admin"), cacheMiddleware, getListings);
router.get("/mine/with-deal-status", requireRole("student"), getMyListingsWithDealStatus);
router.get("/:id", requireRole("student", "admin"), getListingDetails);
router.patch("/confirm-purchase", requireRole("student"), confirmPurchaseController);
router.patch("/:id/claim-sold", requireRole("student"), claimSoldController);
router.post("/:id/report", requireRole("student"), reportListing);

// Admin Routes
router.patch("/:id/approve", requireRole("admin"), (req, res, next) => {
  // Ensure mutable body object
  req.body = { ...(req.body || {}), status: "approved" };
  updateListingStatus(req, res, next);
});

router.patch("/:id/reject", requireRole("admin"), (req, res, next) => {
  // Ensure mutable body object
  req.body = { ...(req.body || {}), status: "rejected" };
  updateListingStatus(req, res, next);
});

router.delete("/:id", requireRole("admin", "student"), deleteListing);

module.exports = router;
