const express = require("express");
const oauthRouter = require("./oauthRoutes");
const resumeRouter = require("./resumeRoutes");
const projectRouter = require("./projectRoutes");
const taskRouter = require("./taskRoutes");
const geminiRouter = require("./geminiRoutes");
const recommendationRouter = require("./recommendationRoutes");
const adminAuthRouter = require("./authRoutes");
const githubRouter = require("./githubRoutes");
const adminDashboardRouter = require("./adminDashboardRoutes");
const router = express.Router();
const StatRouter = require("./statRoutes");

router.use("/oauth", oauthRouter);
router.use("/resume", resumeRouter);
router.use("/stats", StatRouter);
router.use("/projects", projectRouter);
router.use("/tasks", taskRouter);
router.use("/admin-auth", adminAuthRouter);
router.use("/auth", adminAuthRouter);
router.use("/github", githubRouter);
router.use("/admin-dashboard", adminDashboardRouter);

router.use("/gemini", geminiRouter);
router.use("/recommendations", recommendationRouter);

module.exports = router;
