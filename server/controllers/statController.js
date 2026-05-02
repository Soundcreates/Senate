const { fetchTimeStats } = require("../services/wakatime-stats");
const { getSessionUserFromRequest } = require("../utils/sessionAuth");

const formatDate = (value) => {
   if (!value) return null;
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return null;
   return date.toISOString().slice(0, 10);
};

async function getWakatimeStats(req, res) {
   try {
      const user = await getSessionUserFromRequest(req);
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
