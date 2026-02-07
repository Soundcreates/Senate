const express = require("express");
const oauthRouter = require("./oauthRoutes");
const resumeRouter = require("./resumeRoutes");
const router = express.Router();

router.use("/oauth", oauthRouter);
router.use("/resume", resumeRouter);

module.exports = router;
