const RoommateProfile = require("../../models/RoommateProfile.model");
const RoommateRequest = require("../../models/RoommateRequest.model");
const ChatRoom = require("../../models/ChatRoom.model");
const User = require("../../models/User.model");
const pushNotification = require("../../utils/pushNotification");

// Helper: Calculate Match Score
const calculateScore = (my, their) => {
  let score = 0;

  // 1. BUDGET SCORE (max 30)
  const diff = Math.abs(my.budget - their.budget);
  if (diff <= 2000) score += 30;
  else if (diff <= 5000) score += 15;

  // 2. HABIT SCORE (max 40)
  if (my.smoking === their.smoking) score += 15;
  if (my.sleepSchedule === their.sleepSchedule) score += 15;
  if (my.cleanliness === their.cleanliness) score += 10;

  // 3. HOBBIES & DEPT (max 30)
  if (my.department === their.department) score += 15;
  
  const myHobbies = my.hobbies.map(h => h.toLowerCase());
  const theirHobbies = their.hobbies.map(h => h.toLowerCase());
  const common = myHobbies.filter(h => theirHobbies.includes(h)).length;
  score += Math.min(common * 5, 15);

  return Math.min(score, 100);
};

// Route 1: Create/Update Profile
exports.upsertProfile = async (req, res, next) => {
  try {
    const profile = await RoommateProfile.findOneAndUpdate(
      { userId: req.user._id },
      { ...req.body, userId: req.user._id, isActive: true },
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
    if (!myProfile) {
      return res.status(400).json({ success: false, error: "Create your profile first" });
    }

    // Exclusion list: People I sent requests to or people who rejected me (or I rejected)
    const existingRequests = await RoommateRequest.find({
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }]
    });

    const excludedIds = existingRequests.map(r => 
      r.senderId.toString() === req.user._id.toString() ? r.receiverId.toString() : r.senderId.toString()
    );
    excludedIds.push(req.user._id.toString());

    // Find other active profiles
    const others = await RoommateProfile.find({
      userId: { $nin: excludedIds },
      isActive: true
    }).populate("userId", "name");

    // Compute Scores
    const matches = others.map(profile => {
      return {
        profileId: profile._id,
        userId: profile.userId._id,
        name: profile.userId.name,
        department: profile.department,
        year: profile.year,
        budget: profile.budget,
        bio: profile.bio,
        hobbies: profile.hobbies,
        score: calculateScore(myProfile, profile)
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

    // Daily limit check (max 5 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyCount = await RoommateRequest.countDocuments({
      senderId,
      createdAt: { $gte: today }
    });

    if (dailyCount >= 5) {
      return res.status(429).json({ success: false, error: "Daily limit reached (5 requests/day)" });
    }

    // Check no existing
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

    // Notify Receiver
    const senderProfile = await RoommateProfile.findOne({ userId: senderId });
    const receiverProfile = await RoommateProfile.findOne({ userId: receiverId });
    const matchScore = calculateScore(senderProfile, receiverProfile);

    pushNotification(receiverId, {
      type: "roommate_request",
      title: "New Roommate Request! 🏠",
      message: `${req.user.name} wants to be your roommate (Match: ${matchScore}%)`,
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

    // Create ChatRoom
    const chatRoom = await ChatRoom.create({
      participants: [request.senderId, request.receiverId],
      type: "roommate",
      roommateRequestId: request._id
    });

    request.chatRoomId = chatRoom._id;
    await request.save();

    // Notify Sender
    pushNotification(request.senderId, {
      type: "roommate_request",
      title: "Request Accepted! 🤝",
      message: `${req.user.name} accepted your roommate request. Start chatting!`,
      link: `/student/marketplace/chat/${chatRoom._id}`
    });

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

    // Notify Sender
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

// Route 6: Get My Requests (Sent and Received)
exports.getRequests = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const received = await RoommateRequest.find({ receiverId: userId })
      .populate("senderId", "name")
      .sort({ createdAt: -1 });

    const sent = await RoommateRequest.find({ senderId: userId })
      .populate("receiverId", "name")
      .sort({ createdAt: -1 });

    // For received, we need match score to show in UI
    const myProfile = await RoommateProfile.findOne({ userId });
    
    // Function to compute score locally for the response
    const calculateLocalScore = (my, their) => {
      if (!my || !their) return 0;
      let score = 0;
      const diff = Math.abs(my.budget - their.budget);
      if (diff <= 2000) score += 30; else if (diff <= 5000) score += 15;
      if (my.smoking === their.smoking) score += 15;
      if (my.sleepSchedule === their.sleepSchedule) score += 15;
      if (my.cleanliness === their.cleanliness) score += 10;
      if (my.department === their.department) score += 15;
      const myHobbies = my.hobbies.map(h => h.toLowerCase());
      const theirHobbies = their.hobbies.map(h => h.toLowerCase());
      const common = myHobbies.filter(h => theirHobbies.includes(h)).length;
      score += Math.min(common * 5, 15);
      return Math.min(score, 100);
    };

    const receivedWithScores = await Promise.all(received.map(async (r) => {
      const senderProfile = await RoommateProfile.findOne({ userId: r.senderId._id });
      return {
        ...r.toObject(),
        matchScore: calculateLocalScore(myProfile, senderProfile)
      };
    }));

    res.json({
      success: true,
      data: {
        received: receivedWithScores,
        sent: sent
      }
    });
  } catch (err) {
    next(err);
  }
};
