const path = require('path');
const fs = require('fs-extra');
const { RadarReading, Fine, Radar, Car, Violation, PlateRecognition } = require('../models');
const enhancedVisionService = require('./enhancedVisionService');

/**
 * Speeding Car Processor Service
 * 
 * Handles the new system requirement where for every speeding car:
 * - 3 photos are taken and saved in a special folder
 * - Each folder contains three photos and a JSON file
 * - JSON file contains information about the car, speed, and ticket decision
 * 
 * Author: System Update
 * Date: 2025-10-05
 */
class SpeedingCarProcessorService {
    constructor() {
        this.processingQueue = new Map(); // Track processing events
        this.baseProcessingPath = '/srv/processing_inbox';
        this.speedLimit = 30; // Static speed limit as requested
    }

    /**
     * Process a speeding car event with 3 photos
     * @param {Object} speedingEvent - The speeding car event data
     * @param {Array} photoFiles - Array of 3 photo file paths
     * @returns {Object} Processing result
     */
    async processSpeedingCar(speedingEvent, photoFiles = []) {
        try {
            console.log(`🚨 Processing speeding car event: ${speedingEvent.event_id}`);
            
            // Validate input
            if (!speedingEvent || !speedingEvent.event_id) {
                throw new Error('Invalid speeding event data');
            }

            // Create event folder structure
            const eventFolder = await this.createEventFolder(speedingEvent);
            
            // Process the 3 photos
            const processedPhotos = await this.processPhotos(photoFiles, eventFolder, speedingEvent);
            
            // Create verdict JSON file
            const verdictData = await this.createVerdictFile(speedingEvent, processedPhotos, eventFolder);
            
            // Save to database
            const dbRecords = await this.saveToDatabaseNew(speedingEvent, processedPhotos, verdictData);
            
            console.log(`✅ Successfully processed speeding car: ${speedingEvent.event_id}`);
            
            return {
                success: true,
                eventId: speedingEvent.event_id,
                eventFolder: eventFolder,
                processedPhotos: processedPhotos,
                verdictData: verdictData,
                dbRecords: dbRecords
            };

        } catch (error) {
            console.error(`❌ Error processing speeding car ${speedingEvent?.event_id}:`, error);
            throw error;
        }
    }

    /**
     * Create folder structure for the speeding event
     * @param {Object} speedingEvent - The speeding event data
     * @returns {string} Path to the created event folder
     */
    async createEventFolder(speedingEvent) {
        try {
            // Extract date from event timestamp
            const eventDate = new Date(speedingEvent.event_ts * 1000);
            const dateStr = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Create folder path: /srv/processing_inbox/camera002/2025-10-05/event_id
            const eventFolder = path.join(
                this.baseProcessingPath,
                speedingEvent.camera_id || 'camera002',
                dateStr,
                speedingEvent.event_id
            );

            // Ensure folder exists
            await fs.ensureDir(eventFolder);
            console.log(`📁 Created event folder: ${eventFolder}`);
            
            return eventFolder;

        } catch (error) {
            console.error('❌ Error creating event folder:', error);
            throw error;
        }
    }

    /**
     * Process the 3 photos for the speeding event
     * @param {Array} photoFiles - Array of photo file paths
     * @param {string} eventFolder - Path to event folder
     * @param {Object} speedingEvent - The speeding event data
     * @returns {Array} Array of processed photo information
     */
    async processPhotos(photoFiles, eventFolder, speedingEvent) {
        try {
            const processedPhotos = [];
            
            // If no photos provided, create mock photo entries
            if (!photoFiles || photoFiles.length === 0) {
                console.log('⚠️ No photos provided, creating mock photo entries');
                for (let i = 1; i <= 3; i++) {
                    const mockPhotoName = `${speedingEvent.event_id}_photo_${i}.jpg`;
                    const mockPhotoPath = path.join(eventFolder, mockPhotoName);
                    
                    // Create empty file as placeholder
                    await fs.writeFile(mockPhotoPath, '');
                    
                    processedPhotos.push({
                        photoNumber: i,
                        fileName: mockPhotoName,
                        filePath: mockPhotoPath,
                        fileSize: 0,
                        processed: false,
                        plateNumber: null,
                        confidence: 0,
                        timestamp: new Date().toISOString()
                    });
                }
                return processedPhotos;
            }

            // Process actual photos
            for (let i = 0; i < Math.min(photoFiles.length, 3); i++) {
                const photoFile = photoFiles[i];
                const photoNumber = i + 1;
                const fileName = `${speedingEvent.event_id}_photo_${photoNumber}.jpg`;
                const destinationPath = path.join(eventFolder, fileName);

                try {
                    // Copy photo to event folder
                    if (await fs.pathExists(photoFile)) {
                        await fs.copy(photoFile, destinationPath);
                        console.log(`📸 Copied photo ${photoNumber}: ${fileName}`);
                    } else {
                        // Create placeholder if source doesn't exist
                        await fs.writeFile(destinationPath, '');
                        console.log(`📸 Created placeholder for photo ${photoNumber}: ${fileName}`);
                    }

                    // Get file stats
                    const stats = await fs.stat(destinationPath);
                    
                    // Process with plate recognition
                    let plateNumber = null;
                    let confidence = 0;
                    let processed = false;

                    if (stats.size > 0) {
                        try {
                            const recognitionResult = await enhancedVisionService.recognizePlate(destinationPath);
                            if (recognitionResult && recognitionResult.plateNumber) {
                                plateNumber = recognitionResult.plateNumber;
                                confidence = recognitionResult.confidence || 0.8;
                                processed = true;
                            }
                        } catch (recognitionError) {
                            console.warn(`⚠️ Plate recognition failed for photo ${photoNumber}:`, recognitionError.message);
                        }
                    }

                    processedPhotos.push({
                        photoNumber: photoNumber,
                        fileName: fileName,
                        filePath: destinationPath,
                        fileSize: stats.size,
                        processed: processed,
                        plateNumber: plateNumber,
                        confidence: confidence,
                        timestamp: new Date().toISOString()
                    });

                } catch (photoError) {
                    console.error(`❌ Error processing photo ${photoNumber}:`, photoError);
                    // Add error entry
                    processedPhotos.push({
                        photoNumber: photoNumber,
                        fileName: fileName,
                        filePath: path.join(eventFolder, fileName),
                        fileSize: 0,
                        processed: false,
                        plateNumber: null,
                        confidence: 0,
                        error: photoError.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            // Ensure we have exactly 3 photos
            while (processedPhotos.length < 3) {
                const photoNumber = processedPhotos.length + 1;
                const fileName = `${speedingEvent.event_id}_photo_${photoNumber}.jpg`;
                const filePath = path.join(eventFolder, fileName);
                
                // Create placeholder
                await fs.writeFile(filePath, '');
                
                processedPhotos.push({
                    photoNumber: photoNumber,
                    fileName: fileName,
                    filePath: filePath,
                    fileSize: 0,
                    processed: false,
                    plateNumber: null,
                    confidence: 0,
                    timestamp: new Date().toISOString()
                });
            }

            return processedPhotos;

        } catch (error) {
            console.error('❌ Error processing photos:', error);
            throw error;
        }
    }

    /**
     * Create verdict JSON file with car information and ticket decision
     * @param {Object} speedingEvent - The speeding event data
     * @param {Array} processedPhotos - Array of processed photo information
     * @param {string} eventFolder - Path to event folder
     * @returns {Object} Verdict data
     */
    async createVerdictFile(speedingEvent, processedPhotos, eventFolder) {
        try {
            // Determine ticket decision
            const speedExcess = speedingEvent.speed - this.speedLimit;
            const deservesFine = speedingEvent.speed > this.speedLimit;
            const fineAmount = deservesFine ? this.calculateFineAmount(speedExcess) : 0;

            // Get best plate number from photos
            const bestPlate = processedPhotos
                .filter(photo => photo.plateNumber && photo.confidence > 0.5)
                .sort((a, b) => b.confidence - a.confidence)[0];

            // Create verdict data
            const verdictData = {
                event_id: speedingEvent.event_id,
                camera_id: speedingEvent.camera_id || 'camera002',
                src_ip: speedingEvent.src_ip || '192.168.1.60',
                event_ts: speedingEvent.event_ts,
                arrival_ts: speedingEvent.arrival_ts || Date.now() / 1000,
                decision: deservesFine ? 'violation' : 'no_violation',
                speed: speedingEvent.speed,
                limit: this.speedLimit,
                speed_excess: speedExcess,
                fine_amount: fineAmount,
                deserves_ticket: deservesFine,
                plate_number: bestPlate ? bestPlate.plateNumber : null,
                plate_confidence: bestPlate ? bestPlate.confidence : 0,
                photos: processedPhotos.map(photo => ({
                    photo_number: photo.photoNumber,
                    file_name: photo.fileName,
                    file_size: photo.fileSize,
                    plate_detected: photo.plateNumber,
                    confidence: photo.confidence,
                    processed: photo.processed
                })),
                processing_info: {
                    processed_at: new Date().toISOString(),
                    processing_version: '2.0.0',
                    speed_limit_source: 'static_configuration',
                    total_photos: processedPhotos.length,
                    successful_recognitions: processedPhotos.filter(p => p.processed).length
                },
                payload: {
                    decision: deservesFine ? 'violation' : 'no_violation',
                    limit: this.speedLimit,
                    speed: speedingEvent.speed,
                    camera_id: speedingEvent.camera_id || 'camera002',
                    event_ts: new Date(speedingEvent.event_ts * 1000).toISOString(),
                    event_id: speedingEvent.event_id,
                    arrival_ts: speedingEvent.arrival_ts || Date.now() / 1000
                }
            };

            // Save verdict file
            const verdictFilePath = path.join(eventFolder, 'verdict.json');
            await fs.writeJson(verdictFilePath, verdictData, { spaces: 2 });
            
            console.log(`📄 Created verdict file: ${verdictFilePath}`);
            console.log(`🎯 Decision: ${verdictData.decision}, Speed: ${verdictData.speed} km/h, Fine: $${verdictData.fine_amount}`);

            return verdictData;

        } catch (error) {
            console.error('❌ Error creating verdict file:', error);
            throw error;
        }
    }

    /**
     * Save processed data to database
     * @param {Object} speedingEvent - The speeding event data
     * @param {Array} processedPhotos - Array of processed photo information
     * @param {Object} verdictData - Verdict data
     * @returns {Object} Database records
     */
    async saveToDatabaseNew(speedingEvent, processedPhotos, verdictData) {
        try {
            const dbRecords = {};

            // Ensure radar exists
            const radar = await this.ensureRadarExists(speedingEvent.camera_id || 'camera002');
            
            // Create radar reading
            const radarReading = await RadarReading.create({
                radarId: radar.id,
                speedDetected: speedingEvent.speed,
                speedLimit: this.speedLimit,
                detectionTime: new Date(speedingEvent.event_ts * 1000),
                isViolation: speedingEvent.speed > this.speedLimit,
                sourceIP: speedingEvent.src_ip || '192.168.1.60',
                rawData: JSON.stringify(speedingEvent),
                processed: true,
                eventId: speedingEvent.event_id
            });
            dbRecords.radarReading = radarReading;

            // Create fine if violation
            if (verdictData.deserves_ticket) {
                const fine = await Fine.create({
                    radarId: radar.id,
                    vehiclePlate: verdictData.plate_number,
                    speedDetected: speedingEvent.speed,
                    speedLimit: this.speedLimit,
                    violationAmount: verdictData.speed_excess,
                    fineAmount: verdictData.fine_amount,
                    violationDateTime: new Date(speedingEvent.event_ts * 1000),
                    status: 'pending',
                    imageUrl: processedPhotos[0] ? processedPhotos[0].filePath : null,
                    notes: `Speed violation: ${speedingEvent.speed} km/h in ${this.speedLimit} km/h zone. Event: ${speedingEvent.event_id}`,
                    eventId: speedingEvent.event_id
                });
                dbRecords.fine = fine;

                // Update radar reading with fine ID
                await radarReading.update({ fineId: fine.id });
            }

            // Create plate recognition records for each photo
            const plateRecords = [];
            for (const photo of processedPhotos) {
                if (photo.plateNumber) {
                    const plateRecord = await PlateRecognition.create({
                        plateNumber: photo.plateNumber,
                        confidence: photo.confidence,
                        imagePath: photo.filePath,
                        fileName: photo.fileName,
                        fileSize: photo.fileSize,
                        processingMethod: 'enhanced',
                        detectionId: `${speedingEvent.event_id}_photo_${photo.photoNumber}`,
                        eventId: speedingEvent.event_id,
                        cameraInfo: {
                            source: 'speeding_car_processor',
                            camera_id: speedingEvent.camera_id,
                            timestamp: photo.timestamp
                        },
                        metadata: {
                            photoNumber: photo.photoNumber,
                            eventId: speedingEvent.event_id,
                            speedDetected: speedingEvent.speed,
                            processedAt: new Date().toISOString()
                        }
                    });
                    plateRecords.push(plateRecord);
                }
            }
            dbRecords.plateRecords = plateRecords;

            console.log(`💾 Saved to database: Reading ID ${radarReading.id}, ${plateRecords.length} plate records`);
            if (dbRecords.fine) {
                console.log(`💰 Fine created: ID ${dbRecords.fine.id}, Amount: $${dbRecords.fine.fineAmount}`);
            }

            return dbRecords;

        } catch (error) {
            console.error('❌ Error saving to database:', error);
            throw error;
        }
    }

    /**
     * Ensure radar exists in database
     * @param {string} cameraId - Camera/Radar ID
     * @returns {Object} Radar record
     */
    async ensureRadarExists(cameraId) {
        try {
            const [radar, created] = await Radar.findOrCreate({
                where: { name: cameraId },
                defaults: {
                    name: cameraId,
                    location: `Location for ${cameraId}`,
                    status: 'active',
                    speedLimit: this.speedLimit
                }
            });

            if (created) {
                console.log(`📡 Created new radar record: ${cameraId}`);
            }

            return radar;

        } catch (error) {
            console.error('❌ Error ensuring radar exists:', error);
            throw error;
        }
    }

    /**
     * Calculate fine amount based on speed excess
     * @param {number} speedExcess - Speed over the limit in km/h
     * @returns {number} Fine amount
     */
    calculateFineAmount(speedExcess) {
        if (speedExcess <= 10) return 50;   // 1-10 km/h over
        if (speedExcess <= 20) return 100;  // 11-20 km/h over
        if (speedExcess <= 30) return 200;  // 21-30 km/h over
        return 300; // 30+ km/h over
    }

    /**
     * Process existing FTP images for speeding events
     * @param {string} ftpImagePath - Path to FTP image
     * @param {Object} speedingEvent - Associated speeding event
     * @returns {Object} Processing result
     */
    async processFtpImage(ftpImagePath, speedingEvent) {
        try {
            console.log(`📸 Processing FTP image: ${ftpImagePath} for event: ${speedingEvent.event_id}`);
            
            // Check if image exists
            if (!await fs.pathExists(ftpImagePath)) {
                console.warn(`⚠️ FTP image not found: ${ftpImagePath}`);
                return null;
            }

            // Process the image as one of the 3 photos
            return await this.processSpeedingCar(speedingEvent, [ftpImagePath]);

        } catch (error) {
            console.error(`❌ Error processing FTP image ${ftpImagePath}:`, error);
            throw error;
        }
    }

    /**
     * Get processing statistics
     * @returns {Object} Processing statistics
     */
    getStats() {
        return {
            queueSize: this.processingQueue.size,
            baseProcessingPath: this.baseProcessingPath,
            speedLimit: this.speedLimit,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = SpeedingCarProcessorService;
