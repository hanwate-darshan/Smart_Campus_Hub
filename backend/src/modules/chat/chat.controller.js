const ChatRoom = require("../../models/ChatRoom.model");
const Message = require("../../models/Message.model");
const Listing = require("../../models/Listing.model");
const User = require("../../models/User.model");

// Route 1: Create or Get Chat Room
exports.createRoom = async (req, res, next) => {
  try {
    const { listingId } = req.body;
    const buyerId = req.user._id;

    // Validate listing
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found" });
    if (listing.status !== "approved") {
      return res.status(403).json({ success: false, error: "Can only chat about approved items" });
    }

    // Check if seller
    if (listing.sellerId.toString() === buyerId.toString()) {
      return res.status(400).json({ success: false, error: "You cannot start a chat with yourself" });
    }

    // Check for existing room
    let room = await ChatRoom.findOne({
      listingId,
      participants: { $all: [buyerId, listing.sellerId] }
    });

    if (room) {
      return res.json({ success: true, data: room });
    }

    // Create new room
    room = await ChatRoom.create({
      listingId,
      participants: [buyerId, listing.sellerId],
      type: "marketplace"
    });

    res.status(201).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// Route 2: Get My Chat Rooms
exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await ChatRoom.find({ participants: req.user._id })
      .populate("participants", "name")
      .populate("listingId", "title")
      .sort({ lastMessageAt: -1 });

    const formatted = rooms.map(room => {
      const otherUser = room.participants.find(p => p._id.toString() !== req.user._id.toString());
      return {
        _id: room._id,
        type: room.type,
        lastMessage: room.lastMessage,
        lastMessageAt: room.lastMessageAt,
        isLocked: room.isLocked,
        listingTitle: room.listingId?.title || "N/A",
        otherParticipantName: otherUser?.name || "Unknown"
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
};

// Route 3: Get Room Messages
exports.getMessages = async (req, res, next) => {
  try {
    const { id: roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify participation
    const room = await ChatRoom.findOne({ _id: roomId, participants: req.user._id });
    if (!room) return res.status(403).json({ success: false, error: "Access denied" });

    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 }) // Newest first for DB fetch
      .skip(skip)
      .limit(parseInt(limit))
      .populate("senderId", "name");

    // Mark as read
    await Message.updateMany(
      { roomId, senderId: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ 
      success: true, 
      data: messages.reverse() // Reverse for UI display (oldest to newest)
    });
  } catch (err) {
    next(err);
  }
};
