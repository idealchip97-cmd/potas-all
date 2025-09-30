const express = require('express');
const { getAllFines, getFinesByRadarId, getFineById } = require('../controllers/fineController');
const { authenticate, authorize } = require('../middleware/auth');
const { Fine, Radar, PlateRecognition } = require('../models');

const router = express.Router();

// Clear all fines (admin only)
router.delete('/clear-all', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        // Delete all fines
        const deletedCount = await Fine.destroy({
            where: {},
            truncate: true
        });

        console.log(`🗑️ Cleared ${deletedCount} fines from database`);
        
        res.json({
            success: true,
            message: `Successfully cleared all fines`,
            deletedCount: deletedCount
        });
    } catch (error) {
        console.error('Error clearing fines:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear fines',
            error: error.message
        });
    }
});

// Get all fines with filtering and pagination
router.get('/', authenticate, async (req, res) => {
    try {
        const { page, limit, radarId, fineStatus } = req.query;
        const filter = {};

        if (radarId) {
            filter.radarId = radarId;
        }

        if (fineStatus) {
            filter.status = fineStatus;
        }

        const fines = await Fine.findAndCountAll({
            where: filter,
            offset: (page - 1) * limit,
            limit: limit
        });

        res.json({
            success: true,
            message: 'Fines retrieved successfully',
            data: fines.rows,
            count: fines.count
        });
    } catch (error) {
        console.error('Error retrieving fines:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve fines',
            error: error.message
        });
    }
});

router.get('/radar/:radarId', getFinesByRadarId);
router.get('/:id', getFineById);

module.exports = router;
