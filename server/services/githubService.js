const buildTodayRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  return { start, end };
};

const mapCommit = (commit) => ({
  commitSha: commit.sha,
  githubId: commit.author?.id ? String(commit.author.id) : null,
  username: commit.author?.login || commit.commit?.author?.name || null,
  message: commit.commit?.message || "",
  timestamp: commit.commit?.author?.date ? new Date(commit.commit.author.date) : null,
});

const getTodayCommits = async (project, username, token) => {
  const { start, end } = buildTodayRange();
  const params = new URLSearchParams({
    since: start.toISOString(),
    until: end.toISOString(),
  });

  if (username) {
    params.set("author", username);
  }

  const url = `https://api.github.com/repos/${project.owner}/${project.repo}/commits?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Datathon-2026",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error("github_commits_failed");
    error.details = data;
    throw error;
  }

  return Array.isArray(data) ? data.map(mapCommit) : [];
};

const mapRecentCommit = (event, commit) => {
  const ref = event.payload?.ref || "";
  const branch = ref.startsWith("refs/heads/") ? ref.replace("refs/heads/", "") : ref || "main";
  return {
    commitSha: commit.sha || commit.commitSha || null,
    message: commit.message || "",
    repo: event.repo?.name || null,
    branch,
    timestamp: event.created_at ? new Date(event.created_at) : null,
  };
};

const getRecentCommits = async (token, { limit = 20 } = {}) => {
  const url = "https://api.github.com/user/events?per_page=100";
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Datathon-2026",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error("github_recent_commits_failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const commits = [];
  if (Array.isArray(data)) {
    data.forEach((event) => {
      if (event.type !== "PushEvent") return;
      const eventCommits = Array.isArray(event.payload?.commits) ? event.payload.commits : [];
      eventCommits.forEach((commit) => {
        if (commits.length < limit) {
          commits.push(mapRecentCommit(event, commit));
        }
      });
    });
  }

  return commits;
};

module.exports = { getTodayCommits, getRecentCommits };
