const User = require("../models/UserSchema");

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const WAKATIME_TOKEN_URL = "https://wakatime.com/oauth/token";

const githubTokenAliasMap = new Map();
const wakatimeTokenAliasMap = new Map();
const githubRefreshInFlight = new Map();
const wakatimeRefreshInFlight = new Map();

const getExpiresAt = (expiresIn) => {
  const parsed = Number(expiresIn);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return new Date(Date.now() + parsed * 1000);
};

const resolveTokenAlias = (token, aliasMap) => {
  if (!token) return token;

  let current = token;
  const visited = new Set();
  while (aliasMap.has(current) && !visited.has(current)) {
    visited.add(current);
    current = aliasMap.get(current);
  }

  return current;
};

const setTokenAlias = (aliasMap, oldToken, newToken) => {
  if (!oldToken || !newToken || oldToken === newToken) return;
  aliasMap.set(oldToken, newToken);
};

const parseJsonResponse = async (response) => {
  const responseText = await response.text();
  if (!responseText) return {};

  try {
    return JSON.parse(responseText);
  } catch (_err) {
    return { raw: responseText };
  }
};

const runSingleFlightRefresh = async (inFlightMap, key, refreshFn) => {
  if (!key) {
    return refreshFn();
  }

  const existing = inFlightMap.get(key);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      return await refreshFn();
    } finally {
      inFlightMap.delete(key);
    }
  })();

  inFlightMap.set(key, promise);
  return promise;
};

const resolveGithubAccessToken = (token) =>
  resolveTokenAlias(token, githubTokenAliasMap);

const resolveWakaTimeAccessToken = (token) =>
  resolveTokenAlias(token, wakatimeTokenAliasMap);

const refreshGithubAccessTokenByCurrentToken = async (currentAccessToken) => {
  const resolvedAccessToken = resolveGithubAccessToken(currentAccessToken);
  if (!resolvedAccessToken) {
    const error = new Error("github_access_token_missing");
    error.code = "github_access_token_missing";
    throw error;
  }

  return runSingleFlightRefresh(
    githubRefreshInFlight,
    resolvedAccessToken,
    async () => {
      const user = await User.findOne({ "githubTokens.accessToken": resolvedAccessToken });
      if (!user) {
        const error = new Error("github_token_owner_not_found");
        error.code = "github_token_owner_not_found";
        throw error;
      }

      const refreshToken = user.githubTokens?.refreshToken;
      if (!refreshToken) {
        const error = new Error("github_refresh_token_missing");
        error.code = "github_refresh_token_missing";
        throw error;
      }

      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        const error = new Error("github_oauth_env_missing");
        error.code = "github_oauth_env_missing";
        throw error;
      }

      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

      const response = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: tokenParams.toString(),
      });

      const tokenData = await parseJsonResponse(response);
      if (!response.ok || !tokenData.access_token) {
        const error = new Error("github_refresh_failed");
        error.code = "github_refresh_failed";
        error.status = response.status;
        error.details = tokenData;
        throw error;
      }

      const refreshedGithubTokens = {
        accessToken: tokenData.access_token || null,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresAt: getExpiresAt(tokenData.expires_in),
        scope: tokenData.scope || user.githubTokens?.scope || null,
      };

      if (user.githubId) {
        await User.updateMany(
          { githubId: user.githubId },
          { $set: { githubTokens: refreshedGithubTokens } },
        );
      } else {
        user.githubTokens = refreshedGithubTokens;
        user.markModified("githubTokens");
        await user.save();
      }

      const refreshedAccessToken = refreshedGithubTokens.accessToken;
      setTokenAlias(githubTokenAliasMap, currentAccessToken, refreshedAccessToken);
      setTokenAlias(githubTokenAliasMap, resolvedAccessToken, refreshedAccessToken);

      return refreshedAccessToken;
    },
  );
};

const refreshWakaTimeAccessTokenByCurrentToken = async (currentAccessToken) => {
  const resolvedAccessToken = resolveWakaTimeAccessToken(currentAccessToken);
  if (!resolvedAccessToken) {
    const error = new Error("wakatime_access_token_missing");
    error.code = "wakatime_access_token_missing";
    throw error;
  }

  return runSingleFlightRefresh(
    wakatimeRefreshInFlight,
    resolvedAccessToken,
    async () => {
      const user = await User.findOne({ "wakatimeTokens.accessToken": resolvedAccessToken });
      if (!user) {
        const error = new Error("wakatime_token_owner_not_found");
        error.code = "wakatime_token_owner_not_found";
        throw error;
      }

      const refreshToken = user.wakatimeTokens?.refreshToken;
      if (!refreshToken) {
        const error = new Error("wakatime_refresh_token_missing");
        error.code = "wakatime_refresh_token_missing";
        throw error;
      }

      const clientId = process.env.WAKATIME_APP_ID;
      const clientSecret = process.env.WAKATIME_APP_SECRET;
      if (!clientId || !clientSecret) {
        const error = new Error("wakatime_oauth_env_missing");
        error.code = "wakatime_oauth_env_missing";
        throw error;
      }

      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

      const response = await fetch(WAKATIME_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: tokenParams.toString(),
      });

      const tokenData = await parseJsonResponse(response);
      if (!response.ok || !tokenData.access_token) {
        const error = new Error("wakatime_refresh_failed");
        error.code = "wakatime_refresh_failed";
        error.status = response.status;
        error.details = tokenData;
        throw error;
      }

      const refreshedWakaTimeTokens = {
        accessToken: tokenData.access_token || null,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresAt: getExpiresAt(tokenData.expires_in),
        scope: tokenData.scope || user.wakatimeTokens?.scope || null,
      };

      user.wakatimeTokens = refreshedWakaTimeTokens;
      user.markModified("wakatimeTokens");
      await user.save();

      const refreshedAccessToken = refreshedWakaTimeTokens.accessToken;
      setTokenAlias(wakatimeTokenAliasMap, currentAccessToken, refreshedAccessToken);
      setTokenAlias(wakatimeTokenAliasMap, resolvedAccessToken, refreshedAccessToken);

      return refreshedAccessToken;
    },
  );
};

module.exports = {
  resolveGithubAccessToken,
  resolveWakaTimeAccessToken,
  refreshGithubAccessTokenByCurrentToken,
  refreshWakaTimeAccessTokenByCurrentToken,
};
