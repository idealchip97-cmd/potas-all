const path = require('path');
const fs = require('fs-extra');
const { PlateRecognition, Fine, Radar, Car, Violation } = require('../models');
const enhancedVisionService = require('./enhancedVisionService');

class DataProcessorService {
    constructor() {
        this.processedImages = new Set(); // Track processed images to avoid duplicates
        this.processedMessages = new Map(); // Track processed UDP messages
    }

    /**
     * Process downloaded image from FTP server
     */
    async processImage(imagePath) {
        try {
            const fileName = path.basename(imagePath);
            
            // Check if already processed
            if (this.processedImages.has(fileName)) {
                console.log(`⏭️ Image already processed: ${fileName}`);
                return null;
            }

            console.log(`🔍 Processing image: ${fileName}`);

            // Check if file exists
            if (!await fs.pathExists(imagePath)) {
                console.error(`❌ Image file not found: ${imagePath}`);
                return null;
            }

            // Get file stats
            const stats = await fs.stat(imagePath);
            
            // Use enhanced vision service for plate recognition
            const recognitionResult = await enhancedVisionService.recognizePlate(imagePath);
            
            if (!recognitionResult || !recognitionResult.plateNumber) {
                console.warn(`⚠️ No plate number detected in: ${fileName}`);
                this.processedImages.add(fileName);
                return null;
            }

            // Create plate recognition record
            const plateRecord = await PlateRecognition.create({
                plateNumber: recognitionResult.plateNumber,
                confidence: recognitionResult.confidence || 0.8,
                imagePath: imagePath,
                fileName: fileName,
                fileSize: stats.size,
                processingMethod: recognitionResult.engine || 'enhanced',
                detectionId: `ftp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                cameraInfo: {
                    source: 'ftp_server',
                    timestamp: new Date().toISOString(),
                    fileSize: stats.size
                },
                metadata: {
                    originalFileName: fileName,
                    downloadSource: 'ftp',
                    processedAt: new Date().toISOString(),
                    ...recognitionResult.metadata
                }
            });

            // Create car record if car details are available
            if (recognitionResult.carDetails) {
                await Car.create({
                    plateNumber: recognitionResult.plateNumber,
                    color: recognitionResult.carDetails.color,
                    type: recognitionResult.carDetails.type,
                    confidence: recognitionResult.carDetails.confidence || 0.7,
                    detectionId: plateRecord.detectionId,
                    cameraInfo: plateRecord.cameraInfo,
                    metadata: recognitionResult.carDetails
                });
            }

            console.log(`✅ Image processed successfully: ${fileName} -> ${recognitionResult.plateNumber}`);
            this.processedImages.add(fileName);
            
            return {
                plateRecord,
                recognitionResult,
                fileName
            };

        } catch (error) {
            console.error(`❌ Error processing image ${imagePath}:`, error);
            throw error;
        }
    }

    /**
     * Process radar data from UDP
     */
    async processRadarData(data) {
        try {
            console.log(`📡 Processing radar data:`, data);

            const radarId = data.radarId;
            if (!radarId) {
                console.warn('⚠️ Radar data missing radarId');
                return null;
            }

            // Find or create radar
            let radar = await Radar.findOne({ where: { radarId: radarId } });
            
            if (!radar) {
                // Create new radar
                radar = await Radar.create({
                    radarId: radarId,
                    location: data.location || `Radar Station ${radarId}`,
                    status: data.status || 'active',
                    speedLimit: data.speedLimit || 50,
                    lastPing: data.lastPing || new Date(),
                    metadata: {
                        source: 'udp_server',
                        createdFromUDP: true,
                        binaryPacket: data.binaryPacket || false,
                        ...data
                    }
                });
                console.log(`✅ Created new radar: ${radarId} at ${radar.location}`);
            } else {
                // Update existing radar
                await radar.update({
                    status: data.status || radar.status,
                    lastPing: data.lastPing || new Date(),
                    location: data.location || radar.location,
                    metadata: {
                        ...radar.metadata,
                        lastUDPUpdate: new Date().toISOString(),
                        binaryPacket: data.binaryPacket || false,
                        ...data
                    }
                });
                console.log(`✅ Updated radar: ${radarId}`);
            }

            // If this is a violation (speed > speed limit), process it
            if (data.type === 'radar_violation' && data.speed && data.speed > radar.speedLimit) {
                console.log(`🚨 Speed violation detected: ${data.speed} km/h > ${radar.speedLimit} km/h`);
                await this.processSpeedViolation(data, radar);
            }

            return radar;

        } catch (error) {
            console.error('❌ Error processing radar data:', error);
            throw error;
        }
    }

    /**
     * Process speed violation and correlate with images
     */
    async processSpeedViolation(violationData, radar) {
        try {
            console.log(`🚨 Processing speed violation: ${violationData.speed} km/h`);
            
            // Create message hash to avoid duplicates
            const messageHash = this.createMessageHash(violationData);
            if (this.processedMessages.has(messageHash)) {
                console.log(`⏭️ Violation already processed: ${messageHash}`);
                return null;
            }

            // Calculate fine amount based on speed excess
            const speedExcess = violationData.speed - radar.speedLimit;
            const fineAmount = this.calculateFineAmount(speedExcess);

            // Look for correlated images within time window (±30 seconds)
            const correlatedImages = await this.findCorrelatedImages(violationData.timestamp);
            
            let plateNumber = 'UNKNOWN';
            let confidence = 0;
            let imagePath = null;

            // If we have correlated images, process the first one for plate recognition
            if (correlatedImages && correlatedImages.length > 0) {
                const primaryImage = correlatedImages[0];
                imagePath = primaryImage.path;
                
                try {
                    const plateResult = await enhancedVisionService.recognizePlate(primaryImage.path);
                    if (plateResult && plateResult.plateNumber) {
                        plateNumber = plateResult.plateNumber;
                        confidence = plateResult.confidence || 0.8;
                        console.log(`🔍 Plate recognized: ${plateNumber} (${confidence}% confidence)`);
                    }
                } catch (plateError) {
                    console.warn('⚠️ Plate recognition failed:', plateError.message);
                }
            }

            // Create fine record
            const fine = await Fine.create({
                plateNumber: plateNumber,
                speed: violationData.speed,
                speedLimit: radar.speedLimit,
                fineAmount: fineAmount,
                radarId: radar.id,
                location: radar.location,
                timestamp: violationData.timestamp,
                imagePath: imagePath,
                status: 'pending',
                metadata: {
                    correlatedImages: correlatedImages ? correlatedImages.length : 0,
                    confidence: confidence,
                    speedExcess: speedExcess,
                    binaryPacket: violationData.binaryPacket || false,
                    rawMessage: violationData.rawMessage,
                    processingTime: new Date().toISOString()
                }
            });

            // Mark as processed
            this.processedMessages.set(messageHash, {
                timestamp: new Date(),
                fineId: fine.id
            });

            console.log(`✅ Speed violation processed: Fine ID ${fine.id}, Amount: $${fineAmount}`);
            
            return {
                fine: fine,
                radar: radar,
                correlatedImages: correlatedImages,
                plateNumber: plateNumber,
                confidence: confidence
            };

        } catch (error) {
            console.error('❌ Error processing speed violation:', error);
            throw error;
        }
    }

    /**
     * Calculate fine amount based on speed excess
     */
    calculateFineAmount(speedExcess) {
        if (speedExcess <= 10) return 50;
        if (speedExcess <= 20) return 100;
        if (speedExcess <= 30) return 200;
        if (speedExcess <= 40) return 350;
        return 500; // 40+ km/h over limit
    }

    /**
     * Find images that correlate with the violation timestamp
     */
    async findCorrelatedImages(violationTimestamp, windowSeconds = 30) {
        try {
            const violationTime = new Date(violationTimestamp);
            const startTime = new Date(violationTime.getTime() - (windowSeconds * 1000));
            const endTime = new Date(violationTime.getTime() + (windowSeconds * 1000));
            
            console.log(`🔍 Looking for images between ${startTime.toISOString()} and ${endTime.toISOString()}`);
            
            // This would typically query your image database or file system
            // For now, we'll simulate finding images based on timestamp
            const fs = require('fs');
            const path = require('path');
            
            // Check common image directories
            const imageDirs = [
                '/srv/camera_uploads/camera001/192.168.1.54',
                '/home/rnd2/Desktop/radar_sys/potassium-frontend/local-images/camera001/192.168.1.54'
            ];
            
            const correlatedImages = [];
            
            for (const baseDir of imageDirs) {
                if (!fs.existsSync(baseDir)) continue;
                
                // Look in today's directory
                const today = violationTime.toISOString().split('T')[0];
                const dayDir = path.join(baseDir, today, 'Common');
                
                if (fs.existsSync(dayDir)) {
                    const files = fs.readdirSync(dayDir);
                    
                    for (const file of files) {
                        if (file.match(/\.(jpg|jpeg|png)$/i)) {
                            const filePath = path.join(dayDir, file);
                            const stats = fs.statSync(filePath);
                            const fileTime = stats.mtime;
                            
                            // Check if file time is within correlation window
                            if (fileTime >= startTime && fileTime <= endTime) {
                                correlatedImages.push({
                                    path: filePath,
                                    filename: file,
                                    timestamp: fileTime.toISOString(),
                                    timeDifference: Math.abs(fileTime.getTime() - violationTime.getTime())
                                });
                            }
                        }
                    }
                }
            }
            
            // Sort by closest time match
            correlatedImages.sort((a, b) => a.timeDifference - b.timeDifference);
            
            console.log(`📸 Found ${correlatedImages.length} correlated images`);
            return correlatedImages;
            
        } catch (error) {
            console.error('❌ Error finding correlated images:', error);
            return [];
        }
    }

    /**
     * Process fine data from UDP
     */
    async processFineData(data) {
        try {
            console.log(`🚨 Processing fine data:`, data);

            const plateNumber = data.plateNumber;
            const radarId = data.radarId;
            
            if (!plateNumber) {
                console.warn('⚠️ Fine data missing plate number');
                return null;
            }

            // Create message hash to avoid duplicates
            const messageHash = this.createMessageHash(data);
            if (this.processedMessages.has(messageHash)) {
                console.log(`⏭️ Fine data already processed: ${messageHash}`);
                return null;
            }

            // Ensure radar exists
            let radar = null;
            if (radarId) {
                radar = await Radar.findOne({ where: { radarId: radarId } });
                if (!radar) {
                    // Create radar if it doesn't exist
                    radar = await Radar.create({
                        radarId: radarId,
                        location: data.location || 'Unknown Location',
                        status: 'active',
                        speedLimit: data.speedLimit || 50,
                        metadata: {
                            source: 'udp_server',
                            createdFromFine: true
                        }
                    });
                }
            }

            // Create fine record
            const fine = await Fine.create({
                plateNumber: plateNumber,
                speed: data.speed || 0,
                speedLimit: data.speedLimit || (radar ? radar.speedLimit : 50),
                radarId: radar ? radar.id : null,
                timestamp: data.timestamp || new Date(),
                location: data.location || (radar ? radar.location : 'Unknown'),
                amount: this.calculateFineAmount(data.speed, data.speedLimit),
                status: 'pending',
                metadata: {
                    source: 'udp_server',
                    originalData: data,
                    processedAt: new Date().toISOString()
                }
            });

            // Create violation record if this is a speed violation
            if (data.speed && data.speedLimit && data.speed > data.speedLimit) {
                await Violation.create({
                    plateNumber: plateNumber,
                    violationType: 'speeding',
                    speed: data.speed,
                    speedLimit: data.speedLimit,
                    radarId: radar ? radar.id : null,
                    location: data.location || (radar ? radar.location : 'Unknown'),
                    timestamp: data.timestamp || new Date(),
                    fineAmount: fine.amount,
                    status: 'detected',
                    confidence: 0.9,
                    metadata: {
                        source: 'udp_server',
                        fineId: fine.id,
                        originalData: data
                    }
                });
            }

            console.log(`✅ Fine processed successfully: ${plateNumber} - ${data.speed}km/h`);
            this.processedMessages.set(messageHash, Date.now());
            
            return fine;

        } catch (error) {
            console.error('❌ Error processing fine data:', error);
            throw error;
        }
    }

    /**
     * Process violation data from UDP
     */
    async processViolationData(data) {
        try {
            console.log(`⚖️ Processing violation data:`, data);

            const plateNumber = data.plateNumber;
            if (!plateNumber) {
                console.warn('⚠️ Violation data missing plate number');
                return null;
            }

            // Create message hash to avoid duplicates
            const messageHash = this.createMessageHash(data);
            if (this.processedMessages.has(messageHash)) {
                console.log(`⏭️ Violation data already processed: ${messageHash}`);
                return null;
            }

            // Ensure radar exists if provided
            let radar = null;
            if (data.radarId) {
                radar = await Radar.findOne({ where: { radarId: data.radarId } });
            }

            // Create violation record
            const violation = await Violation.create({
                plateNumber: plateNumber,
                violationType: data.violationType || 'unknown',
                speed: data.speed || null,
                speedLimit: data.speedLimit || null,
                radarId: radar ? radar.id : null,
                location: data.location || (radar ? radar.location : 'Unknown'),
                timestamp: data.timestamp || new Date(),
                fineAmount: data.fineAmount || this.calculateFineAmount(data.speed, data.speedLimit),
                status: data.status || 'detected',
                confidence: data.confidence || 0.8,
                metadata: {
                    source: 'udp_server',
                    originalData: data,
                    processedAt: new Date().toISOString()
                }
            });

            console.log(`✅ Violation processed successfully: ${plateNumber} - ${data.violationType}`);
            this.processedMessages.set(messageHash, Date.now());
            
            return violation;

        } catch (error) {
            console.error('❌ Error processing violation data:', error);
            throw error;
        }
    }

    /**
     * Calculate fine amount based on speed and speed limit
     */
    calculateFineAmount(speed, speedLimit) {
        if (!speed || !speedLimit) return 100; // Default fine
        
        const overspeed = speed - speedLimit;
        if (overspeed <= 0) return 0;
        
        // Progressive fine calculation
        if (overspeed <= 10) return 100;
        if (overspeed <= 20) return 200;
        if (overspeed <= 30) return 400;
        if (overspeed <= 50) return 800;
        return 1500; // Severe speeding
    }

    /**
     * Create hash for message deduplication
     */
    createMessageHash(data) {
        const key = `${data.plateNumber || 'unknown'}_${data.radarId || 'unknown'}_${data.timestamp || Date.now()}`;
        return Buffer.from(key).toString('base64');
    }

    /**
     * Clean up old processed messages (run periodically)
     */
    cleanupProcessedMessages() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [hash, timestamp] of this.processedMessages.entries()) {
            if (now - timestamp > maxAge) {
                this.processedMessages.delete(hash);
            }
        }
        
        console.log(`🧹 Cleaned up old processed messages. Current count: ${this.processedMessages.size}`);
    }

    /**
     * Get processing statistics
     */
    getStats() {
        return {
            processedImages: this.processedImages.size,
            processedMessages: this.processedMessages.size,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Process correlated violation (radar data + image)
     */
    async processCorrelatedViolation(violation) {
    try {
        console.log(`🎯 Processing correlated violation: ${violation.id}`);
        
        // Create or find radar record
        let radar = await Radar.findOne({ where: { id: violation.radarId } });
        if (!radar) {
            radar = await Radar.create({
                id: violation.radarId,
                name: `Radar ${violation.radarId}`,
                location: `Location ${violation.radarId}`,
                ipAddress: '192.168.1.55',
                status: 'active',
                speedLimit: 50
            });
            console.log(`📡 Created new radar record: ${violation.radarId}`);
        }
        
        let plateNumber = null;
        let confidence = null;
        let plateRecognitionId = null;
        
        // Process image if available
        if (violation.hasImage && violation.images.length > 0) {
            const primaryImage = violation.images[0]; // Use the first/closest image
            
            try {
                // Use enhanced vision service for plate recognition
                const recognitionResult = await enhancedVisionService.recognizePlate(primaryImage.path);
                
                if (recognitionResult && recognitionResult.plateNumber) {
                    plateNumber = recognitionResult.plateNumber;
                    confidence = recognitionResult.confidence || 0.8;
                    
                    // Create plate recognition record
                    const plateRecord = await PlateRecognition.create({
                        plateNumber: plateNumber,
                        confidence: confidence,
                        imagePath: primaryImage.path,
                        fileName: path.basename(primaryImage.path),
                        fileSize: 0, // Will be updated if needed
                        processedAt: new Date(),
                        processingMethod: 'correlation_enhanced',
                        correlationId: violation.id
                    });
                    
                    plateRecognitionId = plateRecord.id;
                    console.log(`🔍 Plate recognized: ${plateNumber} (confidence: ${confidence})`);
                }
            } catch (imageError) {
                console.warn(`⚠️ Failed to process image for violation ${violation.id}:`, imageError.message);
            }
        }
        
        // Calculate fine amount based on speed
        const speedLimit = radar.speedLimit || 50;
        const speedExcess = violation.speed - speedLimit;
        let fineAmount = 0;
        
        if (speedExcess > 0) {
            // Progressive fine calculation
            if (speedExcess <= 10) {
                fineAmount = 50;
            } else if (speedExcess <= 20) {
                fineAmount = 100;
            } else if (speedExcess <= 30) {
                fineAmount = 200;
            } else {
                fineAmount = 500;
            }
        }
        
        // Create fine record
        const fine = await Fine.create({
            radarId: violation.radarId,
            licensePlate: plateNumber || 'UNKNOWN',
            speedDetected: violation.speed,
            speedLimit: speedLimit,
            fineAmount: fineAmount,
            imagePath: violation.hasImage ? violation.images[0].path : null,
            status: plateNumber ? 'processed' : 'pending',
            detectedAt: new Date(violation.timestamp),
            correlationId: violation.id,
            rawRadarData: violation.rawRadarMessage
        });
        
        console.log(`💰 Fine created: ${fine.id} - ${plateNumber || 'UNKNOWN'} - ${violation.speed}km/h - $${fineAmount}`);
        
        // Create violation record for tracking
        const violationRecord = await Violation.create({
            type: 'speed',
            description: `Speed violation: ${violation.speed}km/h in ${speedLimit}km/h zone`,
            location: radar.location,
            timestamp: new Date(violation.timestamp),
            radarId: violation.radarId,
            fineId: fine.id,
            plateRecognitionId: plateRecognitionId,
            status: 'detected',
            correlationId: violation.id,
            metadata: {
                radarData: {
                    speed: violation.speed,
                    timeString: violation.timeString,
                    rawMessage: violation.rawRadarMessage
                },
                images: violation.images,
                correlatedAt: violation.correlatedAt
            }
        });
        
        const result = {
            violation: violationRecord,
            fine: fine,
            radar: radar,
            plateRecognition: plateRecognitionId ? await PlateRecognition.findByPk(plateRecognitionId) : null,
            correlationId: violation.id,
            hasImage: violation.hasImage,
            imageCount: violation.images.length
        };
        
        console.log(`✅ Correlated violation processed successfully: ${violation.id}`);
        return result;
        
    } catch (error) {
        console.error(`❌ Error processing correlated violation ${violation.id}:`, error);
        throw error;
    }
}

    /**
     * Reset processed tracking (for testing)
     */
    reset() {
        this.processedImages.clear();
        this.processedMessages.clear();
        console.log('🔄 Data processor reset - cleared processed items cache');
    }
}

module.exports = new DataProcessorService();
