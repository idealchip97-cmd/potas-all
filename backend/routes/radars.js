const express = require('express');
const { getAllRadars, getRadarById } = require('../controllers/radarController');
const { authenticate, authorize } = require('../middleware/auth');
const { Radar } = require('../models');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/radars');
    // Create directory if it doesn't exist
    fs.mkdir(uploadDir, { recursive: true }).then(() => {
      cb(null, uploadDir);
    }).catch(err => cb(err));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'radar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

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

// Discover radars from /srv/processing_inbox directory
router.get('/discover', async (req, res) => {
    try {
        const processingInbox = '/srv/processing_inbox';
        const discoveredRadars = [];
        
        // Read directory contents
        const entries = await fs.readdir(processingInbox);
        
        for (const entry of entries) {
            const entryPath = path.join(processingInbox, entry);
            const stat = await fs.stat(entryPath);
            
            if (stat.isDirectory() && entry.startsWith('camera')) {
                // Check if radar already exists in database
                let radar = await Radar.findOne({ where: { identifier: entry } });
                
                if (!radar) {
                    // Create new radar entry
                    radar = await Radar.create({
                        name: `Radar ${entry.replace('camera', '').padStart(3, '0')}`,
                        location: `Location ${entry}`,
                        identifier: entry,
                        ipAddress: `192.168.1.${60 + parseInt(entry.replace('camera', '')) || 60}`,
                        serialNumber: `RAD-${entry.toUpperCase()}-${Date.now()}`,
                        speedLimit: 50,
                        status: 'active',
                        latitude: 31.5497, // Default Dead Sea coordinates
                        longitude: 35.4732,
                        installationDate: new Date(),
                        lastMaintenance: new Date(),
                        ftpPath: entryPath,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    
                    console.log(`✅ Created new radar entry for ${entry}`);
                }
                
                // Count violations for this camera
                let violationCount = 0;
                try {
                    const dates = await fs.readdir(entryPath);
                    for (const date of dates) {
                        const datePath = path.join(entryPath, date);
                        const dateStat = await fs.stat(datePath);
                        if (dateStat.isDirectory()) {
                            const cases = await fs.readdir(datePath);
                            violationCount += cases.filter(c => c.startsWith('case')).length;
                        }
                    }
                } catch (e) {
                    // Directory might be empty or inaccessible
                }
                
                discoveredRadars.push({
                    ...radar.toJSON(),
                    violationCount
                });
            }
        }
        
        res.json({
            success: true,
            message: `Discovered ${discoveredRadars.length} radars`,
            data: { radars: discoveredRadars }
        });
        
    } catch (error) {
        console.error('Error discovering radars:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to discover radars',
            error: error.message
        });
    }
});

// Update radar information
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        // Handle image upload
        if (req.file) {
            updateData.imageUrl = `/uploads/radars/${req.file.filename}`;
        }
        
        // Update timestamp
        updateData.updatedAt = new Date();
        
        const [updatedRows] = await Radar.update(updateData, {
            where: { id: id }
        });
        
        if (updatedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Radar not found'
            });
        }
        
        // Fetch updated radar
        const updatedRadar = await Radar.findByPk(id);
        
        console.log(`✅ Updated radar #${id}: ${updatedRadar.name}`);
        
        res.json({
            success: true,
            message: 'Radar updated successfully',
            data: { radar: updatedRadar }
        });
        
    } catch (error) {
        console.error('Error updating radar:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update radar',
            error: error.message
        });
    }
});

// Delete radar
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const radar = await Radar.findByPk(id);
        if (!radar) {
            return res.status(404).json({
                success: false,
                message: 'Radar not found'
            });
        }
        
        // Delete image file if exists
        if (radar.imageUrl) {
            const imagePath = path.join(__dirname, '../../', radar.imageUrl);
            try {
                await fs.unlink(imagePath);
            } catch (e) {
                console.warn('Could not delete image file:', e.message);
            }
        }
        
        await radar.destroy();
        
        console.log(`🗑️ Deleted radar #${id}: ${radar.name}`);
        
        res.json({
            success: true,
            message: 'Radar deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting radar:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete radar',
            error: error.message
        });
    }
});

// Routes
router.get('/', getAllRadars);
router.get('/:id', getRadarById);

module.exports = router;
