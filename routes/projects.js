const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const User = require("../models/User");
const Issue = require("../models/Issue");
const Milestone = require("../models/Milestone");
const { auth } = require("../middleware/auth");
const isSuperAdmin = require("../middleware/isSuperAdmin");

// Get all projects (with stats)
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    let projects;

    if (user.isSuperAdmin) {
      projects = await Project.find()
        .populate("members.user", "email name")
        .populate("createdBy", "email name");
    } else {
      projects = await Project.find({
        "members.user": req.user.id,
      })
        .populate("members.user", "email name")
        .populate("createdBy", "email name");
    }

    // Get counts for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const [issueCount, milestoneCount] = await Promise.all([
          Issue.countDocuments({ project: project._id }),
          Milestone.countDocuments({ project: project._id }),
        ]);

        return {
          ...project.toObject(),
          issueCount,
          milestoneCount,
        };
      })
    );

    res.json(projectsWithCounts);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res
      .status(500)
      .json({ message: "Error fetching projects", error: error.message });
  }
});

// Create new project (superadmin only)
router.post("/", auth, isSuperAdmin, async (req, res) => {
  try {
    const { name, description, members } = req.body;

    const project = new Project({
      name,
      description,
      members: members || [],
      createdBy: req.user.id,
    });

    const savedProject = await project.save();

    // Update user roles for the project
    if (members && members.length > 0) {
      await Promise.all(
        members.map((member) =>
          User.findByIdAndUpdate(member.user, {
            $push: {
              projectRoles: {
                project: savedProject._id,
                role: member.role,
              },
            },
          })
        )
      );
    }

    res.status(201).json(savedProject);
  } catch (error) {
    res.status(400).json({ message: "Error creating project" });
  }
});

// Middleware to check if user has access to project
const checkProjectAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.isSuperAdmin) return next();

    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking permissions" });
  }
};

// Get project details
router.get("/:projectId", auth, checkProjectAccess, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate("members.user", "email name")
      .populate("createdBy", "email name");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const [issueCount, milestoneCount] = await Promise.all([
      Issue.countDocuments({ project: project._id }),
      Milestone.countDocuments({ project: project._id }),
    ]);

    res.json({
      ...project.toObject(),
      issueCount,
      milestoneCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching project" });
  }
});

// Update project (superadmin only)
router.patch("/:projectId", auth, isSuperAdmin, async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Update basic info
    if (name) project.name = name;
    if (description) project.description = description;

    // Update members if provided
    if (members) {
      // Remove old project roles from users
      await User.updateMany(
        { "projectRoles.project": project._id },
        { $pull: { projectRoles: { project: project._id } } }
      );

      // Add new project roles to users
      await Promise.all(
        members.map((member) =>
          User.findByIdAndUpdate(member.user, {
            $push: {
              projectRoles: {
                project: project._id,
                role: member.role,
              },
            },
          })
        )
      );

      project.members = members;
    }

    const updatedProject = await project.save();
    res.json(updatedProject);
  } catch (error) {
    res.status(400).json({ message: "Error updating project" });
  }
});

// Delete project (superadmin only)
router.delete("/:projectId", auth, isSuperAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Remove project roles from users
    await User.updateMany(
      { "projectRoles.project": project._id },
      { $pull: { projectRoles: { project: project._id } } }
    );

    // Delete all issues and milestones
    await Promise.all([
      Issue.deleteMany({ project: project._id }),
      Milestone.deleteMany({ project: project._id }),
    ]);

    await project.deleteOne();
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting project" });
  }
});

// Get issues for a specific project
router.get("/:projectId/issues", auth, checkProjectAccess, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user has access to the project
    const hasAccess =
      req.user.isSuperAdmin ||
      project.members.some((member) => member.user.toString() === userId);

    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "Not authorized to view project issues" });
    }

    // Get all issues for the project
    const issues = await Issue.find({ project: projectId })
      .populate("author", "name")
      .populate("assignees", "name")
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    console.error("Error fetching project issues:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update project members
router.patch("/:projectId/members", auth, isSuperAdmin, async (req, res) => {
  try {
    const { members } = req.body;
    const projectId = req.params.projectId;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Remove old project roles from users
    await User.updateMany(
      { "projectRoles.project": project._id },
      { $pull: { projectRoles: { project: project._id } } }
    );

    // Add new project roles to users
    if (members && members.length > 0) {
      await Promise.all(
        members.map((member) =>
          User.findByIdAndUpdate(member.user, {
            $push: {
              projectRoles: {
                project: project._id,
                role: member.role || "member",
              },
            },
          })
        )
      );

      project.members = members;
    }

    await project.save();
    await project.populate("members.user", "name email");
    res.json(project);
  } catch (error) {
    console.error("Error updating project members:", error);
    res.status(500).json({ message: "Error updating project members" });
  }
});

// Add single member to project
router.post("/:projectId/members", auth, isSuperAdmin, async (req, res) => {
  try {
    const { userId, role = "member" } = req.body;
    const projectId = req.params.projectId;

    console.log("Adding member:", { userId, role, projectId });

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already a member
    if (project.members.some((member) => member.user.toString() === userId)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    // Add new member
    project.members.push({
      user: userId,
      role: role,
    });

    // Add project role to user
    await User.findByIdAndUpdate(userId, {
      $push: {
        projectRoles: {
          project: project._id,
          role: role,
        },
      },
    });

    await project.save();
    await project.populate([
      { path: "members.user", select: "name email" },
      { path: "createdBy", select: "name email" },
    ]);

    res.json(project);
  } catch (error) {
    console.error("Error adding project member:", error);
    res
      .status(500)
      .json({ message: "Error adding project member", error: error.message });
  }
});

// Remove member from project
router.delete(
  "/:projectId/members/:userId",
  auth,
  isSuperAdmin,
  async (req, res) => {
    try {
      const { projectId, userId } = req.params;

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Remove member from project
      project.members = project.members.filter(
        (member) => member.user.toString() !== userId
      );

      // Remove project role from user
      await User.findByIdAndUpdate(userId, {
        $pull: {
          projectRoles: { project: project._id },
        },
      });

      await project.save();
      await project.populate("members.user", "name email");
      res.json(project);
    } catch (error) {
      console.error("Error removing project member:", error);
      res.status(500).json({ message: "Error removing project member" });
    }
  }
);

module.exports = router;
