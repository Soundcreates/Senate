const WAKATIME_AUTHORIZE_URL = "https://wakatime.com/oauth/authorize";
const WAKATIME_TOKEN_URL = "https://wakatime.com/oauth/token";
const WAKATIME_USER_URL = "https://wakatime.com/api/v1/users/current";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";
const User = require("../models/UserSchema");
const { parseCookies, getSessionUserFromRequest } = require("../utils/sessionAuth");
const MANUAL_EMAIL_COOKIE = "manual_email";
const ROLE_COOKIE = "manual_role";
const OAUTH_REDIRECT_COOKIE = "oauth_redirect";
const WAKATIME_REDIRECT_COOKIE = "wakatime_redirect";

const getServerBaseUrl = () => process.env.SERVER_BASE_URL;
const WAKATIME_CALLBACK_URL = new URL(
  "/api/oauth/wakatime-redirect",
  getServerBaseUrl() || "http://invalid.local",
).toString();
const GITHUB_CALLBACK_URL = new URL(
  "/api/oauth/github-redirect",
  getServerBaseUrl() || "http://invalid.local",
).toString();

const buildRedirectUri = () => {
  if (!getServerBaseUrl()) {
    throw new Error("SERVER_BASE_URL is not set.");
  }
  const configured = process.env.WAKATIME_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return WAKATIME_CALLBACK_URL;
};

const buildClientRedirectUrl = (params = {}, path = "/login") => {
  const baseUrl = process.env.CLIENT_URL;
  if (!baseUrl) {
    throw new Error("CLIENT_URL is not set.");
  }
  const redirectUrl = new URL(path, baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      redirectUrl.searchParams.set(key, String(value));
    }
  });

  return redirectUrl.toString();
};

const buildGithubRedirectUri = () => {
  if (!getServerBaseUrl()) {
    throw new Error("SERVER_BASE_URL is not set.");
  }
  const configured = process.env.GITHUB_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return GITHUB_CALLBACK_URL;
};

const getSessionCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

const extractGithubUrls = (githubProfile = {}) => {
  return Object.entries(githubProfile).reduce((acc, [key, value]) => {
    const looksLikeUrl =
      typeof value === "string" && /^https?:\/\//i.test(value.trim());
    const isUrlField = key === "url" || key.endsWith("_url") || looksLikeUrl;
    if (isUrlField && typeof value === "string" && value.trim()) {
      acc[key] = value.trim();
    }
    return acc;
  }, {});
};

async function HandleWakaTimeOAuth(req, res) {
  console.log("Backend starting wakatime oauth");
  const {
    code,
    error,
    error_description: errorDescription,
    redirectTo,
  } = req.query;
  const clientId = process.env.WAKATIME_APP_ID;
  const clientSecret = process.env.WAKATIME_APP_SECRET;

  if (!clientId || !clientSecret) {
    console.log("No env vars set");
    return res.status(500).json({
      error: "missing_oauth_env",
      message: "Set WAKATIME_APP_ID and WAKATIME_APP_SECRET.",
    });
  }

  if (error) {
    return res.status(400).json({ error, errorDescription });
  }

  const redirectUri = buildRedirectUri();
  const scope = process.env.WAKATIME_SCOPES || "read_stats";

  if (!code) {
    if (redirectTo) {
      res.cookie(WAKATIME_REDIRECT_COOKIE, redirectTo, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60 * 1000,
      });
    }
    console.log("No code received, redirecting to WakaTime authorize URL");
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope,
    });
    return res.redirect(`${WAKATIME_AUTHORIZE_URL}?${params.toString()}`);
  }

  try {
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code,
    });

    const response = await fetch(WAKATIME_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenParams.toString(),
    });

    const responseText = await response.text();
    let tokenData = null;
    try {
      tokenData = JSON.parse(responseText);
    } catch (_err) {
      tokenData = { raw: responseText };
    }

    if (!response.ok) {
      console.error("WakaTime token exchange failed", {
        status: response.status,
        error: tokenData?.error || "token_exchange_failed",
      });
      return res
        .status(502)
        .json({ error: "token_exchange_failed", details: tokenData });
    }
    const userResponse = await fetch(WAKATIME_USER_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    const userPayload = await userResponse.json();
    if (!userResponse.ok) {
      console.error("WakaTime user fetch failed", {
        status: userResponse.status,
        body: userPayload,
      });
      return res
        .status(502)
        .json({ error: "wakatime_user_failed", details: userPayload });
    }

    const userData = userPayload?.data || {};
    const wakatimeId = userData.id || userData.username || null;
    const email =
      userData.email ||
      (wakatimeId ? `wakatime-${wakatimeId}@wakatime.local` : null);

    if (!wakatimeId || !email) {
      return res
        .status(502)
        .json({ error: "wakatime_user_missing", details: userData });
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000)
      : null;

    const user = await User.findOneAndUpdate(
      { email },
      {
        name: userData.display_name || userData.username || "WakaTime User",
        email,
        avatarUrl: userData.photo || userData.profile_image || null,
        provider: "wakatime",
        wakatimeId,
        wakatimeTokens: {
          accessToken: tokenData.access_token || null,
          refreshToken: tokenData.refresh_token || null,
          expiresAt,
          scope: tokenData.scope || null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    res.cookie("session_user", user._id.toString(), getSessionCookieOptions());

    const cookies = parseCookies(req);
    const redirectPath =
      cookies[WAKATIME_REDIRECT_COOKIE] === "register" ? "/register" : "/login";
    res.clearCookie(WAKATIME_REDIRECT_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res.redirect(
      buildClientRedirectUrl(
        { oauth: "success", provider: "wakatime" },
        redirectPath,
      ),
    );
  } catch (err) {
    console.error("WakaTime token request failed", {
      message: err.message,
      cause: err.cause?.message,
      code: err.code,
    });
    return res.status(500).json({ error: "oauth_error", message: err.message });
  }
}

async function HandleGithubOAuth(req, res) {
  console.log("Backend starting github oauth");
  const {
    code,
    error,
    error_description: errorDescription,
    manualEmail,
    role,
    redirectTo,
  } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: "missing_oauth_env",
      message: "Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.",
    });
  }

  if (error) {
    return res.status(400).json({ error, errorDescription });
  }

  const redirectUri = buildGithubRedirectUri();
  const scope = process.env.GITHUB_SCOPES || "read:user user:email";

  if (!code) {
    if (redirectTo) {
      res.cookie(OAUTH_REDIRECT_COOKIE, redirectTo, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 15 * 60 * 1000,
      });
    }
    if (manualEmail) {
      res.cookie(MANUAL_EMAIL_COOKIE, manualEmail.trim().toLowerCase(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 15 * 60 * 1000,
      });
    }
    if (role === "admin" || role === "developer") {
      res.cookie(ROLE_COOKIE, role, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 15 * 60 * 1000,
      });
    }

    // Encode email + role into OAuth state so they survive the GitHub redirect
    const statePayload = JSON.stringify({
      email: manualEmail ? manualEmail.trim().toLowerCase() : undefined,
      role: role || undefined,
      redirectTo: redirectTo || undefined,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
    });
    return res.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`);
  }

  // Decode state returned by GitHub (more reliable than cookies for cross-path redirects)
  let stateData = {};
  try {
    const rawState = req.query.state;
    if (rawState) {
      stateData = JSON.parse(Buffer.from(rawState, "base64").toString());
    }
  } catch (_e) {
    /* ignore malformed state */
  }

  try {
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      return res
        .status(502)
        .json({ error: "token_exchange_failed", details: tokenData });
    }

    const userResponse = await fetch(GITHUB_USER_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Datathon-2026",
      },
    });

    const userData = await userResponse.json();
    if (!userResponse.ok) {
      return res
        .status(502)
        .json({ error: "github_user_failed", details: userData });
    }
    const githubUrls = extractGithubUrls(userData);

    let email = userData.email || null;
    if (!email) {
      const emailsResponse = await fetch(GITHUB_EMAILS_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Datathon-2026",
        },
      });
      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primaryVerified = Array.isArray(emails)
          ? emails.find((entry) => entry.primary && entry.verified)
          : null;
        const anyVerified = Array.isArray(emails)
          ? emails.find((entry) => entry.verified)
          : null;
        const firstEmail = Array.isArray(emails) ? emails[0] : null;
        email =
          primaryVerified?.email ||
          anyVerified?.email ||
          firstEmail?.email ||
          null;
      }
    }

    const githubId = userData.id ? String(userData.id) : null;
    if (!githubId) {
      return res
        .status(502)
        .json({ error: "github_user_missing", details: userData });
    }

    const cookies = parseCookies(req);
    const manualEmailFromCookie = cookies[MANUAL_EMAIL_COOKIE];
    const roleFromCookie = cookies[ROLE_COOKIE];
    const lookupEmail = manualEmail || manualEmailFromCookie || email;

    const githubExpiresAt = tokenData.expires_in
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000)
      : null;

    const freshGithubTokens = {
      accessToken: tokenData.access_token || null,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: githubExpiresAt,
      scope: tokenData.scope || null,
    };
    const existingByGithubId = await User.findOne({ githubId });
    let user;

    if (!existingByGithubId) {
      // No account with this GitHub ID → create fresh or link to existing email
      const existingByEmail = lookupEmail
        ? await User.findOne({ email: lookupEmail })
        : null;
      if (existingByEmail) {
        console.log(
          "No githubId in db but email exists, linking GitHub to existing account",
        );
        user = existingByEmail;
      } else {
        console.log("Seeing no github id in db, creating fresh user");
        user = await createUser({
          name: userData.name || userData.login,
          email: lookupEmail,
          avatarUrl: userData.avatar_url || null,
          githubId,
          githubUsername: userData.login || null,
          githubUrls,
          role: roleFromCookie || "developer",
          githubTokens: freshGithubTokens,
        });
      }
    } else if (existingByGithubId.email !== lookupEmail) {
      // GitHub ID exists but different email → user wants a second account with a different role
      const existingByEmail = lookupEmail
        ? await User.findOne({ email: lookupEmail })
        : null;
      if (existingByEmail) {
        console.log(
          "GitHub id in db with diff email, but target email already exists — linking GitHub to it",
        );
        console.log("User applying for role: ", roleFromCookie);
        console.log("User actually applying for: ", role);
 
        user = existingByEmail;
        user.role = role;
        await user.save();
     } else {
        console.log(
          "GitHub id in db but diff email, creating new user for alternate role",
        );
        console.log("User applying for role: ", roleFromCookie);
        console.log("User actually applying for: ", role);
        user = await createUser({
          name: userData.name || userData.login,
          email: lookupEmail,          
          avatarUrl: userData.avatar_url || null,
          githubId,
          githubUsername: userData.login || null,
          githubUrls,
          role: role,
          githubTokens: freshGithubTokens,
        });
      }
    } else {
      // Same GitHub ID, same email → update existing user
      user = existingByGithubId;
    }

    // Unified update: always persist fresh tokens, profile, and role on the resolved user
    user.name = userData.name || userData.login;
    user.avatarUrl = userData.avatar_url || user.avatarUrl || null;
    user.githubId = githubId;
    user.githubUsername = userData.login || null;
    user.githubTokens = freshGithubTokens;
    user.markModified("githubTokens");
    user.githubUrls = githubUrls;
    if (roleFromCookie === "admin" || roleFromCookie === "developer") {
      user.role = roleFromCookie;
    }
    await user.save();

    // Sync fresh tokens to all other accounts sharing the same githubId
    await User.updateMany(
      { githubId, _id: { $ne: user._id } },
      { $set: { githubTokens: freshGithubTokens, githubUrls } },
    );

    if (manualEmailFromCookie) {
      res.clearCookie(MANUAL_EMAIL_COOKIE, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    if (roleFromCookie) {
      res.clearCookie(ROLE_COOKIE, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    res.cookie("session_user", user._id.toString(), getSessionCookieOptions());

    const redirectPath =
      cookies[OAUTH_REDIRECT_COOKIE] === "register"
        ? "/register"
        : "/dashboard";
    res.clearCookie(OAUTH_REDIRECT_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res.redirect(
      buildClientRedirectUrl(
        { oauth: "success", provider: "github" },
        redirectPath,
      ),
    );
  } catch (err) {
    console.error("GitHub token request failed", {
      message: err.message,
      cause: err.cause?.message,
      code: err.code,
    });
    return res.status(500).json({ error: "oauth_error", message: err.message });
  }
}

async function getSessionUser(req, res) {
  const user = await getSessionUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "no_users_in_db" });
  }

  return res.status(200).json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl || null,
      provider: user.provider || "wakatime",
      role: user.role || "developer",
      githubUrls: user.githubUrls || {},
      githubConnected: Boolean(user.githubTokens?.accessToken || user.githubId),
      wakatimeConnected: Boolean(user.wakatimeTokens?.accessToken),
    },
  });
}

function logoutUser(req, res) {
  res.clearCookie("session_user", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res.status(200).json({ ok: true });
}
async function createUser({
  name,
  email,
  avatarUrl,
  githubId,
  githubUsername,
  githubUrls,
  role,
  githubTokens,
}) {
  return await User.create({
    name,
    email,
    provider: "github",
    avatarUrl: avatarUrl || null,
    githubId,
    githubUsername: githubUsername || null,
    githubUrls: githubUrls || {},
    role: role || "developer",
    githubTokens: {
      accessToken: githubTokens?.accessToken || null,
      refreshToken: githubTokens?.refreshToken || null,
      expiresAt: githubTokens?.expiresAt || null,
      scope: githubTokens?.scope || null,
    },
  });
}
module.exports = {
  HandleWakaTimeOAuth,
  HandleGithubOAuth,
  getSessionUser,
  logoutUser,
};
