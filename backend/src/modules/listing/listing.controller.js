const Listing = require("../../models/Listing.model");
const ChatRoom = require("../../models/ChatRoom.model");
const User = require("../../models/User.model");
const { uploadToCloudinary } = require("../../utils/cloudinary");
const pushNotification = require("../../utils/pushNotification");
const { setMarketplaceCache, invalidateMarketplaceCache } = require("../../utils/cache");

// Route 1: Post Listing
exports.createListing = async (req, res, next) => {
  try {
    // ... (existing logic)
    const { title, description, price, category } = req.body;
    const sellerId = req.user._id;

    if (!req.files || req.files.length < 1) return res.status(400).json({ success: false, error: "At least one image is required" });
    if (req.files.length > 3) return res.status(400).json({ success: false, error: "Maximum 3 images allowed" });

    const activeCount = await Listing.countDocuments({ sellerId, status: "approved" });
    if (activeCount >= 5) return res.status(429).json({ success: false, error: "You can only have 5 active listings at once." });

    const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer, "smart-campus/marketplace"));
    const imageUrls = await Promise.all(uploadPromises);

    const listing = await Listing.create({
      sellerId,
      title,
      description,
      price,
      category,
      images: imageUrls,
      status: "pending"
    });

    // Notify Admins
    const admins = await User.find({ role: "admin" }).select("_id");
    admins.forEach(admin => {
      pushNotification(admin._id, {
        type: "new_listing_pending",
        title: "New Marketplace Listing",
        message: `${req.user.name} posted: ${title}`,
        link: "/admin/marketplace"
      });
    });

    res.status(201).json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
};

// Route 2: Get All Approved Listings (Cached)
exports.getListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .populate("sellerId", "name");
    
    const response = { success: true, count: listings.length, data: listings };
    
    // Set Cache for next time
    await setMarketplaceCache(response);
    
    res.json(response);
  } catch (err) {
    next(err);
  }
};

// Route 3: Get Listing Details
exports.getListingDetails = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("sellerId", "name");
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found" });

    res.json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
};

// Route 4 & 5: Admin Moderation
exports.updateListingStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found" });

    if (listing.status !== "pending") return res.status(400).json({ success: false, error: "Can only moderate pending listings" });

    listing.status = status;
    if (reason) listing.rejectionReason = reason;
    await listing.save();

    // Invalidate Cache since status changed
    await invalidateMarketplaceCache();

    // Notify Seller
    pushNotification(listing.sellerId, {
      type: status === "approved" ? "listing_approved" : "listing_rejected",
      title: status === "approved" ? "Item Approved! ✅" : "Item Rejected ❌",
      message: status === "approved" 
        ? `Your listing "${listing.title}" is now live!` 
        : `Your listing "${listing.title}" was rejected. Reason: ${reason}`,
      link: "/student/marketplace"
    });

    res.json({ success: true, message: `Listing ${status}` });
  } catch (err) {
    next(err);
  }
};

// Route 6: Mark as Sold
exports.markAsSold = async (req, res, next) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found or unauthorized" });

    listing.status = "sold";
    await listing.save();

    // Invalidate Cache
    await invalidateMarketplaceCache();

    // Lock all related chat rooms
    await ChatRoom.updateMany({ listingId: listing._id }, { isLocked: true });

    res.json({ success: true, message: "Item marked as sold and chats locked." });
  } catch (err) {
    next(err);
  }
};

// Route 7: Report Listing
exports.reportListing = async (req, res, next) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id, 
      { $inc: { reportCount: 1 } },
      { new: true }
    );
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found" });

    if (listing.reportCount >= 5) {
      // Invalidate cache if high reports (might want to hide it automatically)
      // await invalidateMarketplaceCache();
      
      const User = require("../../models/User.model");
      const admins = await User.find({ role: "admin" }).select("_id");
      admins.forEach(admin => {
        pushNotification(admin._id, {
          type: "urgent_listing_report",
          title: "Urgent: High Reports!",
          message: `The item "${listing.title}" has received multiple reports.`,
          link: "/admin/marketplace"
        });
      });
    }

    res.json({ success: true, message: "Listing reported. Administrators will review." });
  } catch (err) {
    next(err);
  }
};
