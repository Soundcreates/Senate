const User = require("../models/UserSchema");
const { getRecentCommits } = require("../services/githubService");

const parseCookies = (req) => {
  const raw = req.headers.cookie;
  if (!raw) return {};
  return raw.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const getSessionUser = async (req) => {
  const cookies = parseCookies(req);
  const userId = cookies.session_user;
  if (!userId) return null;
  return User.findById(userId);
};

const getRecentGithubCommits = async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: "no_session" });
    }

    const token = sessionUser.githubTokens?.accessToken;
    if (!token) {
      return res.status(400).json({ error: "github_not_connected" });
    }

    const limit = Number(req.query.limit) || 20;
    const commits = await getRecentCommits(token, { limit });
    return res.status(200).json({ ok: true, commits });
  } catch (error) {
    console.error("Fetch recent commits failed:", {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
    });
    if (error.details) {
      return res.status(502).json({ error: "github_commits_failed", details: error.details });
    }
    return res.status(500).json({ error: "github_commits_failed", message: error.message });
  }
};

module.exports = { getRecentGithubCommits };
