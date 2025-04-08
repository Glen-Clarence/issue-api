const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");

// Get comments for an issue
router.get("/issue/:issueId", async (req, res) => {
  try {
    const comments = await Comment.find({ issue: req.params.issueId }).sort({
      createdAt: 1,
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create comment
router.post("/", async (req, res) => {
  const comment = new Comment({
    issue: req.body.issueId,
    content: req.body.content,
    author: req.body.author,
  });

  try {
    const newComment = await comment.save();
    res.status(201).json(newComment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update comment
router.patch("/:id", async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (req.body.content) {
      comment.content = req.body.content;
      comment.updatedAt = Date.now();
    }

    const updatedComment = await comment.save();
    res.json(updatedComment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete comment
router.delete("/:id", async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    await comment.deleteOne();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
