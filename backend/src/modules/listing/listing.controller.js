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
    const { title, description, price, category, condition } = req.body;
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
      condition,
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
    require('fs').appendFileSync('listing_error.txt', new Date().toISOString() + ': ' + (err.stack || err) + '\n');
    next(err);
  }
};

// Route: Check Duplicate Listing
exports.checkDuplicateListing = async (req, res, next) => {
  try {
    const { title } = req.body;
    const sellerId = req.user._id;

    if (!title) return res.status(400).json({ success: false, error: "Title is required" });

    const existingListings = await Listing.find({
      sellerId: sellerId,
      status: { $in: ["pending", "approved"] }
    });

    const newWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    let duplicateFound = null;

    for (const listing of existingListings) {
      const existingWords = listing.title.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      let matchCount = 0;
      
      // Count how many words match
      newWords.forEach(word => {
        if (existingWords.includes(word)) {
          matchCount++;
        }
      });
      
      const matchPercentage = matchCount / newWords.length;
      
      if (matchPercentage > 0.6) {
        duplicateFound = listing.title;
        break;
      }
    }

    if (duplicateFound) {
      return res.status(200).json({ 
        success: true, 
        data: {
          isDuplicate: true, 
          similarListing: duplicateFound
        },
        message: `You already have a similar listing: '${duplicateFound}'. Are you sure you want to post this?` 
      });
    }

    return res.status(200).json({ success: true, data: { isDuplicate: false, similarListing: null } });
  } catch (err) {
    next(err);
  }
};

// Route 2: Get All Approved Listings (Cached if no filters)
exports.getListings = async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice, myListings, status } = req.query;
    
    let filter = {};

    // Admin can query any status directly
    if (req.user.role === "admin") {
      if (status) filter.status = status;
      // else admin gets all listings without status restriction
    } else if (myListings === "true") {
      // Student viewing their own listings
      filter.sellerId = req.user._id;
    } else {
      // Student browsing: only approved
      filter.status = "approved";
    }

    // Apply Filters
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const listings = await Listing.find(filter)
      .sort({ createdAt: -1 })
      .populate("sellerId", "name");
    
    const response = { success: true, count: listings.length, data: listings };
    
    // Only cache the default "all listings" view
    if (Object.keys(req.query).length === 0) {
      await setMarketplaceCache(response);
    }
    
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
    if (listing.status === "sold") return res.status(400).json({ success: false, error: "Cannot change status of a sold listing" });

    const updateData = { status };
    if (reason) updateData.rejectionReason = reason;

    // Use findByIdAndUpdate to bypass Mongoose validators (avoids issues with legacy listings missing optional fields)
    await Listing.findByIdAndUpdate(req.params.id, updateData, { runValidators: false });

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

    // Notify ALL other students if the listing is approved
    if (status === "approved") {
      const students = await User.find({ role: "student", _id: { $ne: listing.sellerId } }).select("_id");
      students.forEach(student => {
        pushNotification(student._id, {
          type: "marketplace_update",
          title: "New Item in Marketplace! 🛒",
          message: `A new item "${listing.title}" is now available for ₹${listing.price}!`,
          link: "/student/marketplace"
        });
      });
    }

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

    // Notify all OTHER buyers who had chat rooms for this listing
    const chatRooms = await ChatRoom.find({ listingId: listing._id });
    for (const room of chatRooms) {
      const buyerId = room.participants.find(p => p.toString() !== req.user._id.toString());
      if (buyerId) {
        pushNotification(buyerId, {
          type: "listing_sold",
          title: "Item No Longer Available",
          message: 'The item "' + listing.title + '" has been sold to someone else.',
          link: "/student/marketplace"
        });
      }
    }

    res.json({ success: true, message: "Item marked as sold and chats locked." });
  } catch (err) {
    next(err);
  }
};

// Route 7: Report Listing
exports.reportListing = async (req, res, next) => {
  try {
    // Step 1: Find listing
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found" });

    // Step 2: Check if already reported
    if (listing.reportedBy.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: "You have already reported this listing." });
    }

    // Step 3: Add reporter and increment count
    listing.reportedBy.push(req.user._id);
    listing.reportCount += 1;
    await listing.save();

    // Step 4: Notify admins if high reports on single item
    if (listing.reportCount >= 5) {
      const User = require("../../models/User.model");
      const admins = await User.find({ role: "admin" }).select("_id");
      admins.forEach(admin => {
        pushNotification(admin._id, {
          type: "listing_flagged",
          title: "Listing Flagged Multiple Times",
          message: `"${listing.title}" has been reported ${listing.reportCount} times.`,
          link: "/admin/marketplace"
        });
      });
    }

    // Step 5: NEW LOGIC - Check seller-wide reports
    // Find all listings by this seller where reportedBy array length >= 3
    const flaggedListingsCount = await Listing.countDocuments({
      sellerId: listing.sellerId,
      'reportedBy.2': { $exists: true } // Checks if array has at least 3 elements
    });

    if (flaggedListingsCount >= 2) {
      const User = require("../../models/User.model");
      const seller = await User.findById(listing.sellerId);
      
      if (seller && seller.status !== "suspended") {
        seller.status = "suspended";
        await seller.save();

        const { redisClient } = require('../../config/redis');
        await redisClient.del(`refresh:${seller._id}`);

        pushNotification(seller._id, {
          type: "account_suspended",
          title: "Account Suspended",
          message: "Your account has been suspended due to multiple reports across your listings. Contact administration.",
          link: "/"
        });

        const admins = await User.find({ role: "admin" }).select("_id");
        admins.forEach(admin => {
          pushNotification(admin._id, {
            type: "auto_suspension",
            title: "Seller Auto-Suspended",
            message: `${seller.name} was automatically suspended due to repeated reports.`,
            link: "/admin/users"
          });
        });
      }
    }

    // Step 6: Return success
    res.json({ success: true, message: "Listing reported. Thank you for keeping our marketplace safe." });
  } catch (err) {
    next(err);
  }
};
