const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const externalDataService = require('../services/externalDataService');

// Get external data service status
router.get('/status', authenticate, async (req, res) => {
    try {
        const health = await externalDataService.getHealthStatus();
        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        console.error('Error getting external data status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get service status',
            error: error.message
        });
    }
});

// Get service statistics
router.get('/stats', authenticate, async (req, res) => {
    try {
        const stats = externalDataService.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting external data stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get service statistics',
            error: error.message
        });
    }
});

// Start external data services (admin only)
router.post('/start', authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        if (externalDataService.isRunning) {
            return res.json({
                success: true,
                message: 'External data service is already running',
                data: externalDataService.getStats()
            });
        }

        await externalDataService.start();
        
        res.json({
            success: true,
            message: 'External data service started successfully',
            data: externalDataService.getStats()
        });
    } catch (error) {
        console.error('Error starting external data service:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start external data service',
            error: error.message
        });
    }
});

// Stop external data services (admin only)
router.post('/stop', authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        if (!externalDataService.isRunning) {
            return res.json({
                success: true,
                message: 'External data service is already stopped'
            });
        }

        await externalDataService.stop();
        
        res.json({
            success: true,
            message: 'External data service stopped successfully'
        });
    } catch (error) {
        console.error('Error stopping external data service:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop external data service',
            error: error.message
        });
    }
});

// Manual FTP image check (admin only)
router.post('/ftp/check', authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const downloadedFiles = await externalDataService.manualImageCheck();
        
        res.json({
            success: true,
            message: 'Manual FTP check completed',
            data: {
                downloadedFiles: downloadedFiles.length,
                files: downloadedFiles
            }
        });
    } catch (error) {
        console.error('Error during manual FTP check:', error);
        res.status(500).json({
            success: false,
            message: 'Manual FTP check failed',
            error: error.message
        });
    }
});

// Send test UDP message (admin only)
router.post('/udp/test', authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        await externalDataService.sendTestUDPMessage(message);
        
        res.json({
            success: true,
            message: 'Test UDP message sent successfully'
        });
    } catch (error) {
        console.error('Error sending test UDP message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test UDP message',
            error: error.message
        });
    }
});

// Reset statistics (admin only)
router.post('/reset-stats', authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        externalDataService.resetStats();
        
        res.json({
            success: true,
            message: 'Statistics reset successfully',
            data: externalDataService.getStats()
        });
    } catch (error) {
        console.error('Error resetting statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset statistics',
            error: error.message
        });
    }
});

// Get recent activity (last 100 events)
router.get('/activity', authenticate, async (req, res) => {
    try {
        // This would typically come from a logging system or database
        // For now, return basic activity info
        const stats = externalDataService.getStats();
        const health = await externalDataService.getHealthStatus();
        
        const activity = {
            recentEvents: [
                {
                    type: 'service_status',
                    message: `Service is ${externalDataService.isRunning ? 'running' : 'stopped'}`,
                    timestamp: new Date().toISOString()
                },
                {
                    type: 'statistics',
                    message: `Processed ${stats.imagesProcessed} images, ${stats.finesReceived} fines`,
                    timestamp: new Date().toISOString()
                }
            ],
            summary: {
                totalEvents: stats.imagesProcessed + stats.finesReceived + stats.violationsReceived + stats.radarUpdates,
                errors: stats.errors,
                uptime: stats.uptime,
                services: health.services
            }
        };
        
        res.json({
            success: true,
            data: activity
        });
    } catch (error) {
        console.error('Error getting activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get activity',
            error: error.message
        });
    }
});

// Get correlation statistics (admin only)
router.get('/correlation/stats', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const stats = externalDataService.getCorrelationStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting correlation stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get correlation statistics',
            error: error.message
        });
    }
});

// Trigger manual correlation (admin only)
router.post('/correlation/trigger', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const result = await externalDataService.triggerManualCorrelation();
        
        res.json({
            success: true,
            message: 'Manual correlation triggered',
            data: result
        });
    } catch (error) {
        console.error('Error triggering manual correlation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger manual correlation',
            error: error.message
        });
    }
});

// Health check endpoint (public)
router.get('/health', async (req, res) => {
    try {
        const health = await externalDataService.getHealthStatus();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json({
            success: health.status === 'healthy',
            data: health
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
