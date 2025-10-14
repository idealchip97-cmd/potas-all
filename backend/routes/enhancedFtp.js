const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const SpeedingCarProcessorService = require('../services/speedingCarProcessorService');

// Initialize services
const speedingCarProcessor = new SpeedingCarProcessorService();

/**
 * @route POST /api/enhanced-ftp/process-speeding-event
 * @desc Process a speeding event from FTP with associated images
 * @access Public (for internal system use)
 */
router.post('/process-speeding-event', async (req, res) => {
    try {
        const { speedingEvent, ftpImages } = req.body;

        if (!speedingEvent || !speedingEvent.event_id) {
            return res.status(400).json({
                success: false,
                message: 'Invalid speeding event data. event_id is required.'
            });
        }

        console.log(`📨 Enhanced FTP: Processing speeding event: ${speedingEvent.event_id}`);
        console.log(`📸 FTP Images provided: ${ftpImages ? ftpImages.length : 0}`);

        // Process with the new system
        const result = await speedingCarProcessor.processSpeedingCar(speedingEvent, ftpImages);

        res.json({
            success: true,
            message: 'Speeding event processed successfully via enhanced FTP',
            data: result
        });

    } catch (error) {
        console.error('❌ Enhanced FTP Error processing speeding event:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing speeding event',
            error: error.message
        });
    }
});

/**
 * @route POST /api/enhanced-ftp/simulate-speeding-event
 * @desc Simulate a speeding event for testing the new system
 * @access Public (for testing)
 */
router.post('/simulate-speeding-event', async (req, res) => {
    try {
        const { speed, camera_id } = req.body;

        // Create a simulated speeding event
        const currentTime = Date.now() / 1000;
        const speedingEvent = {
            event_id: `${camera_id || 'camera002'}:${new Date().toISOString()}:${speed || 70}`,
            camera_id: camera_id || 'camera002',
            src_ip: '192.168.1.60',
            event_ts: currentTime,
            arrival_ts: currentTime,
            decision: 'violation',
            speed: speed || 70,
            limit: 30,
            payload: {
                decision: 'violation',
                limit: 30,
                speed: speed || 70,
                camera_id: camera_id || 'camera002',
                event_ts: new Date().toISOString(),
                event_id: `${camera_id || 'camera002'}:${new Date().toISOString()}:${speed || 70}`
            }
        };

        console.log(`🧪 Simulating speeding event: ${speedingEvent.event_id}`);

        // Process with the new system (no actual photos, will create placeholders)
        const result = await speedingCarProcessor.processSpeedingCar(speedingEvent);

        res.json({
            success: true,
            message: 'Simulated speeding event processed successfully',
            data: result,
            simulation: true
        });

    } catch (error) {
        console.error('❌ Error simulating speeding event:', error);
        res.status(500).json({
            success: false,
            message: 'Error simulating speeding event',
            error: error.message
        });
    }
});

/**
 * @route GET /api/enhanced-ftp/processing-inbox/status
 * @desc Get status of the processing inbox directory
 * @access Public
 */
router.get('/processing-inbox/status', async (req, res) => {
    try {
        const baseProcessingPath = '/srv/processing_inbox';
        
        // Ensure processing inbox exists
        await fs.ensureDir(baseProcessingPath);
        
        // Get directory structure
        const cameras = [];
        
        try {
            const cameraFolders = await fs.readdir(baseProcessingPath, { withFileTypes: true });
            
            for (const cameraFolder of cameraFolders) {
                if (cameraFolder.isDirectory()) {
                    const cameraPath = path.join(baseProcessingPath, cameraFolder.name);
                    const dates = [];
                    
                    try {
                        const dateFolders = await fs.readdir(cameraPath, { withFileTypes: true });
                        
                        for (const dateFolder of dateFolders) {
                            if (dateFolder.isDirectory()) {
                                const datePath = path.join(cameraPath, dateFolder.name);
                                const events = await fs.readdir(datePath, { withFileTypes: true });
                                const eventCount = events.filter(e => e.isDirectory()).length;
                                
                                dates.push({
                                    date: dateFolder.name,
                                    event_count: eventCount,
                                    path: datePath
                                });
                            }
                        }
                    } catch (dateError) {
                        console.warn(`⚠️ Error reading camera folder ${cameraFolder.name}:`, dateError.message);
                    }
                    
                    cameras.push({
                        camera_id: cameraFolder.name,
                        dates: dates.sort((a, b) => b.date.localeCompare(a.date)),
                        total_dates: dates.length,
                        total_events: dates.reduce((sum, d) => sum + d.event_count, 0)
                    });
                }
            }
        } catch (readError) {
            console.warn('⚠️ Error reading processing inbox:', readError.message);
        }

        res.json({
            success: true,
            message: 'Processing inbox status retrieved successfully',
            data: {
                base_path: baseProcessingPath,
                cameras: cameras.sort((a, b) => a.camera_id.localeCompare(b.camera_id)),
                total_cameras: cameras.length,
                total_events: cameras.reduce((sum, c) => sum + c.total_events, 0),
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error getting processing inbox status:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving processing inbox status',
            error: error.message
        });
    }
});

/**
 * @route POST /api/enhanced-ftp/create-test-structure
 * @desc Create test directory structure for the new processing system
 * @access Public (for testing)
 */
router.post('/create-test-structure', async (req, res) => {
    try {
        const baseProcessingPath = '/srv/processing_inbox';
        const testDate = new Date().toISOString().split('T')[0]; // Today's date
        
        // Create test structure
        const testPaths = [
            path.join(baseProcessingPath, 'camera002', testDate),
            path.join(baseProcessingPath, 'camera001', testDate),
            path.join(baseProcessingPath, 'camera003', testDate)
        ];

        for (const testPath of testPaths) {
            await fs.ensureDir(testPath);
            console.log(`📁 Created test path: ${testPath}`);
        }

        // Create a sample event for testing
        const sampleEventId = `camera002:${new Date().toISOString()}:75`;
        const sampleEventPath = path.join(baseProcessingPath, 'camera002', testDate, sampleEventId);
        await fs.ensureDir(sampleEventPath);

        // Create sample verdict.json
        const sampleVerdict = {
            event_id: sampleEventId,
            camera_id: 'camera002',
            src_ip: '192.168.1.60',
            event_ts: Date.now() / 1000,
            arrival_ts: Date.now() / 1000,
            decision: 'violation',
            speed: 75,
            limit: 30,
            speed_excess: 45,
            fine_amount: 200,
            deserves_ticket: true,
            plate_number: 'TEST123',
            plate_confidence: 0.95,
            photos: [
                { photo_number: 1, file_name: `${sampleEventId}_photo_1.jpg`, processed: true },
                { photo_number: 2, file_name: `${sampleEventId}_photo_2.jpg`, processed: true },
                { photo_number: 3, file_name: `${sampleEventId}_photo_3.jpg`, processed: true }
            ],
            processing_info: {
                processed_at: new Date().toISOString(),
                processing_version: '2.0.0',
                speed_limit_source: 'static_configuration'
            }
        };

        await fs.writeJson(path.join(sampleEventPath, 'verdict.json'), sampleVerdict, { spaces: 2 });

        // Create placeholder photo files
        for (let i = 1; i <= 3; i++) {
            const photoPath = path.join(sampleEventPath, `${sampleEventId}_photo_${i}.jpg`);
            await fs.writeFile(photoPath, 'placeholder photo data');
        }

        res.json({
            success: true,
            message: 'Test directory structure created successfully',
            data: {
                base_path: baseProcessingPath,
                test_date: testDate,
                sample_event: {
                    event_id: sampleEventId,
                    event_path: sampleEventPath,
                    verdict_file: path.join(sampleEventPath, 'verdict.json'),
                    photos: 3
                },
                created_paths: testPaths
            }
        });

    } catch (error) {
        console.error('❌ Error creating test structure:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating test structure',
            error: error.message
        });
    }
});

/**
 * @route DELETE /api/enhanced-ftp/cleanup-test-data
 * @desc Clean up test data (use with caution)
 * @access Public (for testing)
 */
router.delete('/cleanup-test-data', async (req, res) => {
    try {
        const { confirm } = req.body;

        if (confirm !== 'YES_DELETE_TEST_DATA') {
            return res.status(400).json({
                success: false,
                message: 'Confirmation required. Send { "confirm": "YES_DELETE_TEST_DATA" } to proceed.'
            });
        }

        const baseProcessingPath = '/srv/processing_inbox';
        
        // Only delete if it exists and contains test data
        if (await fs.pathExists(baseProcessingPath)) {
            const stats = await fs.stat(baseProcessingPath);
            
            // Safety check - only delete if directory is relatively new (created in last 24 hours)
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
            if (stats.birthtime.getTime() > dayAgo) {
                await fs.remove(baseProcessingPath);
                console.log(`🗑️ Cleaned up test data: ${baseProcessingPath}`);
                
                res.json({
                    success: true,
                    message: 'Test data cleaned up successfully',
                    data: {
                        deleted_path: baseProcessingPath,
                        timestamp: new Date().toISOString()
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Safety check failed: Directory is too old to be test data'
                });
            }
        } else {
            res.json({
                success: true,
                message: 'No test data found to clean up'
            });
        }

    } catch (error) {
        console.error('❌ Error cleaning up test data:', error);
        res.status(500).json({
            success: false,
            message: 'Error cleaning up test data',
            error: error.message
        });
    }
});

module.exports = router;
