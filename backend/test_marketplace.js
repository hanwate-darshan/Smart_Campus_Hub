const axios = require('axios');

async function run() {
  try {
    const login = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'snapchat12snapgg@gmail.com', // wait, is this a student? 
      password: 'Password@123'
    });
    
    // Actually, in server.js seed data:
    // darshanmrh12@gmail.com (admin)
    // snapchat12snapgg@gmail.com (teacher)
    // I need a student account to test. I will create a new student or use an existing one.
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
