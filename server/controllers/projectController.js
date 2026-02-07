const Project = require("../models/Project");
const ProjectDailyStats = require("../models/ProjectDailyStats");
const User = require("../models/UserSchema");
const { getTodayCommits } = require("../services/githubService");
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
	if (!userId) return null;
	return User.findById(userId);
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
			members: ownerLogin ? [ownerLogin] : [],
		});

		return res.status(201).json({ ok: true, project });
	} catch (error) {
		console.error("Project create failed:", {
			message: error.message,
			code: error.code,
		});
		return res.status(500).json({ error: "project_create_failed" });
	}
};

const listProjects = async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req);
		if (!sessionUser) {
			return res.status(401).json({ error: "no_session" });
		}

		const projects = await Project.find({ createdBy: sessionUser._id })
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

module.exports = { createProject, listProjects, getTodayActivity, getHistoryActivity };