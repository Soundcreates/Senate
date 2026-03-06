const Project = require("../models/Project");
const ProjectDailyStats = require("../models/ProjectDailyStats");
const Task = require("../models/Task");
const User = require("../models/UserSchema");
const {
	getTodayCommits,
	createIssue,
	checkCollaborator,
	addCollaborator,
	assignIssue,
	createRepo,
	createLabel,
	setupCopilotWorkflow,
	createBranch,
	fetchGitHubJson,
	getPullRequestsForIssue,
} = require("../services/githubService");
const { storeTodayStats } = require("../services/projectStatsService");

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

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildRecentDateKeys = (days = 7, endDate = new Date()) => {
	const dateKeys = [];
	for (let dayIndex = days - 1; dayIndex >= 0; dayIndex -= 1) {
		const dateCursor = new Date(endDate);
		dateCursor.setDate(dateCursor.getDate() - dayIndex);
		dateKeys.push(dateCursor.toISOString().slice(0, 10));
	}
	return dateKeys;
};

const normalizeWakaTimeDaySeries = (rawDays, dateKeys) => {
	const totalsByDate = {};
	(rawDays || []).forEach((dayEntry) => {
		const dateKey = dayEntry?.range?.date;
		if (!dateKey) return;
		const totalSeconds = Number(dayEntry?.grand_total?.total_seconds || 0);
		totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + totalSeconds;
	});

	return dateKeys.map((dateKey) => ({
		date: dateKey,
		hours: parseFloat(((totalsByDate[dateKey] || 0) / 3600).toFixed(1)),
	}));
};

const sumDayHours = (daySeries = []) =>
	parseFloat(
		daySeries.reduce((sum, dayEntry) => sum + (Number(dayEntry?.hours) || 0), 0).toFixed(1),
	);

const resolveTaskAssignees = (taskEntry = {}) =>
	(taskEntry.assignees || [])
		.map((assignee) => (typeof assignee === "string" ? assignee : assignee?.name))
		.map((name) => (name || "").trim())
		.filter(Boolean);

const collectProjectMemberNames = (project, taskRows = []) => {
	const memberNames = new Set();
	(project?.team || []).forEach((member) => {
		if (member?.name) {
			memberNames.add(String(member.name).trim());
		}
	});

	(taskRows || []).forEach((taskEntry) => {
		resolveTaskAssignees(taskEntry).forEach((memberName) => memberNames.add(memberName));
	});

	return [...memberNames];
};

const getSafeDate = (value) => {
	if (!value) return null;
	const parsedDate = new Date(value);
	return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const buildTaskDeadlineSnapshot = (taskStatus, dueDateValue, nowDate = new Date()) => {
	const normalizedStatus = String(taskStatus || "").toLowerCase();
	if (!dueDateValue) {
		return {
			status: normalizedStatus === "done" || normalizedStatus === "completed" ? "completed" : "no_deadline",
			dueDate: null,
			daysRemaining: null,
			overdueDays: 0,
		};
	}

	const dueDate = getSafeDate(dueDateValue);
	if (!dueDate) {
		return {
			status: "no_deadline",
			dueDate: null,
			daysRemaining: null,
			overdueDays: 0,
		};
	}

	const daysDelta = Math.ceil((dueDate - nowDate) / (1000 * 60 * 60 * 24));
	if (normalizedStatus === "done" || normalizedStatus === "completed") {
		return {
			status: "completed",
			dueDate: dueDate.toISOString().slice(0, 10),
			daysRemaining: Math.max(0, daysDelta),
			overdueDays: daysDelta < 0 ? Math.abs(daysDelta) : 0,
		};
	}

	if (daysDelta < 0) {
		return {
			status: "overdue",
			dueDate: dueDate.toISOString().slice(0, 10),
			daysRemaining: 0,
			overdueDays: Math.abs(daysDelta),
		};
	}

	return {
		status: daysDelta <= 2 ? "at_risk" : "on_track",
		dueDate: dueDate.toISOString().slice(0, 10),
		daysRemaining: daysDelta,
		overdueDays: 0,
	};
};

const findUserByMemberName = async (memberName) => {
	const safeName = (memberName || "").trim();
	if (!safeName) return null;

	const exactPattern = new RegExp(`^${escapeRegex(safeName)}$`, "i");
	return User.findOne({
		$or: [{ name: { $regex: exactPattern } }, { githubUsername: { $regex: exactPattern } }],
	});
};

const fetchMemberCodingStats = async (memberNames, startDate, endDate, dateKeys) => {
	const { fetchTimeStats } = require("../services/wakatime-stats");
	const uniqueMemberNames = [...new Set((memberNames || []).map((name) => (name || "").trim()).filter(Boolean))];

	const memberStats = await Promise.all(
		uniqueMemberNames.map(async (memberName) => {
			const memberUser = await findUserByMemberName(memberName);
			if (!memberUser?.wakatimeTokens?.accessToken) {
				return {
					name: memberName,
					connected: false,
					totalHours: 0,
					dailyAverage: 0,
					lastSevenDays: dateKeys.map((dateKey) => ({ date: dateKey, hours: 0 })),
				};
			}

			try {
				const timeStats = await fetchTimeStats(memberUser.wakatimeTokens.accessToken, startDate, endDate);
				const normalizedDays = normalizeWakaTimeDaySeries(timeStats?.data || [], dateKeys);
				const totalHours = sumDayHours(normalizedDays);

				return {
					name: memberName,
					connected: true,
					totalHours,
					dailyAverage: parseFloat((totalHours / Math.max(dateKeys.length, 1)).toFixed(1)),
					lastSevenDays: normalizedDays,
				};
			} catch (error) {
				console.error(`[CodingStats] WakaTime fetch failed for ${memberName}:`, error.message);
				return {
					name: memberName,
					connected: false,
					totalHours: 0,
					dailyAverage: 0,
					lastSevenDays: dateKeys.map((dateKey) => ({ date: dateKey, hours: 0 })),
					error: error.message,
				};
			}
		}),
	);

	return memberStats;
};

const aggregateCodingDaySeries = (memberStats, dateKeys) => {
	const totalsByDate = dateKeys.reduce((accumulator, dateKey) => {
		accumulator[dateKey] = 0;
		return accumulator;
	}, {});

	(memberStats || []).forEach((memberStat) => {
		(memberStat?.lastSevenDays || []).forEach((dayEntry) => {
			if (!(dayEntry?.date in totalsByDate)) return;
			totalsByDate[dayEntry.date] += Number(dayEntry?.hours || 0);
		});
	});

	return dateKeys.map((dateKey) => ({
		date: dateKey,
		hours: parseFloat((totalsByDate[dateKey] || 0).toFixed(1)),
	}));
};

const createProject = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		const token = sessionUser.githubTokens?.accessToken;
		if (!token) {
			return res.status(400).json({ error: "github_not_connected" });
		}

		const projectName = (req.body?.name || "").trim();
		if (!projectName) {
			return res.status(400).json({ error: "project_name_missing" });
		}

		console.log(`\n[Simple Project] Creating project "${projectName}"...`);
		console.log(`[GitHub] Creating repository...`);
		const repoData = await createRepo(projectName, req.body?.description || "", token);
		
		if (repoData.name !== projectName) {
			console.log(`[GitHub] ℹ️  Repository name sanitized: "${projectName}" → "${repoData.name}"`);
		}
		console.log(`[GitHub] ✅ Repository created: ${repoData.owner?.login}/${repoData.name}`);
		console.log(`[GitHub]    URL: ${repoData.html_url}`);

		const ownerLogin = repoData.owner?.login || "";
		
		// Set up Copilot code review workflow
		console.log(`[GitHub] Setting up Copilot code review workflow...`);
		const workflowResult = await setupCopilotWorkflow(ownerLogin, repoData.name, token);
		if (workflowResult.success) {
			console.log(`[GitHub] ✅ Copilot workflow created: .github/workflows/copilot-review.yml`);
		} else {
			console.error(`[GitHub] ❌ Failed to create workflow:`, workflowResult.error);
		}

		const project = await Project.create({
			name: projectName,
			owner: ownerLogin,
			repo: repoData.name || projectName,
			createdBy: sessionUser._id,
			members: [sessionUser._id],
		});

		// Add project to admin user's projects array
		await User.findByIdAndUpdate(sessionUser._id, { $addToSet: { projects: project._id } });

		console.log(`[Project] ✅ Created project "${projectName}" (${ownerLogin}/${repoData.name})\n`);
		return res.status(201).json({ ok: true, project });
	} catch (error) {
		console.error("\n[Project] ❌ Creation failed:", error.message);
		if (error.details) {
			console.error("[Project]    Details:", JSON.stringify(error.details, null, 2));
		}
		console.error("[Project]    Stack:", error.stack);
		return res.status(500).json({ error: "project_create_failed", details: error.message });
	}
};

/**
 * Full project creation from Admin flow — saves everything at once:
 * title, description, budget, deadline, teamSize, team, tasks with assignments
 */
const createFullProject = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		const {
			name,
			description,
			budget,
			deadline,
			teamSize,
			team,        // [{ name, role, match, avatar, reason, userId? }]
			tasks,       // [{ id, title, description, priority, estimatedHours, assignees: [{ name, ... }] }]
		} = req.body;

		if (!name || !description) {
			return res.status(400).json({ error: "name_and_description_required" });
		}

		// Resolve team member user IDs by matching name/email
		const resolvedTeam = [];
		const memberUserIds = [sessionUser._id]; // always include admin

		for (const member of (team || [])) {
			let userId = null;
			// Try to find user by name or email
			if (member.userId) {
				userId = member.userId;
			} else if (member.name) {
				const found = await User.findOne({
					$or: [
						{ name: { $regex: new RegExp(`^${member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
						{ email: { $regex: new RegExp(`^${member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') } },
					]
				});
				if (found) userId = found._id;
			}

			resolvedTeam.push({
				userId: userId || null,
				name: member.name || "Team Member",
				role: member.role || "Developer",
				match: member.match || 0,
				avatar: member.avatar || "👨‍💻",
				reason: member.reason || "",
			});

			if (userId && !memberUserIds.find(id => id.toString() === userId.toString())) {
				memberUserIds.push(userId);
			}
		}

		// Build tasks with assignee data and calculate due dates
		const projectTasks = (tasks || []).map((task) => {
			// Calculate due date based on estimated hours (assuming 8 hours/day)
			const estimatedHours = task.estimatedHours || 8;
			const daysNeeded = Math.ceil(estimatedHours / 8);
			const dueDate = new Date();
			dueDate.setDate(dueDate.getDate() + daysNeeded);
			
			return {
				title: task.title || "Untitled Task",
				description: task.description || "",
				priority: task.priority || "Medium",
				estimatedHours: estimatedHours,
				dueDate: dueDate,
				status: "todo",
				assignees: (task.assignees || []).map(a => ({
					userId: resolvedTeam.find(t => t.name === a.name)?.userId || null,
					name: a.name || "Unassigned",
					role: a.role || "",
					match: a.match || 0,
					avatar: a.avatar || "👨‍💻",
					reason: a.reason || "",
				})),
			};
		});

		// Create Task documents FIRST to get their IDs
		const createdTasks = [];
		
		// We need to create a project first to get the project ID for tasks
		const project = await Project.create({
			name,
			description,
			budget: budget || 0,
			deadline: deadline || "",
			teamSize: teamSize || 3,
			team: resolvedTeam,
			tasks: [], // Start with empty tasks, will add later
			createdBy: sessionUser._id,
			members: memberUserIds,
			status: "active",
		});

		// Now create Task documents with the project ID
		for (const task of projectTasks) {
			const createdTask = await Task.create({
				projectId: project._id,
				title: task.title,
				description: task.description,
				status: task.status,
				assignees: task.assignees.map(a => a.name),
				estimatedHours: task.estimatedHours,
				dueDate: task.dueDate,
				createdBy: sessionUser._id,
			});
			createdTasks.push(createdTask);
		}

		// Now add tasks to project with matching IDs
		project.tasks = projectTasks.map((task, index) => ({
			_id: createdTasks[index]._id, // Use the Task document's ID
			title: task.title,
			description: task.description,
			dueDate: task.dueDate,
			priority: task.priority,
			estimatedHours: task.estimatedHours,
			status: task.status,
			assignees: task.assignees,
		}));
		await project.save();

		// Add project to all member users' projects arrays
		await User.updateMany(
			{ _id: { $in: memberUserIds } },
			{ $addToSet: { projects: project._id } }
		);

		// --- GitHub integration: create repo, issues, invitations, assignments — all in parallel ---
		const token = sessionUser.githubTokens?.accessToken;
		if (token) {
			console.log(`\n[GitHub Integration] Starting for project "${name}"...`);
			try {
				// Step 1: Create the GitHub repo
				console.log(`[GitHub] Creating repository "${name}"...`);
				const repoData = await createRepo(name, description, token);
				const ownerLogin = repoData.owner?.login || "";
				const repoName = repoData.name || name;
				
				if (repoName !== name) {
					console.log(`[GitHub] ℹ️  Repository name sanitized: "${name}" → "${repoName}"`);
				}
				console.log(`[GitHub] ✅ Repository created: ${ownerLogin}/${repoName}`);
				console.log(`[GitHub]    URL: ${repoData.html_url}`);

				// Update the project with repo info
				project.owner = ownerLogin;
				project.repo = repoName;
				await project.save();

				// Step 2: Resolve GitHub usernames for all team members
				console.log(`[GitHub] Resolving team member GitHub accounts...`);
				const githubUsernameMap = {}; // name -> githubUsername
				for (const member of resolvedTeam) {
					if (member.userId) {
						const memberUser = await User.findById(member.userId);
						if (memberUser?.githubUsername) {
							githubUsernameMap[member.name] = memberUser.githubUsername;
							console.log(`[GitHub]    ${member.name} → @${memberUser.githubUsername}`);
						}
					}
				}

				// Step 3: Run collaborator invitations, label creation, and issue creation ALL in parallel
				const priorityLabelColors = {
					High: "d73a4a",
					Medium: "fbca04",
					Low: "0e8a16",
					Critical: "b60205",
				};

				console.log(`[GitHub] Adding collaborators...`);
				// 3a: Invite all collaborators in parallel
				const collabPromises = Object.entries(githubUsernameMap).map(async ([memberName, ghUsername]) => {
					try {
						const isCollab = await checkCollaborator(ownerLogin, repoName, ghUsername, token);
						if (!isCollab) {
							const result = await addCollaborator(ownerLogin, repoName, ghUsername, token);
							console.log(`[GitHub] ✅ Collaborator ${result.status}: @${ghUsername} (${memberName})`);
							return { success: true, username: ghUsername, status: result.status };
						} else {
							console.log(`[GitHub] ℹ️  Already collaborator: @${ghUsername} (${memberName})`);
							return { success: true, username: ghUsername, status: 'already_collaborator' };
						}
					} catch (collabErr) {
						console.error(`[GitHub] ❌ Failed to add collaborator @${ghUsername}:`, collabErr.message);
						return { success: false, username: ghUsername, error: collabErr.message };
					}
				});

				console.log(`[GitHub] Creating labels...`);
				// 3b: Create priority labels in parallel
				const uniquePriorities = [...new Set(projectTasks.map(t => t.priority || "Medium"))];
				const labelPromises = uniquePriorities.map(async (priority) => {
					try {
						const result = await createLabel(ownerLogin, repoName, priority, priorityLabelColors[priority] || "ededed", token);
						if (result.already_exists) {
							console.log(`[GitHub] ℹ️  Label already exists: "${priority}"`);
						} else {
							console.log(`[GitHub] ✅ Label created: "${priority}" (#${priorityLabelColors[priority]})`);
						}
						return { success: true, label: priority };
					} catch (labelErr) {
						console.error(`[GitHub] ❌ Failed to create label "${priority}":`, labelErr.message);
						return { success: false, label: priority, error: labelErr.message };
					}
				});

				// Wait for collaborators and labels to be ready (issues need labels to exist)
				const [collabResults, labelResults] = await Promise.all([
					Promise.all(collabPromises),
					Promise.all(labelPromises)
				]);
				
				const successfulCollabs = collabResults.filter(r => r.success).length;
				const successfulLabels = labelResults.filter(r => r.success).length;
				console.log(`[GitHub] Collaborators: ${successfulCollabs}/${collabResults.length} successful`);
				console.log(`[GitHub] Labels: ${successfulLabels}/${labelResults.length} successful`);

				console.log(`[GitHub] Creating issues for ${projectTasks.length} tasks...`);
				// 3c: Create issues with labels, assign them, and create branches — all in parallel
				const issuePromises = projectTasks.map(async (task, i) => {
					try {
						const assigneeNames = task.assignees.map(a => a.name);
						const ghAssignees = assigneeNames
							.map(n => githubUsernameMap[n])
							.filter(Boolean);

						const issueBody = [
							task.description || "",
							"",
							`**Priority:** ${task.priority || "Medium"}`,
							`**Estimated Hours:** ${task.estimatedHours || 0}`,
							`**Due Date:** ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}`,
							ghAssignees.length ? `**Assignees:** ${ghAssignees.map(u => `@${u}`).join(", ")}` : "",
						].filter(Boolean).join("\n");

						const labels = [task.priority || "Medium"];
						const issue = await createIssue(ownerLogin, repoName, task.title, issueBody, token, labels);

						// Create branch for this issue
						const branchName = `issue-${issue.number}-${task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50)}`;
						const branchResult = await createBranch(ownerLogin, repoName, branchName, token);

						// Assign, update Task doc, and update Project.tasks in parallel
						const postIssueOps = [];
						if (ghAssignees.length > 0) {
							postIssueOps.push(assignIssue(ownerLogin, repoName, issue.number, ghAssignees, token));
						}
						if (createdTasks[i]) {
							postIssueOps.push(
								Task.findByIdAndUpdate(createdTasks[i]._id, {
									githubIssueNumber: issue.number,
									githubIssueUrl: issue.html_url,
									githubBranch: branchResult.success ? branchName : null,
								})
							);
							// Also update the project.tasks array subdocument
							postIssueOps.push(
								Project.findOneAndUpdate(
									{ _id: project._id, "tasks._id": createdTasks[i]._id },
									{ 
										$set: { 
											"tasks.$.githubIssueNumber": issue.number,
											"tasks.$.githubIssueUrl": issue.html_url,
											"tasks.$.githubBranch": branchResult.success ? branchName : null,
										}
									}
								)
							);
						}
						await Promise.all(postIssueOps);

						console.log(`[GitHub] ✅ Issue #${issue.number}: "${task.title}"`);
						console.log(`[GitHub]    URL: ${issue.html_url}`);
						console.log(`[GitHub]    Labels: [${labels.join(", ")}]`);
						if (branchResult.success) {
							if (branchResult.alreadyExists) {
								console.log(`[GitHub]    Branch: ${branchName} (already exists)`);
							} else {
								console.log(`[GitHub]    Branch: ${branchName} ✅`);
							}
						}
						if (ghAssignees.length) {
							console.log(`[GitHub]    Assigned: ${ghAssignees.map(u => `@${u}`).join(", ")}`);
						}
						return { success: true, issue: issue.number, title: task.title };
					} catch (issueErr) {
						console.error(`[GitHub] ❌ Failed to create issue "${task.title}":`, issueErr.message);
						if (issueErr.details) {
							console.error(`[GitHub]    Details:`, JSON.stringify(issueErr.details, null, 2));
						}
						return { success: false, title: task.title, error: issueErr.message };
					}
				});

				const issueResults = await Promise.all(issuePromises);
				const successfulIssues = issueResults.filter(r => r.success).length;
				
				// Step 4: Set up GitHub Actions workflow for Copilot code review
				console.log(`[GitHub] Setting up Copilot code review workflow...`);
				const workflowResult = await setupCopilotWorkflow(ownerLogin, repoName, token);
				if (workflowResult.success) {
					console.log(`[GitHub] ✅ Copilot workflow created: .github/workflows/copilot-review.yml`);
				} else {
					console.error(`[GitHub] ❌ Failed to create workflow:`, workflowResult.error);
				}
				
				console.log(`\n[GitHub Integration] Summary for "${name}":`);
				console.log(`[GitHub] ✅ Repository: ${ownerLogin}/${repoName}`);
				console.log(`[GitHub] ✅ Collaborators: ${successfulCollabs}/${collabResults.length}`);
				console.log(`[GitHub] ✅ Labels: ${successfulLabels}/${labelResults.length}`);
				console.log(`[GitHub] ✅ Issues: ${successfulIssues}/${projectTasks.length}`);
				console.log(`[GitHub] ${workflowResult.success ? '✅' : '❌'} Copilot Review: ${workflowResult.success ? 'Enabled' : 'Failed'}`);
				console.log(`[GitHub Integration] Complete!\n`);
			} catch (ghErr) {
				// Don't fail the whole project creation if GitHub integration fails
				console.error("\n[GitHub Integration] ❌ FATAL ERROR:", ghErr.message);
				if (ghErr.details) {
					console.error("[GitHub]    Details:", JSON.stringify(ghErr.details, null, 2));
				}
				console.error("[GitHub]    Stack:", ghErr.stack);
			}
		} else {
			console.warn(`[GitHub Integration] ⚠️  Skipped: No GitHub token found for user ${sessionUser.name || sessionUser.email}`);
		}

		console.log(`[Project] ✅ Created full project "${name}" with ${resolvedTeam.length} members and ${projectTasks.length} tasks`);

		return res.status(201).json({ ok: true, project });
	} catch (error) {
		console.error("Full project create failed:", {
			message: error.message,
			stack: error.stack,
		});
		return res.status(500).json({ error: "project_create_failed" });
	}
};

const getProjectById = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		const project = await Project.findById(req.params.projectId)
			.populate("createdBy", "name email avatarUrl")
			.populate("members", "name email avatarUrl role")
			.lean();

		if (!project) {
			return res.status(404).json({ error: "project_not_found" });
		}

		// Only allow access if user is creator or member
		const userId = sessionUser._id.toString();
		const isCreator = project.createdBy?._id?.toString() === userId;
		const isMember = project.members?.some(m => m._id?.toString() === userId);

		if (!isCreator && !isMember) {
			return res.status(403).json({ error: "access_denied" });
		}

		return res.status(200).json({ ok: true, project });
	} catch (error) {
		console.error("Get project failed:", { message: error.message });
		return res.status(500).json({ error: "project_get_failed" });
	}
};

const listProjects = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		// Show projects where user is creator OR member
		const projects = await Project.find({
			$or: [
				{ createdBy: sessionUser._id },
				{ members: sessionUser._id },
			]
		})
			.populate("createdBy", "name email avatarUrl")
			.sort({ createdAt: -1 })
			.lean();

		return res.status(200).json({ ok: true, projects });
	} catch (error) {
		console.error("Project list failed:", {
			message: error.message,
			code: error.code,
		});
		return res.status(500).json({ error: "project_list_failed" });
	}
};

const getTodayActivity = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		const token = sessionUser.githubTokens?.accessToken;
		if (!token) {
			return res.status(400).json({ error: "github_not_connected" });
		}

		const project = await Project.findById(req.params.projectId);
		if (!project) {
			return res.status(404).json({ error: "project_not_found" });
		}

		const commits = await getTodayCommits(project, project.owner, token);
		await storeTodayStats(project._id, commits);

		return res.status(200).json({
			commitsToday: commits.length,
			commits,
		});
	} catch (error) {
		console.error("Fetch today activity failed:", {
			message: error.message,
			code: error.code,
			details: error.details,
		});
		return res.status(500).json({ error: "project_activity_failed" });
	}
};

const getHistoryActivity = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		const project = await Project.findById(req.params.projectId);
		if (!project) {
			return res.status(404).json({ error: "project_not_found" });
		}

		const stats = await ProjectDailyStats.find({ projectId: project._id }).sort({ date: -1 }).lean();
		return res.status(200).json({ ok: true, history: stats });
	} catch (error) {
		console.error("Fetch history activity failed:", {
			message: error.message,
			code: error.code,
		});
		return res.status(500).json({ error: "project_history_failed" });
	}
};

/**
 * Link an on-chain escrow contract to a project
 */
const linkEscrow = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		const { escrowAddress, txHash, chainId } = req.body;
		if (!escrowAddress || !txHash) {
			return res.status(400).json({ error: "escrow_address_and_tx_required" });
		}

		// Validate address format
		if (!/^0x[a-fA-F0-9]{40}$/.test(escrowAddress)) {
			return res.status(400).json({ error: "invalid_escrow_address" });
		}

		const project = await Project.findById(req.params.projectId);
		if (!project) {
			return res.status(404).json({ error: "project_not_found" });
		}

		// Only project creator can link escrow
		if (project.createdBy.toString() !== sessionUser._id.toString()) {
			return res.status(403).json({ error: "only_creator_can_link_escrow" });
		}

		project.escrowAddress = escrowAddress;
		project.escrowTxHash = txHash;
		project.escrowChainId = chainId || 11155111; // default Sepolia
		await project.save();

		console.log(`[Project] Escrow linked: ${escrowAddress} -> project ${project.name}`);
		return res.status(200).json({ ok: true, project });
	} catch (error) {
		console.error("Link escrow failed:", { message: error.message });
		return res.status(500).json({ error: "link_escrow_failed" });
	}
};

/**
 * Get WakaTime coding stats for all team members of a project
 */
const getProjectCodingStats = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		const project = await Project.findById(req.params.projectId).lean();
		if (!project) {
			return res.status(404).json({ error: "project_not_found" });
		}

		const dateKeys = buildRecentDateKeys(7);
		const startStr = dateKeys[0];
		const endStr = dateKeys[dateKeys.length - 1];

		const memberNames = collectProjectMemberNames(project, project.tasks || []);
		const memberStats = await fetchMemberCodingStats(memberNames, startStr, endStr, dateKeys);

		// Build a lookup by name for quick access
		const statsByName = {};
		memberStats.forEach((memberStat) => {
			statsByName[memberStat.name] = memberStat;
		});

		return res.status(200).json({ ok: true, memberStats, statsByName });
	} catch (error) {
		console.error("Get coding stats failed:", { message: error.message });
		return res.status(500).json({ error: "coding_stats_failed" });
	}
};

/**
 * Get comprehensive project completion/progress stats
 * Pulls real data from GitHub (commits, PRs, issues, lines) + WakaTime coding hours + timeline
 */
const getProjectCompletionStats = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		const project = await Project.findById(req.params.projectId)
			.populate("createdBy", "name email")
			.populate("members", "name email githubTokens wakatimeTokens githubUsername")
			.lean();

		if (!project) {
			return res.status(404).json({ error: "project_not_found" });
		}

		const projectTasksById = new Map(
			(project.tasks || []).map((taskEntry) => [String(taskEntry._id), taskEntry]),
		);
		const persistedTasks = await Task.find({ projectId: project._id }).lean();
		const baseTasks = persistedTasks.length > 0 ? persistedTasks : project.tasks || [];

		const normalizedTasks = baseTasks.map((taskEntry) => {
			const taskId = String(taskEntry._id);
			const projectTask = projectTasksById.get(taskId) || {};
			const rawStatus = String(taskEntry.status || projectTask.status || "todo")
				.toLowerCase()
				.replace(/\s+/g, "_");
			const status = rawStatus === "completed" ? "done" : rawStatus;
			const estimatedHours = Number(taskEntry.estimatedHours ?? projectTask.estimatedHours ?? 0) || 0;
			const assignees = resolveTaskAssignees({
				assignees:
					Array.isArray(taskEntry.assignees) && taskEntry.assignees.length > 0
						? taskEntry.assignees
						: projectTask.assignees || [],
			});

			return {
				id: taskId,
				title: taskEntry.title || projectTask.title || "Untitled Task",
				description: taskEntry.description || projectTask.description || "",
				status,
				priority: projectTask.priority || taskEntry.priority || "Medium",
				estimatedHours,
				dueDate: taskEntry.dueDate || projectTask.dueDate || null,
				assignees,
				githubIssueNumber: taskEntry.githubIssueNumber || projectTask.githubIssueNumber || null,
				githubIssueUrl: taskEntry.githubIssueUrl || projectTask.githubIssueUrl || null,
				githubBranch: taskEntry.githubBranch || projectTask.githubBranch || null,
				createdAt: taskEntry.createdAt || project.createdAt,
				updatedAt: taskEntry.updatedAt || project.updatedAt,
			};
		});

		const nowDate = new Date();
		const createdAt = getSafeDate(project.createdAt) || nowDate;
		const projectDeadline = getSafeDate(project.deadline);
		const daysElapsed = Math.max(1, Math.round((nowDate - createdAt) / (1000 * 60 * 60 * 24)));
		const timelinePercent = projectDeadline
			? (() => {
				const totalDuration = projectDeadline - createdAt;
				if (totalDuration <= 0) return 100;
				const elapsed = nowDate - createdAt;
				return Math.min(100, Math.round((elapsed / totalDuration) * 100));
			})()
			: null;
		const daysRemaining = projectDeadline
			? Math.max(0, Math.ceil((projectDeadline - nowDate) / (1000 * 60 * 60 * 24)))
			: null;

		const dateKeys = buildRecentDateKeys(7, nowDate);
		const startDate = dateKeys[0];
		const endDate = dateKeys[dateKeys.length - 1];

		const memberNames = collectProjectMemberNames(project, normalizedTasks);
		const memberStats = await fetchMemberCodingStats(memberNames, startDate, endDate, dateKeys);
		const codingByMemberName = memberStats.reduce((accumulator, memberStat) => {
			accumulator[String(memberStat.name || "").toLowerCase()] = memberStat;
			return accumulator;
		}, {});
		const codingByDay = aggregateCodingDaySeries(memberStats, dateKeys);
		const totalCodingHours = sumDayHours(codingByDay);
		const avgCodingPerDay = parseFloat((totalCodingHours / Math.max(dateKeys.length, 1)).toFixed(1));

		let taskGithubMap = new Map();
		let githubStats = {
			totalCommits7d: 0,
			commitsByDay: dateKeys.map((dateKey) => ({ date: dateKey, count: 0 })),
			openIssues: 0,
			closedIssues: 0,
			mergedPRs: 0,
			openPRs: 0,
			linesAdded: 0,
			linesRemoved: 0,
			contributors: memberNames.length,
			repoSize: 0,
			defaultBranch: "main",
			taskLinkedPRs: 0,
			tasksWithPRs: 0,
			tasksWithMergedPRs: 0,
		};

		const token = sessionUser.githubTokens?.accessToken;
		const owner = project.owner;
		const repo = project.repo;

		if (token && owner && repo) {
			try {
				const [repoInfo, recentCommits, closedIssues, openIssues, pullRequests] = await Promise.all([
					fetchGitHubJson(`https://api.github.com/repos/${owner}/${repo}`, token).catch(() => null),
					fetchGitHubJson(
						`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&since=${new Date(startDate).toISOString()}`,
						token,
					).catch(() => []),
					fetchGitHubJson(
						`https://api.github.com/repos/${owner}/${repo}/issues?state=closed&per_page=100`,
						token,
					).catch(() => []),
					fetchGitHubJson(
						`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`,
						token,
					).catch(() => []),
					fetchGitHubJson(
						`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
						token,
					).catch(() => []),
				]);

				const commitsByDate = {};
				const commitRows = Array.isArray(recentCommits) ? recentCommits : [];
				const contributorNames = new Set();
				commitRows.forEach((commitEntry) => {
					const commitDate = commitEntry?.commit?.author?.date?.slice(0, 10);
					if (commitDate) {
						commitsByDate[commitDate] = (commitsByDate[commitDate] || 0) + 1;
					}
					const contributorName = commitEntry?.author?.login || commitEntry?.commit?.author?.name;
					if (contributorName) {
						contributorNames.add(contributorName);
					}
				});

				const openIssueRows = (Array.isArray(openIssues) ? openIssues : []).filter((issue) => !issue?.pull_request);
				const closedIssueRows = (Array.isArray(closedIssues) ? closedIssues : []).filter((issue) => !issue?.pull_request);
				const issueLookup = new Map();
				[...openIssueRows, ...closedIssueRows].forEach((issueEntry) => {
					const issueNumber = Number(issueEntry?.number || 0);
					if (!issueNumber) return;
					issueLookup.set(issueNumber, {
						state: issueEntry?.state || null,
						url: issueEntry?.html_url || null,
					});
				});

				const taskGithubEntries = await Promise.all(
					normalizedTasks.map(async (taskEntry) => {
						const issueNumber = Number(taskEntry.githubIssueNumber || 0);
						if (!issueNumber) {
							return [
								taskEntry.id,
								{
									hasIssue: false,
									issueNumber: null,
									issueUrl: null,
									issueState: null,
									prCount: 0,
									mergedPRs: 0,
									openPRs: 0,
									linesAdded: 0,
									linesRemoved: 0,
									changedFiles: 0,
									lastPrAt: null,
								},
							];
						}

						const issueMeta = issueLookup.get(issueNumber) || {};
						const pullRequestResult = await getPullRequestsForIssue(owner, repo, issueNumber, token);
						const linkedPullRequests = Array.isArray(pullRequestResult?.prs) ? pullRequestResult.prs : [];

						const mergedPullRequests = linkedPullRequests.filter((pullRequest) => pullRequest?.merged);
						const openPullRequests = linkedPullRequests.filter((pullRequest) => pullRequest?.state === "open");
						const latestPrDate = linkedPullRequests
							.map((pullRequest) => getSafeDate(pullRequest?.updatedAt || pullRequest?.createdAt))
							.filter(Boolean)
							.sort((firstDate, secondDate) => secondDate - firstDate)[0];

						return [
							taskEntry.id,
							{
								hasIssue: true,
								issueNumber,
								issueUrl: taskEntry.githubIssueUrl || issueMeta.url || null,
								issueState: issueMeta.state || null,
								prCount: linkedPullRequests.length,
								mergedPRs: mergedPullRequests.length,
								openPRs: openPullRequests.length,
								linesAdded: linkedPullRequests.reduce(
									(sum, pullRequest) => sum + (Number(pullRequest?.additions) || 0),
									0,
								),
								linesRemoved: linkedPullRequests.reduce(
									(sum, pullRequest) => sum + (Number(pullRequest?.deletions) || 0),
									0,
								),
								changedFiles: linkedPullRequests.reduce(
									(sum, pullRequest) => sum + (Number(pullRequest?.changedFiles) || 0),
									0,
								),
								lastPrAt: latestPrDate ? latestPrDate.toISOString() : null,
							},
						];
					}),
				);

				taskGithubMap = new Map(taskGithubEntries);
				const taskGithubRows = [...taskGithubMap.values()].filter((taskGithub) => taskGithub.hasIssue);
				const repoPullRequests = Array.isArray(pullRequests) ? pullRequests : [];
				const mergedRepoPullRequests = repoPullRequests.filter((pullRequest) => Boolean(pullRequest?.merged_at));
				const openRepoPullRequests = repoPullRequests.filter((pullRequest) => pullRequest?.state === "open");

				let linesAdded = taskGithubRows.reduce(
					(sum, taskGithub) => sum + (Number(taskGithub.linesAdded) || 0),
					0,
				);
				let linesRemoved = taskGithubRows.reduce(
					(sum, taskGithub) => sum + (Number(taskGithub.linesRemoved) || 0),
					0,
				);

				if ((linesAdded === 0 && linesRemoved === 0) && mergedRepoPullRequests.length > 0) {
					const mergedPullRequestDetails = await Promise.all(
						mergedRepoPullRequests.slice(0, 10).map(async (pullRequest) => {
							try {
								return await fetchGitHubJson(
									`https://api.github.com/repos/${owner}/${repo}/pulls/${pullRequest.number}`,
									token,
								);
							} catch (_error) {
								return null;
							}
						}),
					);

					linesAdded = mergedPullRequestDetails.reduce(
						(sum, pullRequest) => sum + (Number(pullRequest?.additions) || 0),
						0,
					);
					linesRemoved = mergedPullRequestDetails.reduce(
						(sum, pullRequest) => sum + (Number(pullRequest?.deletions) || 0),
						0,
					);
				}

				const commitsByDay = dateKeys.map((dateKey) => ({
					date: dateKey,
					count: commitsByDate[dateKey] || 0,
				}));

				githubStats = {
					totalCommits7d: commitRows.length,
					commitsByDay,
					openIssues: openIssueRows.length,
					closedIssues: closedIssueRows.length,
					mergedPRs: mergedRepoPullRequests.length,
					openPRs: openRepoPullRequests.length,
					linesAdded,
					linesRemoved,
					contributors: contributorNames.size || memberNames.length,
					repoSize: Number(repoInfo?.size) || 0,
					defaultBranch: repoInfo?.default_branch || "main",
					taskLinkedPRs: taskGithubRows.reduce(
						(sum, taskGithub) => sum + (Number(taskGithub.prCount) || 0),
						0,
					),
					tasksWithPRs: taskGithubRows.filter((taskGithub) => taskGithub.prCount > 0).length,
					tasksWithMergedPRs: taskGithubRows.filter((taskGithub) => taskGithub.mergedPRs > 0).length,
				};
			} catch (error) {
				console.error("[CompletionStats] GitHub fetch failed:", error.message);
			}
		}

		const taskBreakdown = normalizedTasks.map((taskEntry) => {
			const taskGithub = taskGithubMap.get(taskEntry.id) || {
				hasIssue: Boolean(taskEntry.githubIssueNumber),
				issueNumber: taskEntry.githubIssueNumber || null,
				issueUrl: taskEntry.githubIssueUrl || null,
				issueState: null,
				prCount: 0,
				mergedPRs: 0,
				openPRs: 0,
				linesAdded: 0,
				linesRemoved: 0,
				changedFiles: 0,
				lastPrAt: null,
			};

			const inferredStatus =
				taskEntry.status !== "done" && (taskGithub.mergedPRs > 0 || taskGithub.issueState === "closed")
					? "done"
					: taskEntry.status;
			const normalizedStatus = inferredStatus === "completed" ? "done" : inferredStatus;

			const codingHoursForTask = parseFloat(
				resolveTaskAssignees(taskEntry)
					.reduce((sum, assigneeName) => {
						const memberStat = codingByMemberName[String(assigneeName || "").toLowerCase()];
						return sum + (Number(memberStat?.totalHours) || 0);
					}, 0)
					.toFixed(1),
			);
			const deadlineSnapshot = buildTaskDeadlineSnapshot(normalizedStatus, taskEntry.dueDate, nowDate);

			return {
				id: taskEntry.id,
				title: taskEntry.title,
				status: normalizedStatus,
				priority: taskEntry.priority,
				estimatedHours: taskEntry.estimatedHours,
				dueDate: deadlineSnapshot.dueDate,
				assignees: taskEntry.assignees,
				deadline: deadlineSnapshot,
				hasGithubIssue: taskGithub.hasIssue,
				githubIssueNumber: taskGithub.issueNumber,
				githubIssueUrl: taskGithub.issueUrl,
				github: {
					...taskGithub,
				},
				coding: {
					totalHours7d: codingHoursForTask,
					avgPerDay: parseFloat((codingHoursForTask / Math.max(dateKeys.length, 1)).toFixed(1)),
				},
			};
		});

		const totalTasks = taskBreakdown.length;
		const doneTasks = taskBreakdown.filter((taskEntry) => taskEntry.status === "done").length;
		const inProgressTasks = taskBreakdown.filter((taskEntry) => taskEntry.status === "in_progress").length;
		const todoTasks = taskBreakdown.filter((taskEntry) => taskEntry.status === "todo").length;
		const taskPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

		const deadlineSummary = taskBreakdown.reduce(
			(accumulator, taskEntry) => {
				const deadlineStatus = taskEntry?.deadline?.status || "no_deadline";
				accumulator[deadlineStatus] = (accumulator[deadlineStatus] || 0) + 1;
				return accumulator;
			},
			{ completed: 0, on_track: 0, at_risk: 0, overdue: 0, no_deadline: 0 },
		);

		if (!token || !owner || !repo) {
			githubStats = {
				...githubStats,
				openIssues: Math.max(githubStats.openIssues, todoTasks + inProgressTasks),
				closedIssues: Math.max(githubStats.closedIssues, doneTasks),
			};
		}

		const estimatedTotalHours = taskBreakdown.reduce(
			(sum, taskEntry) => sum + (Number(taskEntry.estimatedHours) || 0),
			0,
		);
		const completedEstimatedHours = taskBreakdown
			.filter((taskEntry) => taskEntry.status === "done")
			.reduce((sum, taskEntry) => sum + (Number(taskEntry.estimatedHours) || 0), 0);
		const remainingHours = Math.max(0, estimatedTotalHours - completedEstimatedHours);
		const hoursPerDay = daysElapsed > 0 ? parseFloat((totalCodingHours / Math.min(daysElapsed, 7)).toFixed(1)) : 0;
		const estimatedDaysLeft = hoursPerDay > 0 ? Math.ceil(remainingHours / hoursPerDay) : null;

		return res.status(200).json({
			ok: true,
			completion: {
				taskPercent,
				totalTasks,
				doneTasks,
				inProgressTasks,
				todoTasks,
				timeline: {
					daysElapsed,
					daysRemaining,
					timelinePercent,
					deadlineDate: projectDeadline ? projectDeadline.toISOString().slice(0, 10) : null,
					createdAt: createdAt.toISOString().slice(0, 10),
				},
				deadlines: deadlineSummary,
				github: githubStats,
				coding: {
					totalHours7d: totalCodingHours,
					byDay: codingByDay,
					avgPerDay: avgCodingPerDay,
					members: memberStats,
				},
				velocity: {
					estimatedTotalHours,
					completedEstHours: completedEstimatedHours,
					remainingHours,
					hoursPerDay,
					estimatedDaysLeft,
				},
				taskBreakdown,
			},
		});
	} catch (error) {
		console.error("Get completion stats failed:", { message: error.message, stack: error.stack });
		return res.status(500).json({ error: "completion_stats_failed" });
	}
};

module.exports = { createProject, createFullProject, getProjectById, listProjects, getTodayActivity, getHistoryActivity, linkEscrow, getProjectCodingStats, getProjectCompletionStats };