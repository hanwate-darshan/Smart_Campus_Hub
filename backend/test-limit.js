const mongoose = require('mongoose');
const LostItem = require('./src/models/LostItem.model.js');
const User = require('./src/models/User.model.js');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_hub')
  .then(async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    // Find how many items were created today by anyone
    const items = await LostItem.find({ createdAt: { $gte: startOfDay } }).populate('foundById', 'name email');
    console.log(`Total items reported today by anyone: ${items.length}`);
    
    // Group by user
    const userCounts = {};
    items.forEach(item => {
      const email = item.foundById?.email || 'Unknown';
      userCounts[email] = (userCounts[email] || 0) + 1;
    });
    
    console.log("Counts per user today:", userCounts);
    
    mongoose.disconnect();
  });
