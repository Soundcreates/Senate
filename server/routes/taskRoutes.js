const express = require("express");
const { createTask, assignTaskMembers, listTasksForProject, getTaskDetails } = require("../controllers/taskController");

const router = express.Router();

router.post("/:projectId/tasks", createTask);
router.get("/:projectId/tasks", listTasksForProject);
router.get("/:projectId/tasks/:taskId/details", getTaskDetails);
router.patch("/:projectId/tasks/:taskId/assign", assignTaskMembers);

module.exports = router;
