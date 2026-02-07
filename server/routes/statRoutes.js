const express = require("express");
const { getWakatimeStats } = require("../controllers/statController");
const StatRouter = express.Router();

StatRouter.get("/wakatime-stats", getWakatimeStats);

module.exports = StatRouter;