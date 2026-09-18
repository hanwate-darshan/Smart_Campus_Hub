const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Node.js 20+ / Windows / Render DNS resolution with MongoDB Atlas SRV records
try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (err) {
    console.warn('Could not set custom DNS servers:', err.message);
}

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

