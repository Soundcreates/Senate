const jwt = require("jsonwebtoken");
const User = require("../models/UserSchema");

const requireAdmin = async (req, res, next) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: "missing_jwt_secret" });
  }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.sub).lean();
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "admin_required" });
    }

    req.adminUser = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "invalid_token" });
  }
};

module.exports = requireAdmin;
