const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/issue-tracker",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ isSuperAdmin: true });
    if (existingSuperAdmin) {
      console.log("Superadmin already exists");
      process.exit(0);
    }

    // Create superadmin user
    const superAdmin = new User({
      email: "admin@issuetracker.com",
      password: "admin123", // This will be hashed automatically by the User model
      name: "System Admin",
      isSuperAdmin: true,
    });

    await superAdmin.save();
    console.log("Superadmin created successfully");
    console.log("Email: admin@issuetracker.com");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Error creating superadmin:", error);
  } finally {
    await mongoose.disconnect();
  }
};

createSuperAdmin();
