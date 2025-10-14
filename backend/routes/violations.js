const express = require('express');
const { authenticate } = require('../middleware/auth');
const violationController = require('../controllers/violationController');

const router = express.Router();

// Violation management routes
router.post('/', authenticate, violationController.createViolation);
router.get('/', authenticate, violationController.getAllViolations);
router.get('/statistics', authenticate, violationController.getStatistics);
router.post('/bulk-confirm', authenticate, violationController.bulkConfirmViolations);
router.get('/:id', authenticate, violationController.getViolationById);
router.put('/:id', authenticate, violationController.updateViolation);
router.delete('/:id', authenticate, violationController.deleteViolation);

module.exports = router;
