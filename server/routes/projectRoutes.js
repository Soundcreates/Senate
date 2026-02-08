const express = require("express");
const { createProject, createFullProject, getProjectById, listProjects, getTodayActivity, getHistoryActivity, linkEscrow, getProjectCodingStats, getProjectCompletionStats } = require("../controllers/projectController");
const { getTaskDetails } = require("../controllers/taskController");

const router = express.Router();

router.post("/create", createProject);
router.post("/create-full", createFullProject);
router.get("/", listProjects);
router.get("/:projectId", getProjectById);
router.get("/:projectId/coding-stats", getProjectCodingStats);
router.get("/:projectId/completion-stats", getProjectCompletionStats);
router.get("/:projectId/tasks/:taskId/details", getTaskDetails);
router.get("/:projectId/activity/today", getTodayActivity);
router.get("/:projectId/activity/history", getHistoryActivity);
router.post("/:projectId/escrow", linkEscrow);

module.exports = router;
