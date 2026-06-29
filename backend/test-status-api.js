require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User.model');
const Complaint = require('./src/models/Complaint.model');
const jwt = require('jsonwebtoken');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const admin = await User.findOne({ role: 'teacher' }) || await User.findOne({ role: 'admin' });
    const complaint = await Complaint.findOne({ status: 'in_progress' });
    if (!complaint) {
      console.log("No in_progress complaint");
      process.exit(0);
    }

    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log("Updating complaint:", complaint._id);
    const res = await fetch(`http://localhost:5000/api/complaints/${complaint._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: 'resolved',
        comment: 'Testing from script'
      })
    });
    const data = await res.json();
    console.log("Success:", data);
  } catch (err) {
    console.error("FAILED:", err.message);
  }
  process.exit(0);
}

run();
