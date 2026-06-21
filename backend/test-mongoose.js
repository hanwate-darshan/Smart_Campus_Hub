require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('./src/models/Listing.model');
const User = require('./src/models/User.model');

async function testListing() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const seller = await User.findOne({ role: 'student' });
    if (!seller) {
      console.log("No student found");
      process.exit();
    }
    
    console.log("Seller ID:", seller._id);
    
    const listing = new Listing({
      sellerId: seller._id,
      title: "Test Listing",
      description: "Test Description",
      price: 100,
      category: "books",
      images: ["https://example.com/image.jpg"],
      status: "pending"
    });
    
    await listing.validate();
    console.log("Validation passed");
    
    await listing.save();
    console.log("Listing saved successfully!");
  } catch (err) {
    console.error("Error:", err.stack || err);
  } finally {
    process.exit();
  }
}
testListing();
