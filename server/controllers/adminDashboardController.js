const Project = require("../models/Project");

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString()}`;
};

const formatShortDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const normalizeStatus = (status) => {
  const value = String(status || "active").toLowerCase();
  if (value === "completed") return "Completed";
  if (value === "pending") return "Pending";
  return "Active";
};

const calculateProgress = (tasks = []) => {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;
  const doneCount = tasks.filter((task) =>
    ["done", "completed"].includes(String(task.status || "").toLowerCase())
  ).length;
  return Math.round((doneCount / tasks.length) * 100);
};

const getTeamAvatars = (team = []) =>
  (Array.isArray(team) ? team : [])
    .map((member) => member.avatar || "👤")
    .filter(Boolean)
    .slice(0, 6);

const buildTeamSummary = (projects) => {
  const teamMap = new Map();

  projects.forEach((project) => {
    const team = Array.isArray(project.team) ? project.team : [];
    const teamSize = team.length || 1;
    const budgetShare = Number(project.budget || 0) / teamSize;

    team.forEach((member) => {
      const key = member.userId ? String(member.userId) : member.name || "Unknown";
      const existing = teamMap.get(key) || {
        id: key,
        name: member.name || "Unknown",
        role: member.role || "Developer",
        avatar: member.avatar || "👤",
        rating: null,
        projects: 0,
        earned: 0,
      };

      const match = Number(member.match || 0);
      if (!existing.rating && match > 0) {
        existing.rating = Math.round((match / 20) * 10) / 10;
      }

      existing.projects += 1;
      existing.earned += budgetShare;
      teamMap.set(key, existing);
    });
  });

  return Array.from(teamMap.values()).map((member) => ({
    ...member,
    earned: formatCurrency(member.earned),
  }));
};

const buildPayments = (projects) =>
  projects
    .filter((project) => Number(project.budget || 0) > 0)
    .map((project) => {
      const recipient = project.team?.[0]?.name || "Team";
      return {
        id: project._id,
        project: project.name,
        amount: formatCurrency(project.budget),
        status: normalizeStatus(project.status),
        date: formatShortDate(project.createdAt),
        recipient,
      };
    })
    .slice(0, 8);

const getDashboardOverview = async (_req, res) => {
  try {
    const projects = await Project.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const projectCards = projects.map((project) => ({
      id: project._id,
      name: project.name,
      status: normalizeStatus(project.status),
      team: getTeamAvatars(project.team),
      budget: formatCurrency(project.budget),
      progress: calculateProgress(project.tasks),
      dueDate: project.deadline || "",
    }));

    const teamMembers = buildTeamSummary(projects);
    const payments = buildPayments(projects);

    const uniqueTeamCount = new Set(
      teamMembers.map((member) => member.id)
    ).size;

    const pendingBudget = projects
      .filter((project) => normalizeStatus(project.status) !== "Completed")
      .reduce((sum, project) => sum + Number(project.budget || 0), 0);

    const completedBudget = projects
      .filter((project) => normalizeStatus(project.status) === "Completed")
      .reduce((sum, project) => sum + Number(project.budget || 0), 0);

    const stats = [
      {
        label: "Total Projects",
        value: projects.length,
        change: "",
        color: "#a9927d",
      },
      {
        label: "Active Team",
        value: uniqueTeamCount,
        change: "",
        color: "#5e503f",
      },
      {
        label: "Pending Payments",
        value: formatCurrency(pendingBudget),
        change: "",
        color: "#dc2626",
      },
      {
        label: "Total Revenue",
        value: formatCurrency(completedBudget),
        change: "",
        color: "#16a34a",
      },
    ];

    return res.status(200).json({
      ok: true,
      data: {
        stats,
        projects: projectCards,
        teamMembers,
        payments,
      },
    });
  } catch (error) {
    console.error("Admin dashboard load failed:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: "admin_dashboard_failed" });
  }
};

module.exports = { getDashboardOverview };
