const express = require('express');
const { authenticate } = require('../middleware/auth');
const PlateRecognitionToFinesSync = require('../services/plateRecognitionToFinesSync');

const router = express.Router();
const syncService = new PlateRecognitionToFinesSync();

/**
 * POST /api/plate-recognition-sync/sync-to-fines
 * Sync existing plate recognition data with fines table
 */
router.post('/sync-to-fines', authenticate, async (req, res) => {
    try {
        console.log(`User ${req.user.email} initiated plate recognition to fines sync`);
        
        const result = await syncService.syncPlateRecognitionWithFines();
        
        res.json({
            success: true,
            message: `Successfully synced ${result.syncedCount} fines with plate recognition data`,
            data: result
        });
    } catch (error) {
        console.error('Error in sync-to-fines endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync plate recognition data with fines',
            error: error.message
        });
    }
});

/**
 * POST /api/plate-recognition-sync/create-fines
 * Create new fines from unprocessed plate recognition data
 */
router.post('/create-fines', authenticate, async (req, res) => {
    try {
        console.log(`User ${req.user.email} initiated fine creation from plate recognition`);
        
        const result = await syncService.createFinesFromPlateRecognition();
        
        res.json({
            success: true,
            message: `Successfully created ${result.createdCount} new fines from plate recognition data`,
            data: result
        });
    } catch (error) {
        console.error('Error in create-fines endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create fines from plate recognition data',
            error: error.message
        });
    }
});

/**
 * GET /api/plate-recognition-sync/statistics
 * Get synchronization statistics
 */
router.get('/statistics', authenticate, async (req, res) => {
    try {
        const stats = await syncService.getSyncStatistics();
        
        res.json({
            success: true,
            message: 'Sync statistics retrieved successfully',
            data: stats
        });
    } catch (error) {
        console.error('Error getting sync statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve sync statistics',
            error: error.message
        });
    }
});

/**
 * POST /api/plate-recognition-sync/full-sync
 * Perform complete synchronization (both directions)
 */
router.post('/full-sync', authenticate, async (req, res) => {
    try {
        console.log(`User ${req.user.email} initiated full plate recognition sync`);
        
        // First sync existing fines with plate data
        const syncResult = await syncService.syncPlateRecognitionWithFines();
        
        // Then create new fines from unprocessed plate data
        const createResult = await syncService.createFinesFromPlateRecognition();
        
        // Get updated statistics
        const stats = await syncService.getSyncStatistics();
        
        res.json({
            success: true,
            message: 'Full synchronization completed successfully',
            data: {
                sync: syncResult,
                create: createResult,
                statistics: stats
            }
        });
    } catch (error) {
        console.error('Error in full-sync endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform full synchronization',
            error: error.message
        });
    }
});

/**
 * GET /api/plate-recognition-sync/status
 * Get current sync status and recommendations
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const stats = await syncService.getSyncStatistics();
        
        // Generate recommendations based on statistics
        const recommendations = [];
        
        if (stats.fines.withoutPlates > 0) {
            recommendations.push({
                type: 'sync_needed',
                message: `${stats.fines.withoutPlates} fines are missing plate numbers. Consider running sync-to-fines.`,
                action: 'POST /api/plate-recognition-sync/sync-to-fines'
            });
        }
        
        if (stats.plateRecognitions.successful > stats.fines.withPlates) {
            recommendations.push({
                type: 'create_fines',
                message: 'There are more successful plate recognitions than fines with plates. Consider creating additional fines.',
                action: 'POST /api/plate-recognition-sync/create-fines'
            });
        }
        
        if (parseFloat(stats.fines.plateCompletionRate) < 80) {
            recommendations.push({
                type: 'low_completion',
                message: `Plate completion rate is ${stats.fines.plateCompletionRate}%. Consider running full sync.`,
                action: 'POST /api/plate-recognition-sync/full-sync'
            });
        }
        
        res.json({
            success: true,
            message: 'Sync status retrieved successfully',
            data: {
                statistics: stats,
                recommendations,
                lastChecked: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting sync status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve sync status',
            error: error.message
        });
    }
});

module.exports = router;
