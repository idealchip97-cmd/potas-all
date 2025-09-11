const express = require('express');
const { getDashboardStats, getViolationTrends, getRadarPerformance } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All report routes require authentication
router.use(authenticate);

// Routes
router.get('/dashboard', getDashboardStats);
router.get('/trends', getViolationTrends);
router.get('/radar-performance', getRadarPerformance);

module.exports = router;
