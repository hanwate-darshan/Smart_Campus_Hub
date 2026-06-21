const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testListing() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'darshanmrh12@gmail.com', // wait, darshan is admin. I need a student.
      password: 'Darshan123',
      role: 'admin' // wait, admin can't post listing? Let's check listing.routes.js: requireRole('student')
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
testListing();
