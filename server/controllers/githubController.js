const { getRecentCommits } = require("../services/githubService");
const { getSessionUserFromRequest } = require("../utils/sessionAuth");

const getRecentGithubCommits = async (req, res) => {
  try {
    const sessionUser = await getSessionUserFromRequest(req);
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
