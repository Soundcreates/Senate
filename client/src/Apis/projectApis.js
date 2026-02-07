const BASE_API = "http://localhost:3000";

export const createProject = async (name) => {
  const response = await fetch(`${BASE_API}/api/projects/create`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "project_create_failed" };
  }

  const data = await response.json();
  return { ok: true, project: data.project };
};

/**
 * Create a full project from the Admin flow with all details
 */
export const createFullProject = async (projectData) => {
  const response = await fetch(`${BASE_API}/api/projects/create-full`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(projectData),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "project_create_failed" };
  }

  const data = await response.json();
  return { ok: true, project: data.project };
};

/**
 * Get a single project by ID (with full details)
 */
export const getProject = async (projectId) => {
  const response = await fetch(`${BASE_API}/api/projects/${projectId}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "project_get_failed" };
  }

  const data = await response.json();
  return { ok: true, project: data.project };
};

export const listProjects = async () => {
  const response = await fetch(`${BASE_API}/api/projects`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "project_list_failed" };
  }

  const data = await response.json();
  return { ok: true, projects: data.projects || [] };
};

export const createTask = async (projectId, payload) => {
  const response = await fetch(`${BASE_API}/api/tasks/${projectId}/tasks`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "task_create_failed" };
  }

  const data = await response.json();
  return { ok: true, task: data.task };
};

export const listProjectTasks = async (projectId) => {
  const response = await fetch(`${BASE_API}/api/tasks/${projectId}/tasks`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "task_list_failed" };
  }

  const data = await response.json();
  return { ok: true, tasks: data.tasks || [] };
};

export const assignTaskMembers = async (projectId, taskId, assignees) => {
  const response = await fetch(`${BASE_API}/api/tasks/${projectId}/tasks/${taskId}/assign`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ assignees }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "task_assign_failed" };
  }

  const data = await response.json();
  return { ok: true, task: data.task };
};

export const fetchTodayActivity = async (projectId) => {
  const response = await fetch(`${BASE_API}/api/projects/${projectId}/activity/today`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "project_activity_failed" };
  }

  const data = await response.json();
  return { ok: true, data };
};

export const fetchActivityHistory = async (projectId) => {
  const response = await fetch(`${BASE_API}/api/projects/${projectId}/activity/history`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "project_history_failed" };
  }

  const data = await response.json();
  return { ok: true, data };
};

/**
 * Link an on-chain escrow contract to a project
 */
export const linkEscrowToProject = async (projectId, { escrowAddress, txHash, chainId }) => {
  const response = await fetch(`${BASE_API}/api/projects/${projectId}/escrow`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ escrowAddress, txHash, chainId }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "link_escrow_failed" };
  }

  const data = await response.json();
  return { ok: true, project: data.project };
};
