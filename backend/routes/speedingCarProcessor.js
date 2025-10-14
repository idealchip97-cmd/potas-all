const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const SpeedingCarProcessorService = require('../services/speedingCarProcessorService');

// Initialize the speeding car processor service
const speedingCarProcessor = new SpeedingCarProcessorService();

/**
 * @route POST /api/speeding-car-processor/process
 * @desc Process a speeding car event with 3 photos
 * @access Public (for internal system use)
 */
router.post('/process', async (req, res) => {
    try {
        const { speedingEvent, photoFiles } = req.body;

        if (!speedingEvent || !speedingEvent.event_id) {
            return res.status(400).json({
                success: false,
                message: 'Invalid speeding event data. event_id is required.'
            });
        }

        console.log(`📨 API: Processing speeding car event: ${speedingEvent.event_id}`);

        const result = await speedingCarProcessor.processSpeedingCar(speedingEvent, photoFiles);

        res.json({
            success: true,
            message: 'Speeding car processed successfully',
            data: result
        });

    } catch (error) {
        console.error('❌ API Error processing speeding car:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing speeding car',
            error: error.message
        });
    }
});

/**
 * @route POST /api/speeding-car-processor/process-ftp-image
 * @desc Process an FTP image for a speeding event
 * @access Public (for internal system use)
 */
router.post('/process-ftp-image', async (req, res) => {
    try {
        const { ftpImagePath, speedingEvent } = req.body;

        if (!ftpImagePath || !speedingEvent) {
            return res.status(400).json({
                success: false,
                message: 'FTP image path and speeding event data are required.'
            });
        }

        console.log(`📨 API: Processing FTP image: ${ftpImagePath} for event: ${speedingEvent.event_id}`);

        const result = await speedingCarProcessor.processFtpImage(ftpImagePath, speedingEvent);

        res.json({
            success: true,
            message: 'FTP image processed successfully',
            data: result
        });

    } catch (error) {
        console.error('❌ API Error processing FTP image:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing FTP image',
            error: error.message
        });
    }
});

/**
 * @route GET /api/speeding-car-processor/events/:date
 * @desc Get processed speeding events for a specific date
 * @access Public
 */
router.get('/events/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const { camera_id } = req.query;

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD.'
            });
        }

        const baseProcessingPath = '/srv/processing_inbox';
        const cameraFolder = camera_id || 'camera002';
        const eventsPath = path.join(baseProcessingPath, cameraFolder, date);

        // Check if events directory exists
        if (!await fs.pathExists(eventsPath)) {
            return res.json({
                success: true,
                message: 'No events found for the specified date',
                data: {
                    date: date,
                    camera_id: cameraFolder,
                    events: []
                }
            });
        }

        // Read event directories
        const eventDirs = await fs.readdir(eventsPath, { withFileTypes: true });
        const events = [];

        for (const dir of eventDirs) {
            if (dir.isDirectory()) {
                const eventPath = path.join(eventsPath, dir.name);
                const verdictPath = path.join(eventPath, 'verdict.json');

                try {
                    // Read verdict file if exists
                    let verdictData = null;
                    if (await fs.pathExists(verdictPath)) {
                        verdictData = await fs.readJson(verdictPath);
                    }

                    // List photos
                    const files = await fs.readdir(eventPath);
                    const photos = files.filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'));

                    events.push({
                        event_id: dir.name,
                        event_path: eventPath,
                        verdict: verdictData,
                        photos: photos,
                        photo_count: photos.length,
                        has_verdict: verdictData !== null
                    });

                } catch (eventError) {
                    console.warn(`⚠️ Error reading event ${dir.name}:`, eventError.message);
                    events.push({
                        event_id: dir.name,
                        event_path: eventPath,
                        error: eventError.message,
                        photos: [],
                        photo_count: 0,
                        has_verdict: false
                    });
                }
            }
        }

        res.json({
            success: true,
            message: `Found ${events.length} events for ${date}`,
            data: {
                date: date,
                camera_id: cameraFolder,
                events: events.sort((a, b) => b.event_id.localeCompare(a.event_id))
            }
        });

    } catch (error) {
        console.error('❌ API Error getting events:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving events',
            error: error.message
        });
    }
});

/**
 * @route GET /api/speeding-car-processor/event/:eventId/verdict
 * @desc Get verdict JSON for a specific event
 * @access Public
 */
router.get('/event/:eventId/verdict', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { date, camera_id } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required (YYYY-MM-DD format)'
            });
        }

        const baseProcessingPath = '/srv/processing_inbox';
        const cameraFolder = camera_id || 'camera002';
        const verdictPath = path.join(baseProcessingPath, cameraFolder, date, eventId, 'verdict.json');

        if (!await fs.pathExists(verdictPath)) {
            return res.status(404).json({
                success: false,
                message: 'Verdict file not found for the specified event'
            });
        }

        const verdictData = await fs.readJson(verdictPath);

        res.json({
            success: true,
            message: 'Verdict retrieved successfully',
            data: verdictData
        });

    } catch (error) {
        console.error('❌ API Error getting verdict:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving verdict',
            error: error.message
        });
    }
});

/**
 * @route GET /api/speeding-car-processor/event/:eventId/photos
 * @desc Get photos for a specific event
 * @access Public
 */
router.get('/event/:eventId/photos', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { date, camera_id } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required (YYYY-MM-DD format)'
            });
        }

        const baseProcessingPath = '/srv/processing_inbox';
        const cameraFolder = camera_id || 'camera002';
        const eventPath = path.join(baseProcessingPath, cameraFolder, date, eventId);

        if (!await fs.pathExists(eventPath)) {
            return res.status(404).json({
                success: false,
                message: 'Event folder not found'
            });
        }

        const files = await fs.readdir(eventPath);
        const photos = [];

        for (const file of files) {
            if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
                const filePath = path.join(eventPath, file);
                const stats = await fs.stat(filePath);
                
                photos.push({
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                    url: `/api/speeding-car-processor/event/${eventId}/photo/${file}?date=${date}&camera_id=${cameraFolder}`
                });
            }
        }

        res.json({
            success: true,
            message: `Found ${photos.length} photos for event ${eventId}`,
            data: {
                event_id: eventId,
                photos: photos.sort((a, b) => a.filename.localeCompare(b.filename))
            }
        });

    } catch (error) {
        console.error('❌ API Error getting photos:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving photos',
            error: error.message
        });
    }
});

/**
 * @route GET /api/speeding-car-processor/event/:eventId/photo/:filename
 * @desc Serve a specific photo file
 * @access Public
 */
router.get('/event/:eventId/photo/:filename', async (req, res) => {
    try {
        const { eventId, filename } = req.params;
        const { date, camera_id } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required (YYYY-MM-DD format)'
            });
        }

        const baseProcessingPath = '/srv/processing_inbox';
        const cameraFolder = camera_id || 'camera002';
        const photoPath = path.join(baseProcessingPath, cameraFolder, date, eventId, filename);

        if (!await fs.pathExists(photoPath)) {
            return res.status(404).json({
                success: false,
                message: 'Photo not found'
            });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        // Stream the file
        const fileStream = fs.createReadStream(photoPath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('❌ API Error serving photo:', error);
        res.status(500).json({
            success: false,
            message: 'Error serving photo',
            error: error.message
        });
    }
});

/**
 * @route GET /api/speeding-car-processor/stats
 * @desc Get processing statistics
 * @access Public
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = speedingCarProcessor.getStats();
        
        res.json({
            success: true,
            message: 'Statistics retrieved successfully',
            data: stats
        });

    } catch (error) {
        console.error('❌ API Error getting stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving statistics',
            error: error.message
        });
    }
});

/**
 * @route GET /api/speeding-car-processor/dates
 * @desc Get available dates with violation data
 * @access Public
 */
router.get('/dates', async (req, res) => {
    try {
        const { camera_id } = req.query;
        const baseProcessingPath = '/srv/processing_inbox';
        const dates = new Set();

        // Get all camera folders or specific camera
        const camerasToCheck = camera_id ? [camera_id] : ['camera001', 'camera002'];
        
        for (const camera of camerasToCheck) {
            const cameraPath = path.join(baseProcessingPath, camera);
            
            if (await fs.pathExists(cameraPath)) {
                const dateDirs = await fs.readdir(cameraPath, { withFileTypes: true });
                
                for (const dir of dateDirs) {
                    if (dir.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(dir.name)) {
                        // Check if this date has any events
                        const datePath = path.join(cameraPath, dir.name);
                        const eventDirs = await fs.readdir(datePath, { withFileTypes: true });
                        
                        if (eventDirs.some(d => d.isDirectory())) {
                            dates.add(dir.name);
                        }
                    }
                }
            }
        }

        const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a)); // Newest first

        res.json({
            success: true,
            message: `Found ${sortedDates.length} dates with violation data`,
            data: {
                dates: sortedDates,
                cameras_checked: camerasToCheck
            }
        });

    } catch (error) {
        console.error('❌ API Error getting dates:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving dates',
            error: error.message
        });
    }
});

/**
 * @route GET /api/speeding-car-processor/cameras
 * @desc Get available cameras with violation data
 * @access Public
 */
router.get('/cameras', async (req, res) => {
    try {
        const baseProcessingPath = '/srv/processing_inbox';
        const cameras = [];

        if (await fs.pathExists(baseProcessingPath)) {
            const cameraDirs = await fs.readdir(baseProcessingPath, { withFileTypes: true });
            
            for (const dir of cameraDirs) {
                if (dir.isDirectory() && dir.name.startsWith('camera')) {
                    // Check if this camera has any data
                    const cameraPath = path.join(baseProcessingPath, dir.name);
                    const dateDirs = await fs.readdir(cameraPath, { withFileTypes: true });
                    
                    if (dateDirs.some(d => d.isDirectory())) {
                        cameras.push(dir.name);
                    }
                }
            }
        }

        res.json({
            success: true,
            message: `Found ${cameras.length} cameras with violation data`,
            data: {
                cameras: cameras.sort()
            }
        });

    } catch (error) {
        console.error('❌ API Error getting cameras:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving cameras',
            error: error.message
        });
    }
});

module.exports = router;
