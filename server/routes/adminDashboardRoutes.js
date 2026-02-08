const express = require("express");
// const requireAdmin = require("../middleware/requireAdmin"); // DEV BYPASS
const { getDashboardOverview } = require("../controllers/adminDashboardController");

const router = express.Router();

router.get("/overview", /* requireAdmin, */ getDashboardOverview);

module.exports = router;
