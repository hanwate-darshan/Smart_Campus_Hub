require('dotenv').config();
const fs = require('fs');
const jwt = require('jsonwebtoken');

async function testListing() {
  try {
    const mongoose = require('mongoose');
    const User = require('./src/models/User.model');
    await mongoose.connect(process.env.MONGO_URI);
    
    const user = await User.findOne({ role: 'student' });
    if (!user) {
        console.log("No student found");
        process.exit();
    }
    
    const token = jwt.sign({ id: user._id, role: user.role, status: user.status }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    const formData = new FormData();
    formData.append('title', 'Test Book');
    formData.append('description', 'Test Description');
    formData.append('price', '100');
    formData.append('category', 'books');
    
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    formData.append('images', new Blob([buffer], { type: 'image/png' }), 'test.png');
    
    const response = await fetch('http://127.0.0.1:5000/api/listings', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Failed:", err);
  } finally {
      process.exit();
  }
}
testListing();
