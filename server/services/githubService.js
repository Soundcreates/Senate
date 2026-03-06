const {
  resolveGithubAccessToken,
  refreshGithubAccessTokenByCurrentToken,
} = require("./oauthTokenService");

const buildTodayRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  return { start, end };
};

const withGithubHeaders = (headers = {}, accessToken) => ({
  ...headers,
  Authorization: `Bearer ${accessToken}`,
  "User-Agent": headers["User-Agent"] || "Datathon-2026",
  "X-GitHub-Api-Version": headers["X-GitHub-Api-Version"] || "2022-11-28",
});

const githubFetchWithAutoRefresh = async (url, options = {}, token) => {
  const execute = async (accessToken) =>
    fetch(url, {
      ...options,
      headers: withGithubHeaders(options.headers, accessToken),
    });

  let activeToken = resolveGithubAccessToken(token);
  let response = await execute(activeToken);

  if (response.status !== 401) {
    return response;
  }

  try {
    const refreshedToken = await refreshGithubAccessTokenByCurrentToken(activeToken);
    if (!refreshedToken) {
      return response;
    }
    activeToken = refreshedToken;
    response = await execute(activeToken);
  } catch (refreshError) {
    console.warn("[GitHub] Access token refresh failed:", refreshError.message);
  }

  return response;
};

const githubRequestHeaders = {
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
  "User-Agent": "Datathon-2026",
  "X-GitHub-Api-Version": "2022-11-28",
};

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch (_err) {
    return {};
  }
};

const getConfiguredOrgOwner = () => {
  const configured =
    process.env.GITHUB_APP_ORG ||
    process.env.GITHUB_ORG ||
    process.env.GITHUB_REPO_OWNER ||
    null;

  return configured ? configured.trim() : null;
};

const inferIntegrationOwner = async () => {
  const configuredOrg = getConfiguredOrgOwner();
  if (configuredOrg) {
    return { login: configuredOrg, type: "Organization", source: "env" };
  }

  return null;
};

const buildRepoPayload = (name, description) => ({
  name,
  description,
  private: true,
  auto_init: true,
});

const createRepoInOrg = async (orgLogin, payload, token) => {
  const orgCreateResponse = await githubFetchWithAutoRefresh(
    `https://api.github.com/orgs/${encodeURIComponent(orgLogin)}/repos`,
    {
      method: "POST",
      headers: githubRequestHeaders,
      body: JSON.stringify(payload),
    },
    token,
  );

  const orgData = await parseJsonSafe(orgCreateResponse);
  if (!orgCreateResponse.ok) {
    const error = new Error("github_repo_create_failed");
    error.status = orgCreateResponse.status;
    error.details = orgData;
    throw error;
  }

  return orgData;
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
  const response = await githubFetchWithAutoRefresh(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  }, token);

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
  const response = await githubFetchWithAutoRefresh(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Datathon-2026",
    },
  }, token);

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
        const response = await githubFetchWithAutoRefresh(commitsUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "Datathon-2026",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }, token);

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
  const response = await githubFetchWithAutoRefresh(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ title, body: body || "", labels }),
  }, token);

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
  const response = await githubFetchWithAutoRefresh(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  }, token);
  return response.status === 204;
};

/**
 * Add (invite) a user as a collaborator on a repo.
 * If already a collaborator, GitHub returns 204.
 * If invitation sent, GitHub returns 201.
 */
const addCollaborator = async (owner, repo, username, token) => {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators/${encodeURIComponent(username)}`;
  const response = await githubFetchWithAutoRefresh(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ permission: "push" }),
  }, token);

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
  const response = await githubFetchWithAutoRefresh(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ assignees }),
  }, token);

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

  const repoPayload = buildRepoPayload(sanitizedName, sanitizedDesc);

  const response = await githubFetchWithAutoRefresh("https://api.github.com/user/repos", {
    method: "POST",
    headers: githubRequestHeaders,
    body: JSON.stringify(repoPayload),
  }, token);

  const data = await parseJsonSafe(response);
  if (response.ok) {
    return data;
  }

  const isIntegrationScopeError =
    response.status === 403 &&
    String(data?.message || "").toLowerCase().includes("resource not accessible by integration");

  if (isIntegrationScopeError) {
    const integrationOwner = await inferIntegrationOwner();

    if (integrationOwner?.login && integrationOwner.type === "Organization") {
      return createRepoInOrg(integrationOwner.login, repoPayload, token);
    }

    const error = new Error("github_repo_create_failed");
    error.status = response.status;
    error.details = {
      ...data,
      hint:
        "Personal-account repo creation is enforced. /user/repos is blocked for this token. Reconnect GitHub so the user token can create personal repositories (repository administration write), or set GITHUB_APP_ORG only if you intentionally want org-owned repositories.",
      inferredOwner: integrationOwner,
    };
    throw error;
  }

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
  const response = await githubFetchWithAutoRefresh(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ name, color: color || "ededed" }),
  }, token);

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
  
  const response = await githubFetchWithAutoRefresh(url, {
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
  }, token);

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
 * Create or update a file on GitHub (handles both new and existing files)
 */
const createOrUpdateFile = async (owner, repo, path, content, message, token) => {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`;
  
  // Try to get existing file to get its SHA
  let sha = null;
  try {
    const getResponse = await githubFetchWithAutoRefresh(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);
    
    if (getResponse.ok) {
      const existingFile = await getResponse.json();
      sha = existingFile.sha;
      console.log(`[GitHub] File ${path} exists, will update with SHA: ${sha}`);
    }
  } catch (err) {
    console.log(`[GitHub] File ${path} does not exist, will create new`);
  }
  
  // GitHub API requires base64 encoding
  const contentBase64 = Buffer.from(content, 'utf-8').toString('base64');
  
  const body = {
    message,
    content: contentBase64,
  };
  
  // Include SHA if file exists (for updates)
  if (sha) {
    body.sha = sha;
  }
  
  const response = await githubFetchWithAutoRefresh(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Datathon-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(body),
  }, token);

  const data = await response.json();
  if (!response.ok) {
    const error = new Error("github_file_update_failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
};

/**
 * Get pull requests linked to an issue
 */
const getPullRequestsForIssue = async (owner, repo, issueNumber, token) => {
  try {
    // First get all PRs that reference this issue
    const timelineUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/timeline`;
    const timelineResponse = await githubFetchWithAutoRefresh(timelineUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);

    if (!timelineResponse.ok) {
      return { prs: [], error: `Failed to fetch timeline: ${timelineResponse.status}` };
    }

    const timeline = await timelineResponse.json();
    const prNumbers = timeline
      .filter(event => event.event === 'cross-referenced' && event.source?.issue?.pull_request)
      .map(event => event.source.issue.number);

    // Fetch details for each PR
    const prStats = [];
    for (const prNumber of prNumbers) {
      const prUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`;
      const prResponse = await githubFetchWithAutoRefresh(prUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Datathon-2026",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }, token);

      if (prResponse.ok) {
        const pr = await prResponse.json();
        prStats.push({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          url: pr.html_url,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
          changedFiles: pr.changed_files || 0,
          author: pr.user?.login || 'unknown',
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          merged: pr.merged || false,
        });
      }
    }

    return { prs: prStats, error: null };
  } catch (error) {
    console.error('[GitHub] Error fetching PRs for issue:', error.message);
    return { prs: [], error: error.message };
  }
};

/**
 * Get PR inline review comments (code-level comments from reviewers/bots)
 */
const getPRReviewComments = async (owner, repo, prNumber, token) => {
  try {
    // Get inline review comments (posted on specific lines)
    const reviewCommentsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/comments`;
    const reviewCommentsRes = await githubFetchWithAutoRefresh(reviewCommentsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);
    
    const reviewComments = reviewCommentsRes.ok ? await reviewCommentsRes.json() : [];
    
    // Get issue-level comments on the PR (general comments, bot comments)
    const issueCommentsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${prNumber}/comments`;
    const issueCommentsRes = await githubFetchWithAutoRefresh(issueCommentsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);
    
    const issueComments = issueCommentsRes.ok ? await issueCommentsRes.json() : [];
    
    // Categorize comments
    const codeReviewComments = reviewComments.map(c => ({
      type: 'inline',
      author: c.user?.login || 'unknown',
      authorType: c.user?.type === 'Bot' ? 'bot' : 'human',
      body: c.body,
      path: c.path,
      line: c.line || c.original_line,
      createdAt: c.created_at,
      url: c.html_url,
    }));
    
    const generalComments = issueComments
      .filter(c => {
        const body = (c.body || '').toLowerCase();
        // Filter to only code-review-related comments (from bots or containing review keywords)
        return c.user?.type === 'Bot' || 
               body.includes('review') || body.includes('code quality') || 
               body.includes('suggestion') || body.includes('issue') ||
               body.includes('⚠️') || body.includes('✅') || body.includes('🔍') ||
               body.includes('bug') || body.includes('security') || body.includes('performance');
      })
      .map(c => ({
        type: 'general',
        author: c.user?.login || 'unknown',
        authorType: c.user?.type === 'Bot' ? 'bot' : 'human',
        body: c.body,
        createdAt: c.created_at,
        url: c.html_url,
      }));
    
    return {
      inlineComments: codeReviewComments,
      generalComments: generalComments,
      totalIssues: codeReviewComments.length + generalComments.length,
      error: null,
    };
  } catch (error) {
    console.error('[GitHub] Error fetching PR review comments:', error.message);
    return { inlineComments: [], generalComments: [], totalIssues: 0, error: error.message };
  }
};

/**
 * Post a code review comment on a PR (server-side review)
 */
const postPRReview = async (owner, repo, prNumber, reviewBody, token) => {
  try {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/reviews`;
    const response = await githubFetchWithAutoRefresh(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        event: 'COMMENT',
        body: reviewBody,
      }),
    }, token);
    
    if (!response.ok) {
      const data = await response.json();
      console.error('[GitHub] Failed to post review:', data);
      return { success: false, error: data.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[GitHub] Error posting PR review:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get diff/patch content for a PR
 */
const getPRDiff = async (owner, repo, prNumber, token) => {
  try {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/files`;
    const response = await githubFetchWithAutoRefresh(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);
    
    if (!response.ok) return { files: [], error: `Failed: ${response.status}` };
    
    const files = await response.json();
    return {
      files: files.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch || '',
      })),
      error: null,
    };
  } catch (error) {
    return { files: [], error: error.message };
  }
};

/**
 * Get PR reviews and calculate code quality score
 */
const getPRReviews = async (owner, repo, prNumber, token) => {
  try {
    const reviewsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/reviews`;
    const response = await githubFetchWithAutoRefresh(reviewsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);

    if (!response.ok) {
      return { reviews: [], score: 0, error: `Failed to fetch reviews: ${response.status}` };
    }

    const reviews = await response.json();
    
    // Calculate code review score based on:
    // - Number of review comments (more = lower initial score, but shows engagement)
    // - Approved reviews (+20 points each)
    // - Changes requested (-10 points each)
    // - Comments (neutral, +5 for engagement)
    let score = 70; // Base score
    let approvals = 0;
    let changesRequested = 0;
    let comments = 0;

    reviews.forEach(review => {
      if (review.state === 'APPROVED') {
        approvals++;
        score += 20;
      } else if (review.state === 'CHANGES_REQUESTED') {
        changesRequested++;
        score -= 10;
      } else if (review.state === 'COMMENTED') {
        comments++;
        score += 5;
      }
    });

    // Cap score between 0-100
    score = Math.max(0, Math.min(100, score));

    return {
      reviews: reviews.map(r => ({
        author: r.user?.login || 'unknown',
        state: r.state,
        body: r.body,
        submittedAt: r.submitted_at,
      })),
      score,
      summary: {
        approvals,
        changesRequested,
        comments,
      },
      error: null,
    };
  } catch (error) {
    console.error('[GitHub] Error fetching PR reviews:', error.message);
    return { reviews: [], score: 0, error: error.message };
  }
};

/**
 * Create a branch for an issue
 */
const createBranch = async (owner, repo, branchName, token) => {
  try {
    // Get the default branch's latest commit SHA
    const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const repoResponse = await githubFetchWithAutoRefresh(repoUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);

    if (!repoResponse.ok) {
      return { success: false, error: `Failed to fetch repo: ${repoResponse.status}` };
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || 'main';

    // Get the SHA of the default branch
    const branchUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${defaultBranch}`;
    const branchResponse = await githubFetchWithAutoRefresh(branchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);

    if (!branchResponse.ok) {
      return { success: false, error: `Failed to fetch branch: ${branchResponse.status}` };
    }

    const branchData = await branchResponse.json();
    const sha = branchData.object.sha;

    // Create the new branch
    const createBranchUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`;
    const createResponse = await githubFetchWithAutoRefresh(createBranchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    }, token);

    const createData = await createResponse.json();
    if (!createResponse.ok) {
      // Branch might already exist
      if (createResponse.status === 422) {
        return { success: true, alreadyExists: true, branchName };
      }
      return { success: false, error: createData.message || 'Failed to create branch' };
    }

    return { success: true, alreadyExists: false, branchName };
  } catch (error) {
    console.error('[GitHub] Error creating branch:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get branch activity including commits and comparison with default branch
 */
const getBranchActivity = async (owner, repo, branchName, token) => {
  try {
    // Get the default branch first
    const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const repoResponse = await githubFetchWithAutoRefresh(repoUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);

    if (!repoResponse.ok) {
      return { error: 'Failed to fetch repository info', commits: [], comparison: null };
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || 'main';

    // Fetch commits on this branch
    const commitsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branchName)}&per_page=20`;
    const commitsResponse = await githubFetchWithAutoRefresh(commitsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);

    let commits = [];
    if (commitsResponse.ok) {
      commits = await commitsResponse.json();
    }

    // Compare branch with default branch
    const compareUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(defaultBranch)}...${encodeURIComponent(branchName)}`;
    const compareResponse = await githubFetchWithAutoRefresh(compareUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);

    let comparison = null;
    if (compareResponse.ok) {
      comparison = await compareResponse.json();
    }

    return {
      branchName,
      defaultBranch,
      commits: commits.map(c => ({
        sha: c.sha,
        message: c.commit?.message || '',
        author: c.commit?.author?.name || 'Unknown',
        date: c.commit?.author?.date || null,
        url: c.html_url,
      })),
      comparison: comparison ? {
        aheadBy: comparison.ahead_by || 0,
        behindBy: comparison.behind_by || 0,
        totalCommits: comparison.total_commits || 0,
        status: comparison.status,
        filesChanged: comparison.files?.length || 0,
        additions: comparison.files?.reduce((sum, f) => sum + (f.additions || 0), 0) || 0,
        deletions: comparison.files?.reduce((sum, f) => sum + (f.deletions || 0), 0) || 0,
      } : null,
    };
  } catch (error) {
    console.error('[GitHub] Error fetching branch activity:', error.message);
    return { error: error.message, commits: [], comparison: null };
  }
};

/**
 * Get issue details with comments and events
 */
const getIssueDetails = async (owner, repo, issueNumber, token) => {
  try {
    const issueUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`;
    const response = await githubFetchWithAutoRefresh(issueUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);

    if (!response.ok) {
      return { issue: null, error: `Failed to fetch issue: ${response.status}`, status: response.status };
    }

    const issue = await response.json();
    
    // Get comments
    const commentsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`;
    const commentsResponse = await githubFetchWithAutoRefresh(commentsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, token);

    const comments = commentsResponse.ok ? await commentsResponse.json() : [];

    return {
      issue: {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        url: issue.html_url,
        labels: issue.labels?.map(l => l.name) || [],
        assignees: issue.assignees?.map(a => a.login) || [],
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        commentsCount: issue.comments || 0,
        comments: comments.slice(0, 5).map(c => ({
          author: c.user?.login || 'unknown',
          body: c.body,
          createdAt: c.created_at,
        })),
      },
      error: null,
    };
  } catch (error) {
    console.error('[GitHub] Error fetching issue details:', error.message);
    return { issue: null, error: error.message };
  }
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

      - name: Verify Issue Resolution
        uses: actions/github-script@v7
        with:
          script: |
            const prBody = context.payload.pull_request.body || '';
            const prTitle = context.payload.pull_request.title || '';
            const issuePattern = /#(\\d+)|closes\\s+#(\\d+)|fixes\\s+#(\\d+)|resolves\\s+#(\\d+)/gi;
            const matches = [...prBody.matchAll(issuePattern)];
            
            if (matches.length === 0) {
              await github.rest.pulls.createReview({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.payload.pull_request.number,
                event: 'COMMENT',
                body: '⚠️ **No linked issue found**\\n\\nPlease link this PR to an issue using keywords like "Fixes #123" or "Closes #456" in the PR description.'
              });
              return;
            }

            const issueNumbers = matches.map(m => m[1] || m[2] || m[3] || m[4]).filter(Boolean);
            
            for (const issueNum of issueNumbers) {
              const { data: issue } = await github.rest.issues.get({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: parseInt(issueNum)
              });

              // Extract requirements from issue
              const issueBody = issue.body || '';
              const issueTitle = issue.title || '';
              
              // Get PR files to analyze changes
              const { data: files } = await github.rest.pulls.listFiles({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.payload.pull_request.number
              });

              // Check if PR addresses the issue
              const verificationResults = [];
              
              // 1. Check if PR touches relevant files mentioned in issue
              const issueContent = \`\${issueTitle} \${issueBody}\`.toLowerCase();
              const fileMentions = files.filter(f => issueContent.includes(f.filename.toLowerCase()));
              
              if (fileMentions.length > 0) {
                verificationResults.push(\`✅ Modified \${fileMentions.length} file(s) mentioned in issue\`);
              }

              // 2. Check if issue description keywords appear in PR
              const keywords = ['implement', 'add', 'create', 'fix', 'update', 'remove', 'delete', 'refactor', 'migrate'];
              const issueKeywords = keywords.filter(k => issueContent.includes(k));
              const prContent = \`\${prTitle} \${prBody}\`.toLowerCase();
              const matchedKeywords = issueKeywords.filter(k => prContent.includes(k));
              
              if (matchedKeywords.length > 0) {
                verificationResults.push(\`✅ PR description matches issue intent: \${matchedKeywords.join(', ')}\`);
              }

              // 3. Check if sufficient code changes
              const totalChanges = files.reduce((sum, f) => sum + f.additions + f.deletions, 0);
              if (totalChanges === 0) {
                verificationResults.push('⚠️ No code changes detected');
              } else if (totalChanges < 10) {
                verificationResults.push(\`⚠️ Minimal changes (\${totalChanges} lines). Verify this fully addresses the issue.\`);
              } else {
                verificationResults.push(\`✅ Made \${totalChanges} line changes across \${files.length} file(s)\`);
              }

              // 4. Check for test files
              const testFiles = files.filter(f => 
                f.filename.includes('.test.') || 
                f.filename.includes('.spec.') || 
                f.filename.includes('test/')
              );
              if (testFiles.length > 0) {
                verificationResults.push(\`✅ Includes \${testFiles.length} test file(s)\`);
              }

              // Post verification summary
              const summary = \`## 🔍 Issue Resolution Verification

**Linked Issue:** #\${issueNum} - \${issue.title}

### Verification Results:
\${verificationResults.map(r => \`- \${r}\`).join('\\n')}

### Next Steps:
- Review the changes to ensure they fully address the issue requirements
- Verify that all acceptance criteria from the issue are met
- Check if additional test coverage is needed
              \`;

              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: parseInt(issueNum),
                body: summary
              });
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
                  body: \`⚠️ **Large change detected** (\${file.additions} additions). Consider breaking this into smaller, focused PRs.\`,
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
                body: \`## 🤖 AI Code Review (Quality)\\n\\nFound \${reviewComments.length} code quality suggestion(s). Review the inline comments below.\`,
                comments: reviewComments
              });
            } else {
              await github.rest.pulls.createReview({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.payload.pull_request.number,
                event: 'COMMENT',
                body: '## 🤖 AI Code Review (Quality)\\n\\n✅ No code quality issues found. Code looks good!'
              });
            }

      - name: GitHub Copilot Code Review
        uses: actions/github-script@v7
        with:
          script: |
            // Get list of changed files
            const { data: files } = await github.rest.pulls.listFiles({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.payload.pull_request.number
            });

            const fileList = files.map(f => \`- \${f.filename} (+\${f.additions}/-\${f.deletions})\`).join('\\n');
            
            // Request GitHub Copilot code review
            const copilotRequest = \`@github-copilot Please review this pull request:

**Changed Files:**
\${fileList}

**Review Focus:**
1. **Code Quality:** Assess code clarity, maintainability, and adherence to best practices
2. **Security:** Identify potential security vulnerabilities or unsafe patterns
3. **Performance:** Flag potential performance bottlenecks or inefficiencies
4. **Bugs:** Detect logical errors, edge cases, or potential runtime issues
5. **Recommendations:** Suggest specific improvements with code examples

Please provide:
- Specific line references where issues are found
- Severity level for each finding (Critical, High, Medium, Low)
- Concrete code suggestions for fixes
- Explanation of why each issue matters

Thank you!\`;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: copilotRequest
            });

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
    await createOrUpdateFile(
      owner,
      repo,
      '.github/workflows/copilot-review.yml',
      workflowContent,
      'Update GitHub Copilot code review workflow',
      token
    );
    return { success: true };
  } catch (error) {
    console.error('[GitHub] Failed to create workflow file:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { getTodayCommits, getRecentCommits, fetchGitHubJson, createIssue, checkCollaborator, addCollaborator, assignIssue, getGitHubUser, createRepo, createLabel, createFile, createOrUpdateFile, setupCopilotWorkflow, getPullRequestsForIssue, getIssueDetails, getPRReviews, getPRReviewComments, postPRReview, getPRDiff, createBranch, getBranchActivity };
