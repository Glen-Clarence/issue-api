const express = require("express");
const router = express.Router();
const Milestone = require("../models/Milestone");

// Get all milestones
router.get("/", async (req, res) => {
  try {
    const milestones = await Milestone.find().sort({ createdAt: -1 });
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single milestone
router.get("/:id", async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone)
      return res.status(404).json({ message: "Milestone not found" });
    res.json(milestone);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create milestone
router.post("/", async (req, res) => {
  const milestone = new Milestone({
    title: req.body.title,
    description: req.body.description,
    dueDate: req.body.dueDate,
  });

  try {
    const newMilestone = await milestone.save();
    res.status(201).json(newMilestone);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update milestone
router.patch("/:id", async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone)
      return res.status(404).json({ message: "Milestone not found" });

    if (req.body.title) milestone.title = req.body.title;
    if (req.body.description) milestone.description = req.body.description;
    if (req.body.dueDate) milestone.dueDate = req.body.dueDate;
    if (req.body.status) milestone.status = req.body.status;

    milestone.updatedAt = Date.now();

    const updatedMilestone = await milestone.save();
    res.json(updatedMilestone);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete milestone
router.delete("/:id", async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone)
      return res.status(404).json({ message: "Milestone not found" });

    await milestone.remove();
    res.json({ message: "Milestone deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
