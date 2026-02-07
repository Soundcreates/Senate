const express = require('express');
const { splitIntoTasks, generateTitle } = require('../controllers/geminiController');

const router = express.Router();

router.post('/split-tasks', splitIntoTasks);
router.post('/generate-title', generateTitle);

module.exports = router;
