const express = require('express');
const { getAllFines, getFinesByRadarId, getFineById } = require('../controllers/fineController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All fine routes require authentication
router.use(authenticate);

// Routes
router.get('/', getAllFines);
router.get('/radar/:radarId', getFinesByRadarId);
router.get('/:id', getFineById);

module.exports = router;
