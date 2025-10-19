const express = require('express');
const router = express.Router();
const AiToFinesSync = require('../services/aiToFinesSync');

// Create singleton instance
const aiSyncService = new AiToFinesSync();

/**
 * Start AI to Fines synchronization
 */
router.post('/start', async (req, res) => {
  try {
    await aiSyncService.start();
    res.json({
      success: true,
      message: 'AI to Fines synchronization started'
    });
  } catch (error) {
    console.error('Error starting AI sync:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Stop AI to Fines synchronization
 */
router.post('/stop', async (req, res) => {
  try {
    aiSyncService.stop();
    res.json({
      success: true,
      message: 'AI to Fines synchronization stopped'
    });
  } catch (error) {
    console.error('Error stopping AI sync:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get AI sync statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await aiSyncService.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting AI sync stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Trigger manual sync
 */
router.post('/sync', async (req, res) => {
  try {
    await aiSyncService.syncAllAiResults();
    res.json({
      success: true,
      message: 'Manual synchronization completed'
    });
  } catch (error) {
    console.error('Error in manual sync:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Auto-start the service when the module is loaded - DISABLED
// This should only run when manually approved through plate recognition UI
// aiSyncService.start().catch(error => {
//   console.error('Failed to auto-start AI sync service:', error);
// });

module.exports = router;
