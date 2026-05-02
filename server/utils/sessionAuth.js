const User = require("../models/UserSchema");

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

const getSessionUserFromRequest = async (req) => {
  const cookies = parseCookies(req);
  const userId = cookies.session_user;
  if (!userId) {
    return null;
  }

  try {
    return await User.findById(userId);
  } catch (_error) {
    return null;
  }
};

module.exports = {
  parseCookies,
  getSessionUserFromRequest,
};