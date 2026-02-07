
const WAKATIME_AUTHORIZE_URL = "https://wakatime.com/oauth/authorize";
const WAKATIME_TOKEN_URL = "https://wakatime.com/oauth/token";
const WAKATIME_USER_URL = "https://wakatime.com/api/v1/users/current";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";
const User = require("../models/UserSchema");
const MANUAL_EMAIL_COOKIE = "manual_email";
const ROLE_COOKIE = "manual_role";
const OAUTH_REDIRECT_COOKIE = "oauth_redirect";
const WAKATIME_REDIRECT_COOKIE = "wakatime_redirect";

const buildRedirectUri = (req) =>
	process.env.WAKATIME_REDIRECT_URI ||
	`${req.protocol}://${req.get("host")}/api/oauth/wakatime-redirect`;

const buildClientRedirectUrl = (params = {}, path = "/login") => {
	const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
	const redirectUrl = new URL(path, baseUrl);

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			redirectUrl.searchParams.set(key, String(value));
		}
	});

	return redirectUrl.toString();
};

const buildGithubRedirectUri = (req) =>
	process.env.GITHUB_REDIRECT_URI ||
	`${req.protocol}://${req.get("host")}/api/oauth/github-redirect`;

const parseCookies = (req) => {
	const raw = req.headers.cookie;
	if (!raw) return {};
	return raw.split(";").reduce((acc, part) => {
		const [key, ...rest] = part.trim().split("=");
		if (!key) return acc;
		acc[key] = decodeURIComponent(rest.join("="));
		return acc;
	}, {});
};

async function HandleWakaTimeOAuth(req, res) {
	console.log("Backend starting wakatime oauth");
	const { code, error, error_description: errorDescription, redirectTo } = req.query;
	const clientId = process.env.WAKATIME_APP_ID;
	const clientSecret = process.env.WAKATIME_APP_SECRET;

	if (!clientId || !clientSecret) {
		console.log("No env vars set");
		return res
			.status(500)
			.json({ error: "missing_oauth_env", message: "Set WAKATIME_APP_ID and WAKATIME_APP_SECRET." });
	}
	

	if (error) {
		return res.status(400).json({ error, errorDescription });
	}

	const redirectUri = buildRedirectUri(req);
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
		console.log("Token params is :", tokenParams);

		const response = await fetch(WAKATIME_TOKEN_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
			body: tokenParams.toString(),
		});
		console.log(response.status);

		const responseText = await response.text();
		let tokenData = null;
		try {
			tokenData = JSON.parse(responseText);
			console.log(tokenData);
		} catch (_err) {
			tokenData = { raw: responseText };
		}

		if (!response.ok) {
			console.error("WakaTime token exchange failed", {
				status: response.status,
				body: tokenData,
			});
			return res.status(502).json({ error: "token_exchange_failed", details: tokenData });
		}
		console.log(WAKATIME_USER_URL);
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
			return res.status(502).json({ error: "wakatime_user_failed", details: userPayload });
		}

		const userData = userPayload?.data || {};
		const wakatimeId = userData.id || userData.username || null;
		const email =
			userData.email || (wakatimeId ? `wakatime-${wakatimeId}@wakatime.local` : null);

		if (!wakatimeId || !email) {
			return res.status(502).json({ error: "wakatime_user_missing", details: userData });
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
			{ new: true, upsert: true, setDefaultsOnInsert: true }
		);

		res.cookie("session_user", user._id.toString(), {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		const cookies = parseCookies(req);
		const redirectPath = cookies[WAKATIME_REDIRECT_COOKIE] === "register" ? "/register" : "/login";
		res.clearCookie(WAKATIME_REDIRECT_COOKIE, {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		});
		return res.redirect(buildClientRedirectUrl({ oauth: "success", provider: "wakatime" }, redirectPath));
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
	const { code, error, error_description: errorDescription, manualEmail, role } = req.query;
	const clientId = process.env.GITHUB_CLIENT_ID;
	const clientSecret = process.env.GITHUB_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		return res
			.status(500)
			.json({ error: "missing_oauth_env", message: "Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." });
	}

	if (error) {
		return res.status(400).json({ error, errorDescription });
	}

	const redirectUri = buildGithubRedirectUri(req);
	const scope = process.env.GITHUB_SCOPES || "read:user user:email";

	if (!code) {
		if (manualEmail) {
			res.cookie(MANUAL_EMAIL_COOKIE, manualEmail.trim().toLowerCase(), {
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.NODE_ENV === "production",
				maxAge: 15 * 60 * 1000,
			});
		}
		if (role === "admin" || role === "developer") {
			res.cookie(ROLE_COOKIE, role, {
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.NODE_ENV === "production",
				maxAge: 15 * 60 * 1000,
			});
		}
		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			scope,
		});
		return res.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`);
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
			return res.status(502).json({ error: "token_exchange_failed", details: tokenData });
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
			return res.status(502).json({ error: "github_user_failed", details: userData });
		}

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
				email = primaryVerified?.email || anyVerified?.email || firstEmail?.email || null;
			}
		}

		const githubId = userData.id ? String(userData.id) : null;
		if (!githubId) {
			return res.status(502).json({ error: "github_user_missing", details: userData });
		}

		const cookies = parseCookies(req);
		const manualEmailFromCookie = cookies[MANUAL_EMAIL_COOKIE];
		const roleFromCookie = cookies[ROLE_COOKIE];
		const lookupEmail = manualEmailFromCookie || email;

		const userQuery = lookupEmail
			? { $or: [{ githubId }, { email: lookupEmail }] }
			: { githubId };

		const user = await User.findOne(userQuery);
		if (!user) {
			return res.redirect(
				buildClientRedirectUrl({ oauth: "error", provider: "github", reason: "github_email_missing" }, "/register")
			);
		}

		user.githubId = githubId;
		user.githubTokens = {
			accessToken: tokenData.access_token || null,
			refreshToken: tokenData.refresh_token || null,
			expiresAt: null,
			scope: tokenData.scope || null,
		};

		if (roleFromCookie === "admin" || roleFromCookie === "developer") {
			user.role = roleFromCookie;
		}

		await user.save();

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

		res.cookie("session_user", user._id.toString(), {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		return res.redirect(buildClientRedirectUrl({ oauth: "success", provider: "github" }, "/dashboard"));
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
	const cookies = parseCookies(req);
	const userId = cookies.session_user;
	if (!userId) {
		return res.status(401).json({ error: "no_session" });
	}

	const user = await User.findById(userId).lean();
	if (!user) {
		return res.status(401).json({ error: "invalid_session" });
	}

	return res.status(200).json({
		user: {
			id: user._id.toString(),
			name: user.name,
			email: user.email,
			avatarUrl: user.avatarUrl || null,
			provider: user.provider || "wakatime",
			role: user.role || "developer",
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

module.exports = { HandleWakaTimeOAuth, HandleGithubOAuth, getSessionUser, logoutUser };