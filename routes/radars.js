const express = require('express');
const { getAllRadars, getRadarById } = require('../controllers/radarController');
const { authenticate, authorize } = require('../middleware/auth');
const { Radar } = require('../models');

const router = express.Router();

// All radar routes require authentication
router.use(authenticate);

// Clear all radars (admin only)
router.delete('/clear-all', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        // Delete all radars
        const deletedCount = await Radar.destroy({
            where: {},
            truncate: true
        });

        console.log(`🗑️ Cleared ${deletedCount} radars from database`);
        
        res.json({
            success: true,
            message: `Successfully cleared all radars`,
            deletedCount: deletedCount
        });
    } catch (error) {
        console.error('Error clearing radars:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear radars',
            error: error.message
        });
    }
});

// Routes
router.get('/', getAllRadars);
router.get('/:id', getRadarById);

module.exports = router;
