const express = require('express');
const router = express.Router();
const { 
  getDashboardStats, 
  getViolationTrends, 
  getRadarPerformance, 
  getSpeedAnalysis, 
  getViolationsByLocation, 
  getMonthlyReport, 
  getComplianceReport,
  getReportTypes,
  createReportType,
  generateReport,
  getReports,
  getReportById,
  createReportSchedule,
  getReportSchedules,
  getSystemMetrics,
  getAuditLogs
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

// All report routes require authentication
router.use(authenticate);

// Dashboard and analytics routes
router.get('/dashboard', getDashboardStats);
router.get('/trends', getViolationTrends);
router.get('/radar-performance', getRadarPerformance);
router.get('/speed-analysis', getSpeedAnalysis);
router.get('/violations-by-location', getViolationsByLocation);
router.get('/monthly', getMonthlyReport);
router.get('/compliance', getComplianceReport);

// Report Type Management
router.get('/types', getReportTypes);
router.post('/types', createReportType);

// Report Generation and Management
router.post('/generate', generateReport);
router.get('/', getReports);
router.get('/:id', getReportById);

// Report Scheduling
router.post('/schedules', createReportSchedule);
router.get('/schedules', getReportSchedules);

// System Monitoring
router.get('/metrics', getSystemMetrics);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
