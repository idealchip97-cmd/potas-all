const express = require('express');
const { getAllFines, getFinesByRadarId, getFineById } = require('../controllers/fineController');
const { authenticate, authorize } = require('../middleware/auth');
const { Fine, Radar, PlateRecognition } = require('../models');
const fs = require('fs').promises;
const path = require('path');

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

        // Delete all fines (use destroy instead of truncate to handle foreign keys)
        const deletedCount = await Fine.destroy({
            where: {},
            force: true
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
router.get('/', authenticate, getAllFines);

// Approve violation and save to fines table
router.post('/approve', authenticate, async (req, res) => {
    try {
        const { camera, date, caseId, plateNumber, imageUrl } = req.body;
        
        if (!camera || !date || !caseId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: camera, date, caseId'
            });
        }

        // Read verdict.json and ai.json files
        const casePath = `/srv/processing_inbox/${camera}/${date}/${caseId}`;
        let verdictData = null;
        let aiData = null;

        try {
            // Read verdict.json
            const verdictPath = path.join(casePath, 'verdict.json');
            const verdictContent = await fs.readFile(verdictPath, 'utf8');
            verdictData = JSON.parse(verdictContent);
        } catch (error) {
            console.log(`No verdict.json found for case ${caseId}`);
        }

        try {
            // Read ai.json
            const aiPath = path.join(casePath, 'ai', 'ai.json');
            const aiContent = await fs.readFile(aiPath, 'utf8');
            aiData = JSON.parse(aiContent);
        } catch (error) {
            console.log(`No ai.json found for case ${caseId}`);
        }

        // Extract data for fine creation
        const speedDetected = verdictData?.verdict?.speed || 50; // Default if not available
        const speedLimit = verdictData?.verdict?.limit || 30; // Default if not available
        const violationAmount = speedDetected - speedLimit;
        const fineAmount = violationAmount > 20 ? 200.00 : violationAmount > 10 ? 100.00 : 50.00;
        const detectedPlate = plateNumber || aiData?.plate_number || aiData?.best_detection?.plate || 'Unknown';
        
        // Find or create a radar entry (use camera as radar identifier)
        let radarId = 1; // Default radar
        try {
            const radar = await Radar.findOne({ where: { name: { [require('sequelize').Op.like]: `%${camera}%` } } });
            if (radar) radarId = radar.id;
        } catch (error) {
            console.log('Using default radar ID');
        }

        // Create fine record
        const fine = await Fine.create({
            radarId: radarId,
            vehiclePlate: detectedPlate,
            speedDetected: speedDetected,
            speedLimit: speedLimit,
            violationAmount: violationAmount,
            fineAmount: fineAmount,
            violationDateTime: new Date(verdictData?.verdict?.timestamp || new Date()),
            status: 'pending',
            imageUrl: imageUrl,
            notes: `AI-approved violation from ${camera} case ${caseId}. Plate: ${detectedPlate}`,
            processedBy: req.user.id,
            processedAt: new Date()
        });

        console.log(`✅ Approved and saved fine for case ${caseId}, plate: ${detectedPlate}`);
        
        res.json({
            success: true,
            message: 'Violation approved and saved to fines table',
            fine: fine,
            data: {
                fineId: fine.id,
                plateNumber: detectedPlate,
                speedDetected: speedDetected,
                speedLimit: speedLimit,
                fineAmount: fineAmount
            }
        });
    } catch (error) {
        console.error('Error approving violation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve violation',
            error: error.message
        });
    }
});

// Deny violation and remove from fines table if exists
router.post('/deny', authenticate, async (req, res) => {
    try {
        const { camera, date, caseId, plateNumber } = req.body;
        
        if (!camera || !date || !caseId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: camera, date, caseId'
            });
        }

        // Try to find and remove any existing fine for this case
        const deletedCount = await Fine.destroy({
            where: {
                notes: {
                    [require('sequelize').Op.like]: `%case ${caseId}%`
                }
            }
        });

        console.log(`❌ Denied violation for case ${caseId}, removed ${deletedCount} fines`);
        
        res.json({
            success: true,
            message: 'Violation denied and removed from fines table',
            data: {
                caseId: caseId,
                plateNumber: plateNumber,
                removedFines: deletedCount
            }
        });
    } catch (error) {
        console.error('Error denying violation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to deny violation',
            error: error.message
        });
    }
});

// Delete fine by ID
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const fineId = parseInt(req.params.id);
        
        if (!fineId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid fine ID'
            });
        }

        // Find the fine first
        const fine = await Fine.findByPk(fineId);
        
        if (!fine) {
            return res.status(404).json({
                success: false,
                message: 'Fine not found'
            });
        }

        // Delete the fine
        await fine.destroy();
        
        console.log(`🗑️ Deleted fine #${fineId} by user ${req.user.email}`);
        
        res.json({
            success: true,
            message: 'Fine deleted successfully',
            data: {
                deletedFineId: fineId
            }
        });
    } catch (error) {
        console.error('Error deleting fine:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete fine',
            error: error.message
        });
    }
});

// Update fine by ID
router.put('/:id', authenticate, async (req, res) => {
    try {
        const fineId = parseInt(req.params.id);
        const updateData = req.body;
        
        if (!fineId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid fine ID'
            });
        }

        // Find the fine first
        const fine = await Fine.findByPk(fineId);
        
        if (!fine) {
            return res.status(404).json({
                success: false,
                message: 'Fine not found'
            });
        }

        // Update the fine
        await fine.update(updateData);
        
        console.log(`✏️ Updated fine #${fineId} by user ${req.user.email}`, updateData);
        
        res.json({
            success: true,
            message: 'Fine updated successfully',
            data: fine
        });
    } catch (error) {
        console.error('Error updating fine:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update fine',
            error: error.message
        });
    }
});

router.get('/radar/:radarId', getFinesByRadarId);
router.get('/:id', getFineById);

module.exports = router;
