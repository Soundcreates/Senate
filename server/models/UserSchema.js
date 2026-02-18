const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema(
  {
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    scope: { type: String, default: null },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ["admin", "developer"], default: "developer" },
    passwordHash: { type: String, default: null },
    avatarUrl: { type: String, trim: true },
    provider: { type: String, trim: true },
    githubId: { type: String, trim: true },
    githubUsername: { type: String, trim: true },
    wakatimeId: { type: String, trim: true },
    wakatimeTokens: { type: TokenSchema, default: () => ({}) },
    githubTokens: { type: TokenSchema, default: () => ({}) },
    resume: {type: String, default: null},
    walletAddress: {type: String , default: null},
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    cookie: {
      value: { type: String, default: null },
      timeToLive: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
      issuedAt: {type: Date,default: Date.now},
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
