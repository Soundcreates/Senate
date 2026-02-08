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

/**
 * Get the authenticated GitHub user's profile (login, id, etc.)
 */
const getGitHubUser = async (token) => {
  return fetchGitHubJson("https://api.github.com/user", token);
};

/**
 * Create a GitHub issue on a repo with optional labels.
 * Returns the created issue object (with .number, .html_url, etc.)
 */
const createIssue = async (owner, repo, title, body, token, labels = []) => {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ title, body: body || "", labels }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error("github_issue_create_failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
};

/**
 * Check if a user is a collaborator on a repo.
 * Returns true/false. (204 = yes, 404 = no)
 */
const checkCollaborator = async (owner, repo, username, token) => {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators/${encodeURIComponent(username)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  return response.status === 204;
};

/**
 * Add (invite) a user as a collaborator on a repo.
 * If already a collaborator, GitHub returns 204.
 * If invitation sent, GitHub returns 201.
 */
const addCollaborator = async (owner, repo, username, token) => {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators/${encodeURIComponent(username)}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ permission: "push" }),
  });

  if (response.status === 201 || response.status === 204) {
    return { ok: true, status: response.status === 201 ? "invited" : "already_collaborator" };
  }

  const data = await response.json().catch(() => ({}));
  const error = new Error("github_add_collaborator_failed");
  error.status = response.status;
  error.details = data;
  throw error;
};

/**
 * Assign GitHub usernames to an existing issue.
 * `assignees` is an array of GitHub usernames.
 */
const assignIssue = async (owner, repo, issueNumber, assignees, token) => {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ assignees }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error("github_issue_assign_failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
};

/**
 * Create a private GitHub repo with auto_init.
 * Returns the GitHub repo data.
 */
const createRepo = async (name, description, token) => {
  // Sanitize repo name: GitHub allows alphanumeric, hyphens, underscores, and periods
  // Replace spaces and special chars with hyphens, collapse multiple hyphens
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9._-]/g, "-") // Replace invalid chars with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 100) // GitHub's practical limit
    || "untitled-project"; // Fallback if name becomes empty

  // Sanitize description: remove control characters and limit to 350 chars
  let sanitizedDesc = "";
  if (description) {
    sanitizedDesc = description
      .replace(/[\x00-\x1F\x7F]/g, " ") // Remove control characters, replace with space
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim()
      .substring(0, 350); // GitHub's max length
  }

  const response = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      name: sanitizedName,
      description: sanitizedDesc,
      private: true,
      auto_init: true,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error("github_repo_create_failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
};

/**
 * Create a label on a repo. If the label already exists, that's fine.
 * color is a hex string without the '#' (e.g. "e4e669").
 */
const createLabel = async (owner, repo, name, color, token) => {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/labels`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ name, color: color || "ededed" }),
  });

  // 422 means label already exists — that's fine
  if (response.status === 422) return { name, already_exists: true };
  const data = await response.json();
  if (!response.ok) {
    const error = new Error("github_label_create_failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
};

/**
 * Create a file in a repository.
 * content should be a string (will be base64 encoded automatically).
 */
const createFile = async (owner, repo, path, content, message, token) => {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`;
  
  // GitHub API requires base64 encoding
  const contentBase64 = Buffer.from(content, 'utf-8').toString('base64');
  
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message,
      content: contentBase64,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error("github_file_create_failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
};

/**
 * Set up GitHub Actions workflow for Copilot code review with issue linking.
 */
const setupCopilotWorkflow = async (owner, repo, token) => {
  const workflowContent = `name: Copilot Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  copilot-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Link PR to Issue
        uses: actions/github-script@v7
        with:
          script: |
            const prBody = context.payload.pull_request.body || '';
            const issuePattern = /#(\\d+)|closes\\s+#(\\d+)|fixes\\s+#(\\d+)|resolves\\s+#(\\d+)/gi;
            const matches = [...prBody.matchAll(issuePattern)];
            
            if (matches.length > 0) {
              const issueNumbers = matches.map(m => m[1] || m[2] || m[3] || m[4]).filter(Boolean);
              for (const issueNum of issueNumbers) {
                console.log(\`Linking PR to issue #\${issueNum}\`);
                await github.rest.issues.createComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: parseInt(issueNum),
                  body: \`🔗 Linked to PR #\${context.payload.pull_request.number}\`
                });
              }
            }

      - name: AI Code Review
        uses: actions/github-script@v7
        with:
          script: |
            const { data: files } = await github.rest.pulls.listFiles({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.payload.pull_request.number
            });

            let reviewComments = [];
            
            for (const file of files) {
              // Skip generated files and dependencies
              if (file.filename.includes('package-lock.json') || 
                  file.filename.includes('yarn.lock') ||
                  file.filename.includes('node_modules') ||
                  file.filename.includes('.min.js')) {
                continue;
              }

              // Basic code quality checks
              if (file.additions > 300) {
                reviewComments.push({
                  path: file.filename,
                  body: '⚠️ **Large change detected** (${file.additions} additions). Consider breaking this into smaller, focused PRs.',
                  line: 1
                });
              }

              // Check for common issues in patches
              const patch = file.patch || '';
              
              if (patch.includes('console.log') || patch.includes('console.error')) {
                reviewComments.push({
                  path: file.filename,
                  body: '🔍 **Debug statement found**. Consider removing console logs before merging.',
                  line: 1
                });
              }

              if (patch.includes('TODO') || patch.includes('FIXME')) {
                reviewComments.push({
                  path: file.filename,
                  body: '📝 **TODO/FIXME found**. Consider creating an issue to track this.',
                  line: 1
                });
              }

              if (patch.includes('any') && file.filename.endsWith('.ts')) {
                reviewComments.push({
                  path: file.filename,
                  body: '🎯 **TypeScript any detected**. Consider using specific types for better type safety.',
                  line: 1
                });
              }
            }

            // Create review with comments
            if (reviewComments.length > 0) {
              await github.rest.pulls.createReview({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.payload.pull_request.number,
                event: 'COMMENT',
                body: \`## 🤖 AI Code Review\\n\\nFound \${reviewComments.length} suggestion(s). Review the inline comments below.\`,
                comments: reviewComments
              });
            } else {
              await github.rest.pulls.createReview({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.payload.pull_request.number,
                event: 'COMMENT',
                body: '## 🤖 AI Code Review\\n\\n✅ No issues found. Code looks good!'
              });
            }

      - name: Notify Issue Assignees
        uses: actions/github-script@v7
        with:
          script: |
            const prBody = context.payload.pull_request.body || '';
            const issuePattern = /#(\\d+)|closes\\s+#(\\d+)|fixes\\s+#(\\d+)|resolves\\s+#(\\d+)/gi;
            const matches = [...prBody.matchAll(issuePattern)];
            
            if (matches.length > 0) {
              const issueNumbers = matches.map(m => m[1] || m[2] || m[3] || m[4]).filter(Boolean);
              
              for (const issueNum of issueNumbers) {
                const { data: issue } = await github.rest.issues.get({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: parseInt(issueNum)
                });
                
                // Notify assignees
                for (const assignee of issue.assignees || []) {
                  await github.rest.issues.createComment({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    issue_number: parseInt(issueNum),
                    body: \`@\${assignee.login} 👋 PR #\${context.payload.pull_request.number} is ready for review! Please check the AI code review comments.\`
                  });
                }
              }
            }
`;

  try {
    await createFile(
      owner,
      repo,
      '.github/workflows/copilot-review.yml',
      workflowContent,
      'Add GitHub Copilot code review workflow',
      token
    );
    return { success: true };
  } catch (error) {
    console.error('[GitHub] Failed to create workflow file:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { getTodayCommits, getRecentCommits, fetchGitHubJson, createIssue, checkCollaborator, addCollaborator, assignIssue, getGitHubUser, createRepo, createLabel, createFile, setupCopilotWorkflow };
