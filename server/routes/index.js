const express = require("express");
const oauthRouter = require("./oauthRoutes");
const router = express.Router();

router.use("/oauth", oauthRouter);

module.exports = router;
