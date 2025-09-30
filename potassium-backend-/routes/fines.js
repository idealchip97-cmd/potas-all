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
        const { page = 1, limit = 10, radarId, fineStatus } = req.query;
        const filter = {};

        // Validate pagination parameters
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        if (radarId) {
            filter.radarId = parseInt(radarId);
        }

        if (fineStatus) {
            filter.status = fineStatus;
        }

        const fines = await Fine.findAndCountAll({
            where: filter,
            offset: offset,
            limit: limitNum,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Radar,
                    as: 'radar',
                    attributes: ['id', 'name', 'location']
                }
            ]
        });

        res.json({
            success: true,
            message: 'Fines retrieved successfully',
            data: {
                fines: fines.rows,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(fines.count / limitNum),
                    totalItems: fines.count,
                    itemsPerPage: limitNum
                }
            }
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

router.get('/radar/:radarId', authenticate, getFinesByRadarId);
router.get('/:id', authenticate, getFineById);

module.exports = router;
