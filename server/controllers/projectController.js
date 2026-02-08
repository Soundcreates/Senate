const Project = require("../models/Project");
const ProjectDailyStats = require("../models/ProjectDailyStats");
const User = require("../models/UserSchema");
const { getTodayCommits } = require("../services/githubService");
const { createIssue, checkCollaborator, addCollaborator, assignIssue, createRepo, createLabel, setupCopilotWorkflow, createBranch } = require("../services/githubService");
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

const createProject = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		// Use user's token or fallback to env token for testing
		const token = sessionUser.githubTokens?.accessToken || process.env.GITHUB_TOKEN;
		if (!token) {
			return res.status(400).json({ error: "github_not_connected" });
		}
		if (!sessionUser.githubTokens?.accessToken) {
			console.log(`[GitHub] Using environment token (GITHUB_TOKEN) for user ${sessionUser.name || sessionUser.email}`);
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
		const Task = require("../models/Task");
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
		// Use user's token or fallback to env token for testing
		const token = sessionUser.githubTokens?.accessToken || process.env.GITHUB_TOKEN;
		if (token) {
			if (!sessionUser.githubTokens?.accessToken) {
				console.log(`[GitHub] Using environment token (GITHUB_TOKEN) for user ${sessionUser.name || sessionUser.email}`);
			}
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

module.exports = { createProject, createFullProject, getProjectById, listProjects, getTodayActivity, getHistoryActivity, linkEscrow };