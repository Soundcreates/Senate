import { API_BASE_URL } from "@/config/apiBase";
const BASE_API = API_BASE_URL;

export const fetchRecentCommits = async (limit = 20) => {
  const url = new URL(`${BASE_API}/api/github/commits/recent`);
  if (limit) {
    url.searchParams.set("limit", String(limit));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "github_recent_commits_failed" };
  }

  const data = await response.json();
  return { ok: true, commits: data.commits || [] };
};
