const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/UserSchema");
const { createIssue, checkCollaborator, addCollaborator, assignIssue } = require("../services/githubService");

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

/**
 * Resolve assignee names to GitHub usernames.
 * Looks up each name in the project team or in the User collection.
 */
const resolveGitHubUsernames = async (assigneeNames, token, project) => {
  const ghUsernames = [];
  for (const name of assigneeNames) {
    // Try to find a User with matching name who has a githubUsername
    const user = await User.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { githubUsername: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      ],
      githubUsername: { $ne: null },
    });
    if (user?.githubUsername) {
      ghUsernames.push(user.githubUsername);
    }
  }
  return ghUsernames;
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
    const assigneeNames = Array.isArray(req.body?.assignees) ? req.body.assignees : [];

    const task = await Task.create({
      projectId: project._id,
      title,
      description,
      status,
      assignees: assigneeNames,
      createdBy: sessionUser._id,
    });

    // --- GitHub integration: create issue and assign ---
    const token = sessionUser.githubTokens?.accessToken;
    if (token && project.owner && project.repo) {
      try {
        // Resolve GitHub usernames for assignees
        const ghAssignees = await resolveGitHubUsernames(assigneeNames, token, project);

        // Ensure assignees are collaborators
        for (const ghUsername of ghAssignees) {
          try {
            const isCollab = await checkCollaborator(project.owner, project.repo, ghUsername, token);
            if (!isCollab) {
              const result = await addCollaborator(project.owner, project.repo, ghUsername, token);
              console.log(`[GitHub] Collaborator ${result.status}: ${ghUsername} on ${project.owner}/${project.repo}`);
            }
          } catch (collabErr) {
            console.warn(`[GitHub] Failed to add collaborator ${ghUsername}:`, collabErr.message);
          }
        }

        // Create the GitHub issue
        const issueBody = description || "";
        const issue = await createIssue(project.owner, project.repo, title, issueBody, token);

        // Assign if we have GitHub usernames
        if (ghAssignees.length > 0) {
          await assignIssue(project.owner, project.repo, issue.number, ghAssignees, token);
        }

        // Update task with GitHub issue info
        task.githubIssueNumber = issue.number;
        task.githubIssueUrl = issue.html_url;
        await task.save();

        console.log(`[GitHub] Issue #${issue.number} created for task "${title}" → assigned to [${ghAssignees.join(", ")}]`);
      } catch (ghErr) {
        console.warn("[GitHub] Issue creation failed (non-blocking):", ghErr.message);
      }
    }

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

    // --- GitHub integration: update issue assignees ---
    const token = sessionUser.githubTokens?.accessToken;
    if (token && project.owner && project.repo && task.githubIssueNumber) {
      try {
        const ghAssignees = await resolveGitHubUsernames(assignees, token, project);

        // Ensure new assignees are collaborators
        for (const ghUsername of ghAssignees) {
          try {
            const isCollab = await checkCollaborator(project.owner, project.repo, ghUsername, token);
            if (!isCollab) {
              const result = await addCollaborator(project.owner, project.repo, ghUsername, token);
              console.log(`[GitHub] Collaborator ${result.status}: ${ghUsername} on ${project.owner}/${project.repo}`);
            }
          } catch (collabErr) {
            console.warn(`[GitHub] Failed to add collaborator ${ghUsername}:`, collabErr.message);
          }
        }

        // Update the GitHub issue assignees
        if (ghAssignees.length > 0) {
          await assignIssue(project.owner, project.repo, task.githubIssueNumber, ghAssignees, token);
          console.log(`[GitHub] Issue #${task.githubIssueNumber} reassigned to [${ghAssignees.join(", ")}]`);
        }
      } catch (ghErr) {
        console.warn("[GitHub] Issue assignment update failed (non-blocking):", ghErr.message);
      }
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
