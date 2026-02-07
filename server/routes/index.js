const express = require("express");
const oauthRouter = require("./oauthRoutes");
const resumeRouter = require("./resumeRoutes");
const geminiRouter = require("./geminiRoutes");
const router = express.Router();

router.use("/oauth", oauthRouter);
router.use("/resume", resumeRouter);
router.use("/gemini", geminiRouter);

module.exports = router;
