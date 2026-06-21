require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User.model');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ role: { $in: ['admin', 'teacher', 'security'] } }).select('email role passwordHash status');
    console.log("Teacher Hash:", users.find(u => u.role === 'teacher')?.passwordHash);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
checkUsers();
