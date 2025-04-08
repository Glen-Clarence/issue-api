const express = require("express");
const router = express.Router();
const Issue = require("../models/Issue");
const Comment = require("../models/Comment");

// Get all issues
router.get("/", async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single issue
router.get("/:id", async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create issue
router.post("/", async (req, res) => {
  const issue = new Issue({
    title: req.body.title,
    description: req.body.description,
    labels: req.body.labels || [],
    assignees: req.body.assignees || [],
    milestone: req.body.milestone,
    author: req.body.author,
    status: "open",
  });

  try {
    const newIssue = await issue.save();
    res.status(201).json(newIssue);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update issue
router.patch("/:id", async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const allowedUpdates = [
      "title",
      "description",
      "status",
      "labels",
      "assignees",
      "milestone",
    ];

    // Only update fields that are sent in the request
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        issue[field] = req.body[field];
      }
    });

    issue.updatedAt = Date.now();

    const updatedIssue = await issue.save();
    res.json(updatedIssue);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete issue and its comments
router.delete("/:id", async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    // Delete all comments associated with this issue
    await Comment.deleteMany({ issue: req.params.id });

    // Delete the issue
    await issue.deleteOne();

    res.json({ message: "Issue and associated comments deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
