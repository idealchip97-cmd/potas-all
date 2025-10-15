const express = require('express');
const router = express.Router();
const {
  getAICases,
  processAICases,
  getPendingCases,
  getAICaseDetails,
  getAIImage,
  getAIStats
} = require('../controllers/aiCaseController');

/**
 * AI Cases Routes
 * Handles ALPR processing of cases WITH verdict.json
 */

// Get all AI processed cases with filters
// GET /api/ai-cases?camera=camera001&date=2025-10-06&search=AB123&limit=50&offset=0
router.get('/', getAICases);

// Process all cases with verdict.json
// POST /api/ai-cases/process
router.post('/process', processAICases);

// Get cases with verdict.json (ready for processing)
// GET /api/ai-cases/pending
router.get('/pending', getPendingCases);

// Get AI processing statistics
// GET /api/ai-cases/stats
router.get('/stats', getAIStats);

// Get specific AI case details
// GET /api/ai-cases/:camera/:date/:caseId
router.get('/:camera/:date/:caseId', getAICaseDetails);

// Serve AI processed images
// GET /api/ai-cases/:camera/:date/:caseId/images/:filename
router.get('/:camera/:date/:caseId/images/:filename', getAIImage);

module.exports = router;
