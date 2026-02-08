
const User = require("../models/UserSchema");
const { fetchTimeStats } = require("../services/wakatime-stats");

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

const formatDate = (value) => {
   if (!value) return null;
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return null;
   return date.toISOString().slice(0, 10);
};

async function getWakatimeStats(req, res) {
   try {
      const cookies = parseCookies(req);
      let userId = cookies.session_user;

      let user;
      if (userId) {
         user = await User.findById(userId).lean();
      }
      // DEV BYPASS: fall back to first user in DB when no session
      if (!user) {
         user = await User.findOne().lean();
      }
      if (!user) {
         return res.status(401).json({ error: "no_users_in_db" });
      }

      const accessToken = user.wakatimeTokens?.accessToken;
      if (!accessToken) {
         return res.status(400).json({ error: "wakatime_not_connected" });
      }

      const dateParam = formatDate(req.query.date);
      const startParam = formatDate(req.query.start);
      const endParam = formatDate(req.query.end);

      const today = new Date().toISOString().slice(0, 10);
      const startDate = startParam || dateParam || today;
      const endDate = endParam || dateParam || today;

      const data = await fetchTimeStats(accessToken, startDate, endDate);
      return res.status(200).json({ ok: true, data, startDate, endDate });
   } catch (error) {
      console.error("Failed to fetch WakaTime stats:", {
         message: error.message,
         code: error.code,
      });
      return res.status(500).json({ error: "wakatime_stats_failed" });
   }
}

module.exports = { getWakatimeStats };
