const express = require("express");
const { createTask, assignTaskMembers, listTasksForProject } = require("../controllers/taskController");

const router = express.Router();

router.post("/:projectId/tasks", createTask);
router.get("/:projectId/tasks", listTasksForProject);
router.patch("/:projectId/tasks/:taskId/assign", assignTaskMembers);

module.exports = router;
