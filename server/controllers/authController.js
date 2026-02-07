const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/UserSchema");

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = "7d";

const buildUserPayload = (user) => ({
	id: user._id.toString(),
	name: user.name || "Admin",
	email: user.email,
	role: user.role || "admin",
	provider: user.provider || "local",
	githubConnected: Boolean(user.githubTokens?.accessToken || user.githubId),
	wakatimeConnected: Boolean(user.wakatimeTokens?.accessToken),
});

const signToken = (user) =>
	jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });

const getBearerToken = (req) => {
	const authHeader = req.headers.authorization || "";
	if (!authHeader.startsWith("Bearer ")) return null;
	return authHeader.slice(7);
};

async function registerAdmin(req, res) {
	if (!JWT_SECRET) {
		return res.status(500).json({ error: "missing_jwt_secret" });
	}
	const { email, password, name } = req.body || {};
	if (!email || !password) {
		return res.status(400).json({ error: "missing_credentials" });
	}

	const normalizedEmail = String(email).trim().toLowerCase();
	const existing = await User.findOne({ email: normalizedEmail });
	if (existing) {
		return res.status(409).json({ error: "email_in_use" });
	}

	const passwordHash = await bcrypt.hash(String(password), 10);
	const user = await User.create({
		email: normalizedEmail,
		name: name ? String(name).trim() : "Admin",
		role: "admin",
		provider: "local",
		passwordHash,
	});

	const token = signToken(user);
	return res.status(201).json({
		ok: true,
		token,
		user: buildUserPayload(user),
	});
}

async function loginAdmin(req, res) {
	if (!JWT_SECRET) {
		return res.status(500).json({ error: "missing_jwt_secret" });
	}
	const { email, password } = req.body || {};
	if (!email || !password) {
		return res.status(400).json({ error: "missing_credentials" });
	}

	const normalizedEmail = String(email).trim().toLowerCase();
	const user = await User.findOne({ email: normalizedEmail, role: "admin" });
	if (!user || !user.passwordHash) {
		return res.status(401).json({ error: "invalid_credentials" });
	}

	const matches = await bcrypt.compare(String(password), user.passwordHash);
	if (!matches) {
		return res.status(401).json({ error: "invalid_credentials" });
	}

	const token = signToken(user);
	return res.status(200).json({ ok: true, token, user: buildUserPayload(user) });
}

async function getAdminProfile(req, res) {
	if (!JWT_SECRET) {
		return res.status(500).json({ error: "missing_jwt_secret" });
	}
	const token = getBearerToken(req);
	if (!token) {
		return res.status(401).json({ error: "missing_token" });
	}

	try {
		const payload = jwt.verify(token, JWT_SECRET);
		const user = await User.findById(payload.sub).lean();
		if (!user || user.role !== "admin") {
			return res.status(401).json({ error: "invalid_token" });
		}
		return res.status(200).json({ ok: true, user: buildUserPayload(user) });
	} catch (error) {
		return res.status(401).json({ error: "invalid_token" });
	}
}

function logoutAdmin(_req, res) {
	return res.status(200).json({ ok: true });
}

module.exports = {
	registerAdmin,
	loginAdmin,
	getAdminProfile,
	logoutAdmin,
};
