const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Project = require("../models/Project");
const { auth } = require("../middleware/auth");
const isSuperAdmin = require("../middleware/isSuperAdmin");

// Get all users (superadmin only)
router.get("/", auth, isSuperAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
});

// Get user by ID
router.get("/:userId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only allow superadmins or the user themselves to view details
    if (
      !req.user.isSuperAdmin &&
      req.user._id.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
});

// Update user (superadmin or self only)
router.patch("/:userId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only allow superadmins or the user themselves to update
    if (
      !req.user.isSuperAdmin &&
      req.user._id.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (email) updates.email = email;

    // Only superadmins can update isSuperAdmin status
    if (req.user.isSuperAdmin && req.body.isSuperAdmin !== undefined) {
      updates.isSuperAdmin = req.body.isSuperAdmin;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updates },
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating user", error: error.message });
  }
});

// Delete user (superadmin only)
router.delete("/:userId", auth, isSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove user from all projects
    await Project.updateMany(
      { "members.userId": user._id },
      { $pull: { members: { userId: user._id } } }
    );

    // Delete the user
    await User.findByIdAndDelete(req.params.userId);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
});

// Get projects for a specific user
router.get("/:userId/projects", auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Fetching projects for user:", userId);

    // Check if the requesting user is authorized
    if (req.user.id !== userId && !req.user.isSuperAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to view these projects" });
    }

    // If superadmin, return all projects
    if (req.user.isSuperAdmin) {
      const projects = await Project.find()
        .populate("members.user", "name email")
        .populate("createdBy", "name email");
      return res.json(projects);
    }

    // For regular users, find projects where they are a member
    const projects = await Project.find({
      "members.user": userId,
    })
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    console.log("Found projects:", projects);
    res.json(projects);
  } catch (error) {
    console.error("Error fetching user projects:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
