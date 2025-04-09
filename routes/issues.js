const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Issue = require("../models/Issue");
const Project = require("../models/Project");
const { auth } = require("../middleware/auth");
const isSuperAdmin = require("../middleware/isSuperAdmin");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Serve uploaded files
router.get("/uploads/:filename", (req, res) => {
  const filename = req.params.filename;
  res.sendFile(path.join(__dirname, "../uploads", filename));
});

// Get all issues for a project
router.get("/project/:projectId", auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, priority, type, assignee } = req.query;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (
      !project.members.includes(req.user.id) &&
      !project.owner.equals(req.user.id)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { project: projectId };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.type = type;
    if (assignee) query.assignee = assignee;

    const issues = await Issue.find(query)
      .populate("author", "name email")
      .populate("assignee", "name email")
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching issues", error: error.message });
  }
});

// Create a new issue
router.post("/", auth, upload.array("attachments"), async (req, res) => {
  try {
    const { title, description, priority, status, type, projectId, assignees } =
      req.body;

    console.log("Creating issue with data:", req.body);

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Create the issue
    const issue = new Issue({
      title,
      description,
      priority: priority || "Low",
      status: status || "Open",
      type: type || "task",
      project: projectId,
      author: req.user.id,
      assignees: assignees ? JSON.parse(assignees) : [],
    });

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      issue.attachments = req.files.map((file) => file.filename);
    }

    await issue.save();

    // Populate the author and assignees
    await issue.populate([
      { path: "author", select: "name email" },
      { path: "assignees", select: "name email" },
    ]);

    res.status(201).json(issue);
  } catch (error) {
    console.error("Error creating issue:", error);
    res.status(500).json({
      message: "Error creating issue",
      error: error.message,
      stack: error.stack,
    });
  }
});

// Add a comment to an issue
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const project = await Project.findById(issue.project);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user has access to the project
    const hasAccess =
      req.user.isSuperAdmin ||
      project.members.some(
        (member) => member.user.toString() === req.user.id.toString()
      ) ||
      project.createdBy.toString() === req.user.id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { content } = req.body;
    const newComment = {
      content,
      author: req.user.id,
      createdAt: new Date(),
    };

    issue.comments.push(newComment);
    await issue.save();

    // Populate the author information for the new comment
    await issue.populate("comments.author", "name email");
    const addedComment = issue.comments[issue.comments.length - 1];

    res.status(201).json(addedComment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res
      .status(500)
      .json({ message: "Error adding comment", error: error.message });
  }
});

// Edit a comment
router.patch("/:issueId/comments/:commentId", auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.issueId);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const comment = issue.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Only allow comment author to edit their comment
    if (comment.author.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only edit your own comments" });
    }

    comment.content = req.body.content;
    comment.updatedAt = new Date();

    await issue.save();
    await issue.populate("comments.author", "name email");

    res.json(comment);
  } catch (error) {
    console.error("Error updating comment:", error);
    res
      .status(500)
      .json({ message: "Error updating comment", error: error.message });
  }
});

// Delete a comment
router.delete("/:issueId/comments/:commentId", auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.issueId);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const comment = issue.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Only allow comment author to delete their comment
    if (comment.author.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only delete your own comments" });
    }

    comment.deleteOne();
    await issue.save();

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res
      .status(500)
      .json({ message: "Error deleting comment", error: error.message });
  }
});

// Get a single issue by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate("author", "name email")
      .populate("assignees", "name email")
      .populate("comments.author", "name email");

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const project = await Project.findById(issue.project);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user has access to the project
    const hasAccess =
      req.user.isSuperAdmin ||
      project.members.some((member) => member.user.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(issue);
  } catch (error) {
    console.error("Error fetching issue:", error);
    res
      .status(500)
      .json({ message: "Error fetching issue", error: error.message });
  }
});

// Update an issue
router.patch("/:id", auth, upload.array("attachments"), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const project = await Project.findById(issue.project);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user has access to the project
    const hasAccess =
      req.user.isSuperAdmin ||
      project.members.some((member) => member.user.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updates = req.body;
    Object.keys(updates).forEach((update) => {
      if (update !== "_id" && update !== "project" && update !== "author") {
        issue[update] = updates[update];
      }
    });

    if (req.files && req.files.length > 0) {
      if (!issue.attachments) {
        issue.attachments = [];
      }
      issue.attachments.push(...req.files.map((file) => file.filename));
    }

    await issue.save();
    await issue.populate([
      { path: "author", select: "name email" },
      { path: "assignees", select: "name email" },
    ]);
    res.json(issue);
  } catch (error) {
    console.error("Error updating issue:", error);
    res
      .status(500)
      .json({ message: "Error updating issue", error: error.message });
  }
});

// Delete an issue
router.delete("/:id", auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const project = await Project.findById(issue.project);
    if (!project.owner.equals(req.user.id)) {
      return res
        .status(403)
        .json({ message: "Only project owner can delete issues" });
    }

    // Delete associated files
    if (issue.attachments && issue.attachments.length > 0) {
      issue.attachments.forEach((filename) => {
        const filePath = path.join(__dirname, "../uploads", filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await issue.deleteOne();
    res.json({ message: "Issue deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting issue", error: error.message });
  }
});

module.exports = router;
