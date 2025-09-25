const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const violationController = require('../controllers/violationController');

const router = express.Router();

// Violation management routes
router.post('/', authenticateToken, violationController.createViolation);
router.get('/', authenticateToken, violationController.getAllViolations);
router.get('/statistics', authenticateToken, violationController.getStatistics);
router.post('/bulk-confirm', authenticateToken, violationController.bulkConfirmViolations);
router.get('/:id', authenticateToken, violationController.getViolationById);
router.put('/:id', authenticateToken, violationController.updateViolation);
router.delete('/:id', authenticateToken, violationController.deleteViolation);

module.exports = router;
