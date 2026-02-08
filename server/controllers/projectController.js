const Project = require("../models/Project");
const ProjectDailyStats = require("../models/ProjectDailyStats");
const User = require("../models/UserSchema");
const { getTodayCommits } = require("../services/githubService");
const { createIssue, checkCollaborator, addCollaborator, assignIssue } = require("../services/githubService");
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

		const token = sessionUser.githubTokens?.accessToken;
		if (!token) {
			return res.status(400).json({ error: "github_not_connected" });
		}

		const projectName = (req.body?.name || "").trim();
		if (!projectName) {
			return res.status(400).json({ error: "project_name_missing" });
		}

		const githubResponse = await fetch("https://api.github.com/user/repos", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"Content-Type": "application/json",
				"User-Agent": "Datathon-2026",
			},
			body: JSON.stringify({
				name: projectName,
				private: true,
				auto_init: true,
			}),
		});

		const repoData = await githubResponse.json();
		if (!githubResponse.ok) {
			return res.status(502).json({ error: "github_repo_create_failed", details: repoData });
		}

		const ownerLogin = repoData.owner?.login || "";
		const project = await Project.create({
			name: projectName,
			owner: ownerLogin,
			repo: repoData.name || projectName,
			createdBy: sessionUser._id,
			members: [sessionUser._id],
		});

		// Add project to admin user's projects array
		await User.findByIdAndUpdate(sessionUser._id, { $addToSet: { projects: project._id } });

		return res.status(201).json({ ok: true, project });
	} catch (error) {
		console.error("Project create failed:", {
			message: error.message,
			code: error.code,
		});
		return res.status(500).json({ error: "project_create_failed" });
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

		// Build tasks with assignee data
		const projectTasks = (tasks || []).map((task) => ({
			title: task.title || "Untitled Task",
			description: task.description || "",
			priority: task.priority || "Medium",
			estimatedHours: task.estimatedHours || 0,
			status: "todo",
			assignees: (task.assignees || []).map(a => ({
				userId: resolvedTeam.find(t => t.name === a.name)?.userId || null,
				name: a.name || "Unassigned",
				role: a.role || "",
				match: a.match || 0,
				avatar: a.avatar || "👨‍💻",
				reason: a.reason || "",
			})),
		}));

		const project = await Project.create({
			name,
			description,
			budget: budget || 0,
			deadline: deadline || "",
			teamSize: teamSize || 3,
			team: resolvedTeam,
			tasks: projectTasks,
			createdBy: sessionUser._id,
			members: memberUserIds,
			status: "active",
		});

		// Add project to all member users' projects arrays
		await User.updateMany(
			{ _id: { $in: memberUserIds } },
			{ $addToSet: { projects: project._id } }
		);

		// Also create Task documents for the task controller compatibility
		const Task = require("../models/Task");
		for (const task of projectTasks) {
			await Task.create({
				projectId: project._id,
				title: task.title,
				description: task.description,
				status: task.status,
				assignees: task.assignees.map(a => a.name),
				createdBy: sessionUser._id,
			});
		}

		// --- GitHub integration: create issues, ensure collaborators, assign ---
		const token = sessionUser.githubTokens?.accessToken;
		if (token && project.owner && project.repo) {
			try {
				// Resolve GitHub usernames for all team members
				const githubUsernameMap = {}; // name -> githubUsername
				for (const member of resolvedTeam) {
					if (member.userId) {
						const memberUser = await User.findById(member.userId);
						if (memberUser?.githubUsername) {
							githubUsernameMap[member.name] = memberUser.githubUsername;
						}
					}
				}

				// Ensure all resolved GitHub users are collaborators on the repo
				for (const [memberName, ghUsername] of Object.entries(githubUsernameMap)) {
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

				// Create a GitHub issue for each task and assign developers
				const allTasks = await Task.find({ projectId: project._id }).lean();
				for (let i = 0; i < projectTasks.length; i++) {
					const task = projectTasks[i];
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
							ghAssignees.length ? `**Assignees:** ${ghAssignees.map(u => `@${u}`).join(", ")}` : "",
						].filter(Boolean).join("\n");

						const issue = await createIssue(project.owner, project.repo, task.title, issueBody, token);

						// Assign the issue to the developers' GitHub accounts
						if (ghAssignees.length > 0) {
							await assignIssue(project.owner, project.repo, issue.number, ghAssignees, token);
						}

						// Update the Task doc with the GitHub issue number
						if (allTasks[i]) {
							await Task.findByIdAndUpdate(allTasks[i]._id, {
								githubIssueNumber: issue.number,
								githubIssueUrl: issue.html_url,
							});
						}

						console.log(`[GitHub] Issue #${issue.number} created for task "${task.title}" → assigned to [${ghAssignees.join(", ")}]`);
					} catch (issueErr) {
						console.warn(`[GitHub] Failed to create issue for task "${task.title}":`, issueErr.message);
					}
				}
			} catch (ghErr) {
				// Don't fail the whole project creation if GitHub integration fails
				console.error("[GitHub] Integration error (non-blocking):", ghErr.message);
			}
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