const express = require('express');
const { getAllRadars, getRadarById } = require('../controllers/radarController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All radar routes require authentication
router.use(authenticate);

// Routes
router.get('/', getAllRadars);
router.get('/:id', getRadarById);

module.exports = router;
