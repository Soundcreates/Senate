const mongoose = require("mongoose");

const TeamMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, trim: true },
    role: { type: String, trim: true },
    match: { type: Number, default: 0 },
    avatar: { type: String, default: "👨‍💻" },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

const ProjectTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    estimatedHours: { type: Number, default: 0 },
    dueDate: { type: Date, default: null },
    status: { type: String, default: "todo" },
    assignees: [TeamMemberSchema],
    githubIssueNumber: { type: Number, default: null },
    githubIssueUrl: { type: String, default: null },
    githubBranch: { type: String, default: null },
  },
  { _id: true }
);

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    owner: { type: String, trim: true, default: "" },
    repo: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    budget: { type: Number, default: 0 },
    deadline: { type: String, trim: true },
    teamSize: { type: Number, default: 3 },
    team: [TeamMemberSchema],
    tasks: [ProjectTaskSchema],
    status: { type: String, enum: ["active", "completed", "pending"], default: "active" },
    escrowAddress: { type: String, trim: true, default: null },
    escrowTxHash: { type: String, trim: true, default: null },
    escrowChainId: { type: Number, default: null },
  },
  { timestamps: true }
);

ProjectSchema.index({ createdBy: 1, createdAt: -1 });
ProjectSchema.index({ members: 1 });

module.exports = mongoose.model("Project", ProjectSchema);
