const express = require("express");
const { getRecentGithubCommits } = require("../controllers/githubController");

const router = express.Router();

router.get("/commits/recent", getRecentGithubCommits);

module.exports = router;
