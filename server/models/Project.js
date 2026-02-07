const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    repo: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
  
);

module.exports = mongoose.model("Project", ProjectSchema);
