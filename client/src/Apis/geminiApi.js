import { API_BASE_URL } from "@/config/apiBase";
const BASE_API = API_BASE_URL;

export const splitTasks = async (payload) => {
  const response = await fetch(`${BASE_API}/api/gemini/split-tasks`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "split_tasks_failed" };
  }

  const data = await response.json();
  return { ok: true, data };
};

export const generateTitle = async (payload) => {
  const response = await fetch(`${BASE_API}/api/gemini/generate-title`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "generate_title_failed" };
  }

  const data = await response.json();
  return { ok: true, data };
};
