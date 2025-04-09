const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      isSuperAdmin: false, // Default to false
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { userId: user._id, isSuperAdmin: user.isSuperAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating user", error: error.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id, isSuperAdmin: user.isSuperAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

// Get current user
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      _id: user._id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
