const mongoose = require('mongoose');
const LostItem = require('./src/models/LostItem.model.js');
const User = require('./src/models/User.model.js');
const pushNotification = require('./src/utils/pushNotification.js');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_hub')
  .then(async () => {
    // get a student
    const student = await User.findOne({ role: 'student' });
    if (!student) { console.log('no student found'); return mongoose.disconnect(); }

    const item = await LostItem.create({
      foundById: student._id,
      title: "Test Item from script",
      description: "testing notifications",
      locationFound: "Library",
      imageUrl: "http://example.com/test.jpg",
      status: "pending_approval",
    });

    console.log("Item created:", item._id);

    // This is the EXACT code from lostFound.controller.js
    const admins = await User.find({ role: "admin" }).select("_id");
    console.log(`Found ${admins.length} admins.`);
    
    // We can't actually emit socket from script easily since the socket server is running in the main process,
    // pushNotification will save it to the DB but the emit might go nowhere since getIO() might throw if socket is not initialized in THIS process!
    // Wait, pushNotification calls getIO(). If I run this script, getIO() will throw!
    
    mongoose.disconnect();
  });
