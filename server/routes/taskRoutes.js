const express = require("express");
const { createTask, assignTaskMembers } = require("../controllers/taskController");

const router = express.Router();

router.post("/:projectId/tasks", createTask);
router.patch("/:projectId/tasks/:taskId/assign", assignTaskMembers);

module.exports = router;
