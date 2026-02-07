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
    avatarUrl: { type: String, trim: true },
    provider: { type: String, trim: true },
    githubId: { type: String, trim: true },
    wakatimeId: { type: String, trim: true },
    wakatimeTokens: { type: TokenSchema, default: () => ({}) },
    githubTokens: { type: TokenSchema, default: () => ({}) },
    resume: {type: String, default: null},
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
