const express = require("express");
const oauthRouter = require("./oauthRoutes");
const resumeRouter = require("./resumeRoutes");
const projectRouter = require("./projectRoutes");
const router = express.Router();
const StatRouter = require("./statRoutes");

router.use("/oauth", oauthRouter);
router.use("/resume", resumeRouter);
router.use("/stats", StatRouter);
router.use("/projects", projectRouter);


module.exports = router;
