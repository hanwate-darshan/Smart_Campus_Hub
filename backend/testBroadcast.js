require("dotenv").config();
const mongoose = require("mongoose");
const Listing = require("./src/models/Listing.model");
const User = require("./src/models/User.model");
const Notification = require("./src/models/Notification.model");
const { updateListingStatus } = require("./src/modules/listing/listing.controller");

async function testBroadcast() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  // 1. Get a random student to act as seller
  const seller = await User.findOne({ role: "student", status: "approved" });
  if (!seller) {
    console.log("No student found");
    return process.exit(0);
  }

  console.log(`Using seller: ${seller.name}`);

  // 2. Create a dummy pending listing
  const listing = await Listing.create({
    sellerId: seller._id,
    title: "Dummy Test Item " + Date.now(),
    description: "Testing broadcast notifications",
    price: 999,
    category: "Electronics",
    condition: "new",
    images: ["http://dummyimage.com"],
    status: "pending"
  });

  console.log(`Created pending listing: ${listing._id}`);

  // 3. Count current notifications for a random OTHER student
  const otherStudent = await User.findOne({ role: "student", _id: { $ne: seller._id } });
  const beforeCount = await Notification.countDocuments({ userId: otherStudent._id });

  // 4. Simulate the controller call for approval
  const req = {
    params: { id: listing._id },
    body: { status: "approved" },
    user: { _id: "admin123", role: "admin", name: "Admin Test" } // mock admin
  };

  const res = {
    json: (data) => console.log("Controller response:", data),
    status: (code) => ({ json: (data) => console.log("Controller error:", code, data) })
  };
  const next = (err) => console.log("Controller exception:", err);

  console.log("Approving listing...");
  await updateListingStatus(req, res, next);

  // 5. Wait a moment for notifications to be inserted
  await new Promise(r => setTimeout(r, 2000));

  // 6. Check if other student got the notification
  const afterCount = await Notification.countDocuments({ userId: otherStudent._id });
  const newNotif = await Notification.findOne({ userId: otherStudent._id }).sort({ createdAt: -1 });

  console.log(`\n--- Test Results ---`);
  console.log(`Other student (${otherStudent.name}) notification count before: ${beforeCount}`);
  console.log(`Other student notification count after: ${afterCount}`);
  console.log(`Latest notification:`, newNotif ? newNotif.title : "None");
  console.log(`Success: ${afterCount > beforeCount}`);

  // Cleanup
  await Listing.findByIdAndDelete(listing._id);
  
  process.exit(0);
}

testBroadcast();
