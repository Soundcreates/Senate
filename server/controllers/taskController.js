const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/UserSchema");
const { createIssue, checkCollaborator, addCollaborator, assignIssue, getPullRequestsForIssue, getIssueDetails, getPRReviews, getPRReviewComments, postPRReview, getPRDiff, getBranchActivity } = require("../services/githubService");
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
        reviewComments: [],  // inline + general code review comments
        branch: null,
      },
      wakatime: {
        assigneeStats: [],
      },
      scores: {
        punctuality: null,
        codeReview: null,
        codingTime: null,
        overall: null,
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
            
            // Also update in project.tasks array
            const Project = require('../models/Project');
            await Project.findOneAndUpdate(
              { _id: project._id, 'tasks._id': task._id },
              { $set: { 'tasks.$.status': 'done' } }
            );
            console.log(`[Task Details] ✅ Updated both Task document and project.tasks array`);
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
            
            // Also update in project.tasks array
            const Project = require('../models/Project');
            await Project.findOneAndUpdate(
              { _id: project._id, 'tasks._id': task._id },
              { $set: { 'tasks.$.status': 'done' } }
            );
            console.log(`[Task Details] ✅ Updated both Task document and project.tasks array`);
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

          // Fetch all PR review comments (inline + general)
          try {
            const allReviewComments = await Promise.all(
              prWithReviews.map(pr => getPRReviewComments(project.owner, project.repo, pr.number, token))
            );
            taskDetails.github.reviewComments = allReviewComments.flatMap((result, idx) => {
              const prNum = prWithReviews[idx].number;
              const prTitle = prWithReviews[idx].title;
              return [
                ...result.inlineComments.map(c => ({ ...c, prNumber: prNum, prTitle })),
                ...result.generalComments.map(c => ({ ...c, prNumber: prNum, prTitle })),
              ];
            });
            console.log(`[Task Details] ✅ Fetched ${taskDetails.github.reviewComments.length} code review comments`);
          } catch (rcErr) {
            console.error('[Task Details] Review comments fetch failed:', rcErr.message);
          }

          // --- SERVER-SIDE AI CODE REVIEW ---
          // If PRs exist but no review comments from bots, trigger AI review via Gemini
          const hasAIReview = taskDetails.github.reviewComments.some(c => c.authorType === 'bot');
          if (!hasAIReview && prWithReviews.length > 0) {
            try {
              const latestPR = prWithReviews[prWithReviews.length - 1];
              const diffResult = await getPRDiff(project.owner, project.repo, latestPR.number, token);
              
              if (diffResult.files.length > 0 && process.env.FEATHERLESS_API_KEY) {
                const { default: OpenAI } = await import("openai");
                const client = new OpenAI({
                  baseURL: process.env.FEATHERLESS_BASE_URL || "https://api.featherless.ai/v1",
                  apiKey: process.env.FEATHERLESS_API_KEY,
                });
                
                // Build a concise diff summary (limit size)
                const diffSummary = diffResult.files.slice(0, 5).map(f => 
                  `### ${f.filename} (${f.status}: +${f.additions}/-${f.deletions})\n\`\`\`diff\n${(f.patch || '').substring(0, 800)}\n\`\`\``
                ).join('\n\n');
                
                const issueBody = taskDetails.github.issue?.body || task.description || '';
                const aiPrompt = `You are a senior code reviewer. Review this PR diff and provide actionable feedback. Be concise.

PR: "${latestPR.title}"
Issue Title: "${task.title}"
Issue Description: "${issueBody.substring(0, 600)}"

${diffSummary}

Return ONLY a JSON object:
{
  "issues": [{"severity": "critical|high|medium|low", "file": "filename", "line": number_or_null, "message": "description", "suggestion": "fix suggestion"}],
  "suggestedChanges": [{"file": "filename", "description": "what should be changed and why", "priority": "high|medium|low"}],
  "issueAddressal": {"addressed": true_or_false, "confidence": number_0_to_100, "reasoning": "1-2 sentences explaining whether the PR adequately addresses the issue requirements", "missingItems": ["list of issue requirements not addressed, if any"]},
  "summary": "1-2 sentence overall assessment",
  "qualityScore": number_0_to_100
}`;

                const completion = await client.chat.completions.create({
                  model: process.env.FEATHERLESS_MODEL || "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
                  max_tokens: 1000,
                  messages: [
                    { role: "system", content: "You are a code review expert. Return valid JSON only." },
                    { role: "user", content: aiPrompt }
                  ],
                });
                
                let aiReviewText = completion.choices[0]?.message?.content || '';
                // Strip <think>...</think> blocks if present
                aiReviewText = aiReviewText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                // Extract JSON from response
                const jsonMatch = aiReviewText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const aiReview = JSON.parse(jsonMatch[0]);
                  taskDetails.github.aiReview = aiReview;
                  
                  // Post review comment on GitHub PR
                  const addressalSection = aiReview.issueAddressal 
                    ? `\n\n### Issue Addressal: ${aiReview.issueAddressal.addressed ? '✅ Addressed' : '❌ Not Fully Addressed'} (${aiReview.issueAddressal.confidence}% confidence)\n${aiReview.issueAddressal.reasoning}${aiReview.issueAddressal.missingItems?.length > 0 ? '\n\n**Missing:**\n' + aiReview.issueAddressal.missingItems.map(m => `- ${m}`).join('\n') : ''}`
                    : '';
                  const suggestedSection = aiReview.suggestedChanges?.length > 0
                    ? `\n\n### Suggested Changes:\n` + aiReview.suggestedChanges.map(s => `- **[${s.priority.toUpperCase()}]** \`${s.file}\`: ${s.description}`).join('\n')
                    : '';
                  const reviewBody = `## 🤖 AI Code Review\n\n${aiReview.summary}\n\n**Quality Score: ${aiReview.qualityScore}/100**${addressalSection}\n\n${
                    aiReview.issues?.length > 0 
                      ? '### Issues Found:\n' + aiReview.issues.map(i => `- **${i.severity.toUpperCase()}** ${i.file}${i.line ? `:${i.line}` : ''}: ${i.message}${i.suggestion ? `\n  > 💡 ${i.suggestion}` : ''}`).join('\n')
                      : '✅ No significant issues found.'
                  }${suggestedSection}`;
                  
                  await postPRReview(project.owner, project.repo, latestPR.number, reviewBody, token);
                  console.log(`[Task Details] ✅ AI code review posted on PR #${latestPR.number}`);
                }
              }
            } catch (aiErr) {
              console.error('[Task Details] AI code review failed:', aiErr.message);
            }
          }

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

    // ========== SCORING SYSTEM ==========
    
    // 1. PUNCTUALITY SCORE (100% till deadline, quadratic decrease after)
    if (task.dueDate) {
      const now = new Date();
      const due = new Date(task.dueDate);
      const created = new Date(task.createdAt);
      const totalDuration = due - created; // total time allowed in ms
      
      if (now <= due) {
        // Before or at deadline: 100%
        taskDetails.scores.punctuality = 100;
      } else {
        // After deadline: quadratic decrease
        // Score = 100 * (1 - (overdue/totalDuration)^2)
        const overdueMs = now - due;
        const ratio = overdueMs / Math.max(totalDuration, 1);
        taskDetails.scores.punctuality = Math.max(0, Math.round(100 * (1 - Math.pow(ratio, 2))));
      }
      
      // If task is done, calculate based on when it was completed
      if (taskDetails.status === 'done' && task.updatedAt) {
        const completedAt = new Date(task.updatedAt);
        if (completedAt <= due) {
          taskDetails.scores.punctuality = 100;
        } else {
          const overdueMs = completedAt - due;
          const ratio = overdueMs / Math.max(totalDuration, 1);
          taskDetails.scores.punctuality = Math.max(0, Math.round(100 * (1 - Math.pow(ratio, 2))));
        }
      }
    }
    
    // 2. CODE REVIEW SCORE (fewer issues = higher score)
    const reviewComments = taskDetails.github.reviewComments || [];
    const aiReview = taskDetails.github.aiReview;
    
    if (taskDetails.github.connected && taskDetails.github.prs.length > 0) {
      let codeReviewScore = 100;
      
      // Deduct for inline review comments (code issues found)
      const issueCount = reviewComments.filter(c => c.type === 'inline').length;
      codeReviewScore -= issueCount * 8; // -8 per inline issue
      
      // Deduct for review states
      const changesRequested = taskDetails.github.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
      codeReviewScore -= changesRequested * 15; // -15 per changes requested
      
      // Use AI review score if available
      if (aiReview?.qualityScore != null) {
        // Blend: 60% AI score, 40% comment-based score
        codeReviewScore = Math.round(aiReview.qualityScore * 0.6 + Math.max(0, codeReviewScore) * 0.4);
      }
      
      // Bonus for approvals
      const approvals = taskDetails.github.reviews.filter(r => r.state === 'APPROVED').length;
      codeReviewScore += approvals * 5;
      
      taskDetails.scores.codeReview = Math.max(0, Math.min(100, codeReviewScore));
    }
    
    // 3. CODING TIME SCORE (proportional to estimated hours)
    const estimatedHours = task.estimatedHours || 0;
    const wakatimeStats = taskDetails.wakatime?.assigneeStats || [];
    const totalCodingHours = wakatimeStats.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    
    if (estimatedHours > 0 && totalCodingHours > 0) {
      // Ideal: actual time is close to estimated time
      // Score decreases if too fast (not enough effort) or way too slow
      const ratio = totalCodingHours / estimatedHours;
      
      if (ratio >= 0.3 && ratio <= 1.5) {
        // Sweet spot: 30% to 150% of estimated time
        taskDetails.scores.codingTime = 100;
      } else if (ratio < 0.3) {
        // Too fast - might be low effort (proportional decrease)
        taskDetails.scores.codingTime = Math.round((ratio / 0.3) * 100);
      } else {
        // Too slow - diminishing returns after 1.5x
        const excessRatio = (ratio - 1.5) / 1.5;
        taskDetails.scores.codingTime = Math.max(0, Math.round(100 * (1 - Math.pow(excessRatio, 2))));
      }
    } else if (totalCodingHours > 0) {
      // No estimate but has coding time - give benefit of doubt
      taskDetails.scores.codingTime = 80;
    }
    
    // OVERALL SCORE (weighted average)
    const scoreComponents = [];
    if (taskDetails.scores.punctuality != null) scoreComponents.push({ score: taskDetails.scores.punctuality, weight: 0.35 });
    if (taskDetails.scores.codeReview != null) scoreComponents.push({ score: taskDetails.scores.codeReview, weight: 0.40 });
    if (taskDetails.scores.codingTime != null) scoreComponents.push({ score: taskDetails.scores.codingTime, weight: 0.25 });
    
    if (scoreComponents.length > 0) {
      const totalWeight = scoreComponents.reduce((sum, c) => sum + c.weight, 0);
      taskDetails.scores.overall = Math.round(
        scoreComponents.reduce((sum, c) => sum + (c.score * c.weight), 0) / totalWeight
      );
    }
    
    console.log(`[Task Details] 📊 Scores - Punctuality: ${taskDetails.scores.punctuality ?? '—'}, Code Review: ${taskDetails.scores.codeReview ?? '—'}, Coding Time: ${taskDetails.scores.codingTime ?? '—'}, Overall: ${taskDetails.scores.overall ?? '—'}`);

    return res.status(200).json({ ok: true, task: taskDetails });
  } catch (error) {
    console.error('[Task Details] Error:', error.message);
    return res.status(500).json({ error: "fetch_task_details_failed", details: error.message });
  }
};

module.exports = { createTask, assignTaskMembers, listTasksForProject, getTaskDetails };
