const ProjectDailyStats = require("../models/ProjectDailyStats");

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const storeTodayStats = async (projectId, commits) => {
  const date = getTodayDateString();
  const commitList = Array.isArray(commits) ? commits : [];

  const stats = await ProjectDailyStats.findOneAndUpdate(
    { projectId, date },
    {
      projectId,
      date,
      commits: commitList,
      commitsCount: commitList.length,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return stats;
};

module.exports = { storeTodayStats };
