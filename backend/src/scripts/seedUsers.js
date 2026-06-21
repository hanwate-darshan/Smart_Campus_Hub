require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const bcrypt = require('bcrypt');



const usersToCreate = [
  // --- ADMINS ---
  {
    name: "Darshan Admin",
    email: "darshanmrh12@gmail.com",
    password: "Darshan123",
    role: "admin",
    status: "approved",
  },
  {
    name: "Vivek Admin",
    email: "vivekshitole017@gmail.com",
    password: "Vivek123",
    role: "admin",
    status: "approved",
  },
  {
    name: "Pradnya Admin",
    email: "pawarpradnya2004@gmail.com",
    password: "Pradnya123",
    role: "admin",
    status: "approved",
  },
  {
    name: "Shivani Admin",
    email: "shivanishirsat50@gmail.com",
    password: "Shivani123",
    role: "admin",
    status: "approved",
  },

  // --- TEACHERS ---
  {
    name: "Teacher Account",
    email: "snapchat12snapgg@gmail.com",
    password: "snapchat12",
    role: "teacher",
    status: "approved",
  },

  // --- SECURITY ---
  {
    name: "Security Account",
    email: "godfather2005.in@gmail.com",
    password: "snapchat12",
    role: "security",
    status: "approved",
  }
];

const seedUsers = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log(" Connected to MongoDB for seeding...");
    }

    for (const userData of usersToCreate) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(` User already exists: ${userData.email} (${userData.role}) - Skipping.`);
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(userData.password, salt);

      const newUser = new User({
        name: userData.name,
        email: userData.email,
        passwordHash: passwordHash,
        role: userData.role,
        status: userData.status,
        createdByAdmin: true,
        lastLocation: {
          type: "Point",
          coordinates: [0, 0]
        }
      });

      await newUser.save();
      console.log(`🚀 User created successfully: ${userData.email} [Role: ${userData.role}]`);
    }

    console.log("\n✨ Seeding completed successfully!");
  } catch (err) {
    console.error("❌ Error seeding users:", err.message);
  }
};

// If run directly via CLI
if (require.main === module) {
  seedUsers().then(() => process.exit(0));
}

module.exports = seedUsers;
