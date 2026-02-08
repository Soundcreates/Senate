const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/UserSchema");
const { createIssue, checkCollaborator, addCollaborator, assignIssue, getPullRequestsForIssue, getIssueDetails, getPRReviews, getBranchActivity } = require("../services/githubService");
const { getWakaTimeStats } = require("../services/wakatime-stats");

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
  if (userId) {
    const user = await User.findById(userId);
    if (user) return user;
  }
  // DEV BYPASS: fall back to first user in DB when no session
  return User.findOne();
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

/**
 * Get detailed task information including GitHub stats
 */
const getTaskDetails = async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: "no_session" });
    }

    const { projectId, taskId } = req.params;
    const task = await Task.findOne({ _id: taskId, projectId });
    if (!task) {
      return res.status(404).json({ error: "task_not_found" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "project_not_found" });
    }

    // Ensure project has GitHub repo info
    if (!project.owner || !project.repo) {
      console.log(`[Task Details] Project ${project.name} has no GitHub repo configured`);
      return res.status(400).json({ 
        error: "project_not_configured", 
        message: "Project does not have a GitHub repository configured" 
      });
    }

    // Build basic task details
    const taskDetails = {
      _id: task._id,
      title: task.title,
      description: task.description,
      status: task.status,
      assignees: task.assignees || [],
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours || 0,
      githubIssueNumber: task.githubIssueNumber,
      githubIssueUrl: task.githubIssueUrl,
      github: {
        connected: false,
        issue: null,
        prs: [],
        stats: {
          totalAdditions: 0,
          totalDeletions: 0,
          totalChangedFiles: 0,
          openPRs: 0,
          mergedPRs: 0,
        },
        codeReviewScore: 0,
        reviews: [],
        branch: null,
      },
      wakatime: {
        assigneeStats: [],
      },
    };

    // Fetch GitHub stats if available
    const token = sessionUser.githubTokens?.accessToken || process.env.GITHUB_TOKEN;
    if (!token) {
      console.log(`[Task Details] No GitHub token available`);
      return res.status(400).json({ 
        error: "github_not_connected",
        message: "GitHub token not available. Please connect GitHub or configure GITHUB_TOKEN environment variable."
      });
    }

    if (task.githubIssueNumber) {
      try {
        console.log(`[Task Details] Fetching GitHub stats for issue #${task.githubIssueNumber}...`);
        
        // Fetch issue details and PRs in parallel
        const [issueResult, prResult] = await Promise.all([
          getIssueDetails(project.owner, project.repo, task.githubIssueNumber, token),
          getPullRequestsForIssue(project.owner, project.repo, task.githubIssueNumber, token),
        ]);

        // Check if issue is deleted (404 or closed with state_reason "not_planned")
        if (issueResult.error && issueResult.status === 404) {
          console.log(`[Task Details] Issue #${task.githubIssueNumber} not found (deleted) - marking task as complete`);
          if (task.status !== 'done') {
            task.status = 'done';
            await task.save();
            taskDetails.status = 'done';
          }
          taskDetails.github.issueDeleted = true;
        } else if (!issueResult.error) {
          taskDetails.github.issue = issueResult.issue;
          
          // Check if issue was closed and deleted (state_reason: "not_planned" means closed without completion)
          // But we'll mark as complete if issue is closed in any way since user requested it
          if (issueResult.issue.state === 'closed' && task.status !== 'done') {
            console.log(`[Task Details] Issue #${task.githubIssueNumber} is closed - marking task as complete`);
            task.status = 'done';
            await task.save();
            taskDetails.status = 'done';
          }
        }

        if (!prResult.error && prResult.prs.length > 0) {
          // Fetch reviews for all PRs in parallel
          const prWithReviews = await Promise.all(
            prResult.prs.map(async (pr) => {
              const reviewResult = await getPRReviews(project.owner, project.repo, pr.number, token);
              return {
                ...pr,
                reviewScore: reviewResult.score,
                reviews: reviewResult.reviews,
                reviewSummary: reviewResult.summary,
              };
            })
          );

          taskDetails.github.prs = prWithReviews;
          taskDetails.github.stats = {
            totalAdditions: prWithReviews.reduce((sum, pr) => sum + pr.additions, 0),
            totalDeletions: prWithReviews.reduce((sum, pr) => sum + pr.deletions, 0),
            totalChangedFiles: prWithReviews.reduce((sum, pr) => sum + pr.changedFiles, 0),
            openPRs: prWithReviews.filter(pr => pr.state === 'open').length,
            mergedPRs: prWithReviews.filter(pr => pr.merged).length,
          };
          
          // Calculate average code review score
          if (prWithReviews.length > 0) {
            taskDetails.github.codeReviewScore = Math.round(
              prWithReviews.reduce((sum, pr) => sum + (pr.reviewScore || 0), 0) / prWithReviews.length
            );
          }

          // Aggregate all reviews
          taskDetails.github.reviews = prWithReviews.flatMap(pr => 
            (pr.reviews || []).map(review => ({
              ...review,
              prNumber: pr.number,
              prTitle: pr.title,
            }))
          );

          // Auto-update task status if PR is merged OR issue is closed
          const hasMergedPR = prWithReviews.some(pr => pr.merged);
          const issueIsClosed = taskDetails.github.issue?.state === 'closed';
          
          if ((hasMergedPR || issueIsClosed) && task.status !== 'done') {
            task.status = 'done';
            await task.save();
            taskDetails.status = 'done';
            
            // Also update in project.tasks array
            const Project = require('../models/Project');
            await Project.findOneAndUpdate(
              { _id: project._id, 'tasks._id': task._id },
              { $set: { 'tasks.$.status': 'done' } }
            );
            
            const reason = hasMergedPR ? 'PR merged' : 'issue closed';
            console.log(`[Task Details] ✅ Auto-updated task status to 'done' (${reason})`);
          }
        } else {
          console.log(`[Task Details] No PRs found for issue #${task.githubIssueNumber}`);
        }

        taskDetails.github.connected = true;
        console.log(`[Task Details] ✅ Fetched ${taskDetails.github.prs.length} PRs with ${taskDetails.github.stats.totalAdditions}+ / ${taskDetails.github.stats.totalDeletions}- lines, Code Review Score: ${taskDetails.github.codeReviewScore}/100`);

        // Fetch branch activity if branch exists
        if (task.githubBranch) {
          try {
            console.log(`[Task Details] Fetching branch activity for ${task.githubBranch}...`);
            const branchActivity = await getBranchActivity(project.owner, project.repo, task.githubBranch, token);
            if (!branchActivity.error) {
              taskDetails.github.branch = branchActivity;
              console.log(`[Task Details] ✅ Fetched branch activity: ${branchActivity.commits.length} commits, ${branchActivity.comparison?.aheadBy || 0} ahead, ${branchActivity.comparison?.behindBy || 0} behind`);
            } else {
              console.log(`[Task Details] Branch activity fetch failed: ${branchActivity.error}`);
            }
          } catch (branchErr) {
            console.error('[Task Details] Branch activity fetch error:', branchErr.message);
          }
        }
      } catch (ghErr) {
        console.error('[Task Details] GitHub fetch failed:', ghErr.message);
        if (ghErr.stack) console.error('[Task Details] Stack:', ghErr.stack);
        taskDetails.github.error = ghErr.message;
      }
    } else {
      console.log(`[Task Details] Task has no GitHub issue assigned yet`);
    }

    // Fetch WakaTime stats for assignees
    if (taskDetails.assignees.length > 0) {
      try {
        const assigneeStatsPromises = taskDetails.assignees.map(async (assigneeName) => {
          // Find user by name to get their WakaTime token
          const assigneeUser = await User.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${assigneeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
              { githubUsername: { $regex: new RegExp(`^${assigneeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            ],
          });

          if (!assigneeUser || !assigneeUser.wakatimeTokens?.accessToken) {
            return {
              name: assigneeName,
              connected: false,
              stats: null,
            };
          }

          // Fetch last 7 days of WakaTime data
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 7);
          
          const stats = await getWakaTimeStats(
            assigneeUser.wakatimeTokens.accessToken,
            start.toISOString().split('T')[0],
            end.toISOString().split('T')[0]
          );

          const totalSeconds = stats?.data?.data?.reduce((sum, day) => sum + (day.grand_total?.total_seconds || 0), 0) || 0;
          const totalHours = (totalSeconds / 3600).toFixed(1);

          return {
            name: assigneeName,
            connected: true,
            totalHours: parseFloat(totalHours),
            dailyAverage: parseFloat((totalHours / 7).toFixed(1)),
            lastSevenDays: stats?.data?.data?.map(day => ({
              date: day.range?.date,
              hours: ((day.grand_total?.total_seconds || 0) / 3600).toFixed(1),
            })) || [],
          };
        });

        taskDetails.wakatime.assigneeStats = await Promise.all(assigneeStatsPromises);
        console.log(`[Task Details] ✅ Fetched WakaTime stats for ${taskDetails.wakatime.assigneeStats.filter(s => s.connected).length}/${taskDetails.assignees.length} assignees`);
      } catch (wtErr) {
        console.error('[Task Details] WakaTime fetch failed:', wtErr.message);
        taskDetails.wakatime.error = wtErr.message;
      }
    }

    return res.status(200).json({ ok: true, task: taskDetails });
  } catch (error) {
    console.error('[Task Details] Error:', error.message);
    return res.status(500).json({ error: "fetch_task_details_failed", details: error.message });
  }
};

module.exports = { createTask, assignTaskMembers, listTasksForProject, getTaskDetails };
