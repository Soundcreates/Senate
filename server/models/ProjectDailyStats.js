const mongoose = require("mongoose");

const CommitSchema = new mongoose.Schema(
  {
    githubId: { type: String, trim: true },
    username: { type: String, trim: true },
    commitSha: { type: String, trim: true },
    message: { type: String, trim: true },
    timestamp: { type: Date },
  },
  { _id: false }
);

const ProjectDailyStatsSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    date: { type: String, required: true, trim: true },
    commits: { type: [CommitSchema], default: [] },
    commitsCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ProjectDailyStatsSchema.index({ projectId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("ProjectDailyStats", ProjectDailyStatsSchema);
