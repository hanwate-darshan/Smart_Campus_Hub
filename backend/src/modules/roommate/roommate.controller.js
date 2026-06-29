const RoommateProfile = require("../../models/RoommateProfile.model");
const RoommateRequest = require("../../models/RoommateRequest.model");
const ChatRoom = require("../../models/ChatRoom.model");
const User = require("../../models/User.model");
const pushNotification = require("../../utils/pushNotification");
const { getIo } = require("../../config/socket");
const { roommateFollowupQueue } = require("../../jobs/roommate.followup");
const { uploadToCloudinary } = require("../../utils/cloudinary");

// Helper: Calculate Match Score and Generate Generic Reasons
const calculateScoreAndReasons = (my, their) => {
  if (!my || !their) return { score: 0, reasons: [] };
  let score = 0;
  const reasons = [];

  // 1. BUDGET SCORE (max 40)
  // Range overlap check
  const myMin = my.budgetRange?.min || 0;
  const myMax = my.budgetRange?.max || 0;
  const theirMin = their.budgetRange?.min || 0;
  const theirMax = their.budgetRange?.max || 0;
  
  if (myMax >= theirMin && myMin <= theirMax) {
    score += 40;
    reasons.push("Similar budget range");
  } else if (Math.abs(myMax - theirMin) <= 1000 || Math.abs(theirMax - myMin) <= 1000) {
    score += 20;
    reasons.push("Close budget range");
  }

  // 2. DEPARTMENT SCORE (max 40)
  if (my.department === their.department) {
    score += 40;
    reasons.push("Same department");
  }

  // 3. DURATION SCORE (max 20)
  if (my.duration === their.duration) {
    score += 20;
    reasons.push("Looking for same duration");
  }

  if (score < 0) score = 0;
  return {
    score: Math.min(score, 100),
    reasons
  };
};

// Route 1: Create/Update Profile
exports.upsertProfile = async (req, res, next) => {
  try {
    const updateData = { ...req.body, userId: req.user._id, isActive: true };
    
    if (typeof updateData.budgetRange === 'string') {
      try { updateData.budgetRange = JSON.parse(updateData.budgetRange); } catch(e) {}
    }
    if (typeof updateData.location === 'string') {
      try { updateData.location = JSON.parse(updateData.location); } catch(e) {}
    }
    if (typeof updateData.existingImages === 'string') {
      try { updateData.images = JSON.parse(updateData.existingImages); } catch(e) {}
      delete updateData.existingImages;
    }

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer, "smart-campus/roommate"));
      const newImages = await Promise.all(uploadPromises);
      updateData.images = [...(updateData.images || []), ...newImages];
    }

    const profile = await RoommateProfile.findOneAndUpdate(
      { userId: req.user._id },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

// Route 2: Get Scored Matches
exports.getMatches = async (req, res, next) => {
  try {
    const myProfile = await RoommateProfile.findOne({ userId: req.user._id });

    // Exclusion list
    const existingRequests = await RoommateRequest.find({
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }]
    });

    const excludedIds = existingRequests.map(r => 
      r.senderId.toString() === req.user._id.toString() ? r.receiverId.toString() : r.senderId.toString()
    );
    excludedIds.push(req.user._id.toString());

    // Find other active profiles of SAME GENDER
    const others = await RoommateProfile.find({
      userId: { $nin: excludedIds },
      isActive: true
    }).populate("userId", "name");

    // Compute Scores and map to Privacy-Safe view
    const matches = others.map(profile => {
      const matchResult = calculateScoreAndReasons(myProfile, profile);
      return {
        profileId: profile._id,
        userId: profile.userId._id,
        name: profile.userId.name,
        department: profile.department,
        year: profile.year,
        location: profile.location,
        bio: profile.bio,
        hobbies: profile.hobbies,
        images: profile.images,
        score: matchResult.score,
        matchReasons: matchResult.reasons
        // Notice we DO NOT send smokingPreference, cleanliness, sleepSchedule, budgetRange, dealBreakers
      };
    });

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    res.json({ success: true, data: matches.slice(0, 20) });
  } catch (err) {
    next(err);
  }
};

// Route 3: Send Roommate Request
exports.sendRequest = async (req, res, next) => {
  try {
    const receiverId = req.params.userId;
    const senderId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyCount = await RoommateRequest.countDocuments({
      senderId,
      createdAt: { $gte: today }
    });

    if (dailyCount >= 5) {
      return res.status(429).json({ success: false, error: "Daily limit reached (5 requests/day)" });
    }

    const existing = await RoommateRequest.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    });
    if (existing) {
      return res.status(400).json({ success: false, error: "A request already exists between you two" });
    }

    const request = await RoommateRequest.create({ senderId, receiverId });

    const senderProfile = await RoommateProfile.findOne({ userId: senderId });
    const receiverProfile = await RoommateProfile.findOne({ userId: receiverId });
    const matchResult = calculateScoreAndReasons(senderProfile, receiverProfile);

    pushNotification(receiverId, {
      type: "roommate_request",
      title: "New Roommate Request! 🏠",
      message: `${req.user.name} wants to be your roommate (Match: ${matchResult.score}%)`,
      link: "/student/roommate"
    });

    res.json({ success: true, message: "Request sent successfully" });
  } catch (err) {
    next(err);
  }
};

// Route 4: Accept Request
exports.acceptRequest = async (req, res, next) => {
  try {
    const request = await RoommateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, error: "Request not found" });
    if (request.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    request.status = "accepted";

    const chatRoom = await ChatRoom.create({
      participants: [request.senderId, request.receiverId],
      type: "roommate",
      roommateRequestId: request._id
    });

    request.chatRoomId = chatRoom._id;
    await request.save();

    pushNotification(request.senderId, {
      type: "roommate_request",
      title: "Request Accepted! 🤝",
      message: `${req.user.name} accepted your roommate request. Start chatting!`,
      link: `/student/marketplace/chat/${chatRoom._id}`
    });

    // Schedule 48-hour follow up
    await roommateFollowupQueue.add(
      "roommate-followup",
      { chatRoomId: chatRoom._id },
      { delay: 48 * 60 * 60 * 1000 } // 48 hours
    );

    res.json({ success: true, chatRoomId: chatRoom._id });
  } catch (err) {
    next(err);
  }
};

// Route 5: Reject Request
exports.rejectRequest = async (req, res, next) => {
  try {
    const request = await RoommateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, error: "Request not found" });
    if (request.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    request.status = "rejected";
    await request.save();

    pushNotification(request.senderId, {
      type: "roommate_request",
      title: "Request Declined",
      message: `Your roommate request to ${req.user.name} was not accepted.`,
      link: "/student/roommate"
    });

    res.json({ success: true, message: "Request rejected" });
  } catch (err) {
    next(err);
  }
};

// Route 6: Get My Requests
exports.getRequests = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const received = await RoommateRequest.find({ receiverId: userId })
      .populate("senderId", "name")
      .sort({ createdAt: -1 });

    const sent = await RoommateRequest.find({ senderId: userId })
      .populate("receiverId", "name")
      .sort({ createdAt: -1 });

    const myProfile = await RoommateProfile.findOne({ userId });

    // Format requests to only reveal full profile IF accepted
    const formatRequests = async (requests, isReceived) => {
      return Promise.all(requests.map(async (r) => {
        const otherUserId = isReceived ? r.senderId._id : r.receiverId._id;
        const otherProfile = await RoommateProfile.findOne({ userId: otherUserId });
        const matchResult = calculateScoreAndReasons(myProfile, otherProfile);
        
        let profileData = null;

        if (otherProfile) {
          if (r.status === "accepted") {
            // Full profile revealed!
            profileData = {
              department: otherProfile.department,
              year: otherProfile.year,
              bio: otherProfile.bio,
              hobbies: otherProfile.hobbies,
              budgetRange: otherProfile.budgetRange,
              smokingPreference: otherProfile.smokingPreference,
              sleepSchedule: otherProfile.sleepSchedule,
              cleanliness: otherProfile.cleanliness,
              dealBreakers: otherProfile.dealBreakers,
              duration: otherProfile.duration,
              images: otherProfile.images
            };
          } else {
            // Only safe fields revealed
            profileData = {
              department: otherProfile.department,
              year: otherProfile.year,
              bio: otherProfile.bio,
              hobbies: otherProfile.hobbies,
              images: otherProfile.images
            };
          }
        }

        return {
          ...r.toObject(),
          matchScore: matchResult.score,
          matchReasons: matchResult.reasons,
          otherProfile: profileData
        };
      }));
    };

    const receivedFormatted = await formatRequests(received, true);
    const sentFormatted = await formatRequests(sent, false);

    res.json({
      success: true,
      data: {
        received: receivedFormatted,
        sent: sentFormatted
      }
    });
  } catch (err) {
    next(err);
  }
};

// Route 8: Close Roommate Chat Manually
exports.closeChat = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const chatRoom = await ChatRoom.findById(roomId);

    if (!chatRoom) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    if (chatRoom.type !== "roommate") {
      return res.status(400).json({ success: false, error: "Invalid chat type" });
    }

    if (!chatRoom.participants.includes(req.user._id)) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    chatRoom.isLocked = true;
    chatRoom.dealStatus = "confirmed_sold"; // Reusing this for finalized status
    await chatRoom.save();

    const io = getIo();
    io.to(`room:${chatRoom._id}`).emit("deal_status_update", {
      chatRoomId: chatRoom._id,
      dealStatus: "confirmed_sold"
    });

    res.json({ success: true, message: "Chat permanently closed." });
  } catch (err) {
    next(err);
  }
};
