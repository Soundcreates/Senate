const express = require("express");
const { createProject, createFullProject, getProjectById, listProjects, getTodayActivity, getHistoryActivity } = require("../controllers/projectController");

const router = express.Router();

router.post("/create", createProject);
router.post("/create-full", createFullProject);
router.get("/", listProjects);
router.get("/:projectId", getProjectById);
router.get("/:projectId/activity/today", getTodayActivity);
router.get("/:projectId/activity/history", getHistoryActivity);

module.exports = router;
