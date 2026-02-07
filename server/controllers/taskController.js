const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/UserSchema");

const parseCookies = (req) => {
  const raw = req.headers.cookie;
  if (!raw) return {};
  return raw.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const getSessionUser = async (req) => {
  const cookies = parseCookies(req);
  const userId = cookies.session_user;
  if (!userId) return null;
  return User.findById(userId);
};

const createTask = async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: "no_session" });
    }

    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "project_not_found" });
    }

    const title = (req.body?.title || "").trim();
    if (!title) {
      return res.status(400).json({ error: "task_title_missing" });
    }

    const description = (req.body?.description || "").trim();
    const status = (req.body?.status || "todo").trim();

    const task = await Task.create({
      projectId: project._id,
      title,
      description,
      status,
      assignees: Array.isArray(req.body?.assignees) ? req.body.assignees : [],
      createdBy: sessionUser._id,
    });

    return res.status(201).json({ ok: true, task });
  } catch (error) {
    console.error("Task create failed:", {
      message: error.message,
      code: error.code,
    });
    return res.status(500).json({ error: "task_create_failed" });
  }
};

const assignTaskMembers = async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: "no_session" });
    }

    const { projectId, taskId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "project_not_found" });
    }

    const assignees = Array.isArray(req.body?.assignees) ? req.body.assignees : [];
    if (!assignees.length) {
      return res.status(400).json({ error: "assignees_missing" });
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, projectId: project._id },
      { assignees },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: "task_not_found" });
    }

    return res.status(200).json({ ok: true, task });
  } catch (error) {
    console.error("Assign members failed:", {
      message: error.message,
      code: error.code,
    });
    return res.status(500).json({ error: "task_assign_failed" });
  }
};

const listTasksForProject = async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: "no_session" });
    }

    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "project_not_found" });
    }

    const tasks = await Task.find({ projectId: project._id }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ ok: true, tasks });
  } catch (error) {
    console.error("Task list failed:", {
      message: error.message,
      code: error.code,
    });
    return res.status(500).json({ error: "task_list_failed" });
  }
};

module.exports = { createTask, assignTaskMembers, listTasksForProject };
