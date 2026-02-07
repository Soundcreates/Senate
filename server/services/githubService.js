const buildTodayRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  return { start, end };
};

const mapCommit = (commit, repoFullName, fallbackUsername) => ({
  commitSha: commit.sha,
  githubId: commit.author?.id ? String(commit.author.id) : null,
  username: commit.author?.login || commit.commit?.author?.name || fallbackUsername || null,
  message: commit.commit?.message || "",
  timestamp: commit.commit?.author?.date ? new Date(commit.commit.author.date) : null,
  repo: repoFullName || null,
});

const fetchGitHubJson = async (url, token) => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error("github_api_failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

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

const getRecentCommits = async (token, { limit = 5 } = {}) => {
  const profile = await fetchGitHubJson("https://api.github.com/user", token);
  const login = profile?.login;
  if (!login) {
    const error = new Error("github_user_missing");
    error.status = 500;
    throw error;
  }

  const reposUrl = "https://api.github.com/user/repos?per_page=100&sort=pushed&direction=desc&affiliation=owner,collaborator,organization_member";
  const repos = await fetchGitHubJson(reposUrl, token);
  const repoList = Array.isArray(repos) ? repos.slice(0, 30) : [];
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const commitBatches = await Promise.all(
    repoList.map(async (repo) => {
      const owner = repo?.owner?.login;
      const repoName = repo?.name;
      if (!owner || !repoName) return [];

      const commitsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repoName
      )}/commits?author=${encodeURIComponent(login)}&per_page=5&since=${encodeURIComponent(since)}`;

      try {
        const response = await fetch(commitsUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "Datathon-2026",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });

        if (response.status === 409) {
          return [];
        }

        const data = await response.json();
        if (!response.ok) {
          const error = new Error("github_commits_failed");
          error.status = response.status;
          error.details = data;
          throw error;
        }

        return Array.isArray(data) ? data.map((commit) => mapCommit(commit, repo.full_name, login)) : [];
      } catch (error) {
        if (error.status === 409) return [];
        throw error;
      }
    })
  );

  const merged = commitBatches.flat().filter((commit) => commit.timestamp instanceof Date);
  merged.sort((a, b) => b.timestamp - a.timestamp);

  return merged.slice(0, limit);
};

module.exports = { getTodayCommits, getRecentCommits };
