const express = require('express');
const { splitIntoTasks } = require('../controllers/geminiController');

const router = express.Router();

router.post('/split-tasks', splitIntoTasks);

module.exports = router;
