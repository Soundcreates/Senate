const express = require("express");
const { createProject, listProjects, getTodayActivity, getHistoryActivity } = require("../controllers/projectController");

const router = express.Router();

router.post("/create", createProject);
router.get("/", listProjects);
router.get("/:projectId/activity/today", getTodayActivity);
router.get("/:projectId/activity/history", getHistoryActivity);

module.exports = router;
