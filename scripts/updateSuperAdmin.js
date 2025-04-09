const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const updateSuperAdmin = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/issue-tracker",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    // Find and update the superadmin user
    const user = await User.findOneAndUpdate(
      { email: "admin@issuetracker.com" },
      {
        $set: {
          isSuperAdmin: true,
          name: "System Admin",
        },
      },
      { new: true }
    );

    if (!user) {
      console.log("Superadmin user not found");
      return;
    }

    console.log("Superadmin updated successfully");
    console.log("Email:", user.email);
    console.log("Name:", user.name);
    console.log("isSuperAdmin:", user.isSuperAdmin);
  } catch (error) {
    console.error("Error updating superadmin:", error);
  } finally {
    await mongoose.disconnect();
  }
};

updateSuperAdmin();
