const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      role: {
        type: String,
        enum: ["member", "developer", "tester"],
        default: "member",
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Virtual fields will be populated from other collections
  issueCount: {
    type: Number,
    default: 0,
  },
  milestoneCount: {
    type: Number,
    default: 0,
  },
});

// Add project field to Issue model reference
projectSchema.virtual("issues", {
  ref: "Issue",
  localField: "_id",
  foreignField: "project",
});

// Add project field to Milestone model reference
projectSchema.virtual("milestones", {
  ref: "Milestone",
  localField: "_id",
  foreignField: "project",
});

projectSchema.set("toJSON", { virtuals: true });
projectSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Project", projectSchema);
