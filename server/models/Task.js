const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, trim: true, default: "todo" },
    assignees: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    githubIssueNumber: { type: Number, default: null },
    githubIssueUrl: { type: String, default: null },
    githubBranch: { type: String, default: null },
    dueDate: { type: Date, default: null },
    estimatedHours: { type: Number, default: 0 },
    
    // Payment tracking
    paymentStatus: { type: String, enum: ["unpaid", "pending", "processing", "paid", "failed"], default: "unpaid" },
    paymentMethod: { type: String, enum: ["fiat", "crypto"], default: null },
    hasPayments: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TaskSchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.model("Task", TaskSchema);
