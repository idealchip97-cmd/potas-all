const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class CorrelationService extends EventEmitter {
    constructor() {
        super();
        this.pendingRadarData = new Map(); // Store radar violations waiting for images
        this.pendingImages = new Map(); // Store images waiting for radar data
        this.correlationTimeWindow = 30000; // 30 seconds window for correlation
        this.imageBasePath = process.env.IMAGE_BASE_DIR || '/srv/camera_uploads';
        
        // Clean up old pending data every 5 minutes
        setInterval(() => this.cleanupOldPendingData(), 5 * 60 * 1000);
        
        console.log('🔗 Correlation Service initialized');
        console.log(`⏱️  Correlation time window: ${this.correlationTimeWindow / 1000} seconds`);
    }

    // Process radar violation data from UDP
    processRadarViolation(radarData) {
        console.log(`📡 Processing radar violation: ID ${radarData.radarId}, Speed ${radarData.speed}, Time ${radarData.timeString}`);
        
        const violationId = this.generateViolationId(radarData);
        const radarTimestamp = new Date(radarData.timestamp);
        
        // Look for matching images within time window
        const matchingImages = this.findMatchingImages(radarTimestamp);
        
        if (matchingImages.length > 0) {
            console.log(`✅ Found ${matchingImages.length} matching images for radar violation`);
            this.createCorrelatedViolation(radarData, matchingImages);
        } else {
            console.log(`⏳ No matching images found, storing radar data for correlation`);
            // Store radar data for later correlation
            this.pendingRadarData.set(violationId, {
                ...radarData,
                receivedAt: new Date(),
                violationId
            });
            
            // Set timeout to clean up if no image is found
            setTimeout(() => {
                if (this.pendingRadarData.has(violationId)) {
                    console.log(`⚠️ No image found for radar violation ${violationId}, creating violation without image`);
                    this.createCorrelatedViolation(radarData, []);
                    this.pendingRadarData.delete(violationId);
                }
            }, this.correlationTimeWindow);
        }
    }

    // Process new FTP image
    processNewImage(imagePath, imageTimestamp) {
        console.log(`📸 Processing new image: ${imagePath}, timestamp: ${imageTimestamp}`);
        
        const imageTime = new Date(imageTimestamp);
        
        // Look for matching radar data within time window
        const matchingRadarData = this.findMatchingRadarData(imageTime);
        
        if (matchingRadarData.length > 0) {
            console.log(`✅ Found ${matchingRadarData.length} matching radar violations for image`);
            
            // Correlate with the closest radar data
            const closestRadar = this.findClosestRadarData(matchingRadarData, imageTime);
            this.createCorrelatedViolation(closestRadar, [{ path: imagePath, timestamp: imageTimestamp }]);
            
            // Remove the used radar data
            this.pendingRadarData.delete(closestRadar.violationId);
        } else {
            console.log(`⏳ No matching radar data found, storing image for correlation`);
            // Store image for later correlation
            const imageId = this.generateImageId(imagePath, imageTimestamp);
            this.pendingImages.set(imageId, {
                path: imagePath,
                timestamp: imageTimestamp,
                receivedAt: new Date(),
                imageId
            });
            
            // Set timeout to clean up if no radar data is found
            setTimeout(() => {
                if (this.pendingImages.has(imageId)) {
                    console.log(`⚠️ No radar data found for image ${imageId}`);
                    this.pendingImages.delete(imageId);
                }
            }, this.correlationTimeWindow);
        }
    }

    // Find images that match radar timestamp within time window
    findMatchingImages(radarTimestamp) {
        const matches = [];
        
        for (const [imageId, imageData] of this.pendingImages) {
            const imageTime = new Date(imageData.timestamp);
            const timeDiff = Math.abs(radarTimestamp.getTime() - imageTime.getTime());
            
            if (timeDiff <= this.correlationTimeWindow) {
                matches.push({
                    ...imageData,
                    timeDifference: timeDiff
                });
            }
        }
        
        // Sort by closest time match
        matches.sort((a, b) => a.timeDifference - b.timeDifference);
        
        // Remove matched images from pending
        matches.forEach(match => {
            this.pendingImages.delete(match.imageId);
        });
        
        return matches;
    }

    // Find radar data that matches image timestamp within time window
    findMatchingRadarData(imageTimestamp) {
        const matches = [];
        
        for (const [violationId, radarData] of this.pendingRadarData) {
            const radarTime = new Date(radarData.timestamp);
            const timeDiff = Math.abs(imageTimestamp.getTime() - radarTime.getTime());
            
            if (timeDiff <= this.correlationTimeWindow) {
                matches.push({
                    ...radarData,
                    timeDifference: timeDiff
                });
            }
        }
        
        return matches;
    }

    // Find the closest radar data by timestamp
    findClosestRadarData(radarDataArray, imageTimestamp) {
        return radarDataArray.reduce((closest, current) => {
            const currentTime = new Date(current.timestamp);
            const closestTime = new Date(closest.timestamp);
            
            const currentDiff = Math.abs(imageTimestamp.getTime() - currentTime.getTime());
            const closestDiff = Math.abs(imageTimestamp.getTime() - closestTime.getTime());
            
            return currentDiff < closestDiff ? current : closest;
        });
    }

    // Create a correlated violation record
    createCorrelatedViolation(radarData, images) {
        const violation = {
            id: this.generateViolationId(radarData),
            radarId: radarData.radarId,
            speed: radarData.speed,
            timestamp: radarData.timestamp,
            timeString: radarData.timeString,
            rawRadarMessage: radarData.rawMessage,
            images: images.map(img => ({
                path: img.path,
                timestamp: img.timestamp,
                timeDifference: img.timeDifference || 0
            })),
            correlatedAt: new Date().toISOString(),
            hasImage: images.length > 0
        };
        
        console.log(`🎯 Created correlated violation:`, {
            id: violation.id,
            radarId: violation.radarId,
            speed: violation.speed,
            imageCount: violation.images.length,
            hasImage: violation.hasImage
        });
        
        // Emit the correlated violation
        this.emit('correlatedViolation', violation);
        
        return violation;
    }

    // Generate unique violation ID
    generateViolationId(radarData) {
        const timestamp = new Date(radarData.timestamp).getTime();
        return `violation_${radarData.radarId}_${timestamp}`;
    }

    // Generate unique image ID
    generateImageId(imagePath, timestamp) {
        const filename = path.basename(imagePath);
        const imageTimestamp = new Date(timestamp).getTime();
        return `image_${filename}_${imageTimestamp}`;
    }

    // Clean up old pending data that couldn't be correlated
    cleanupOldPendingData() {
        const now = new Date();
        const maxAge = this.correlationTimeWindow * 2; // Double the correlation window
        
        // Clean up old radar data
        for (const [violationId, radarData] of this.pendingRadarData) {
            const age = now.getTime() - radarData.receivedAt.getTime();
            if (age > maxAge) {
                console.log(`🧹 Cleaning up old radar data: ${violationId}`);
                this.pendingRadarData.delete(violationId);
            }
        }
        
        // Clean up old images
        for (const [imageId, imageData] of this.pendingImages) {
            const age = now.getTime() - imageData.receivedAt.getTime();
            if (age > maxAge) {
                console.log(`🧹 Cleaning up old image data: ${imageId}`);
                this.pendingImages.delete(imageId);
            }
        }
        
        if (this.pendingRadarData.size > 0 || this.pendingImages.size > 0) {
            console.log(`📊 Pending correlation data: ${this.pendingRadarData.size} radar, ${this.pendingImages.size} images`);
        }
    }

    // Get correlation statistics
    getStats() {
        return {
            pendingRadarData: this.pendingRadarData.size,
            pendingImages: this.pendingImages.size,
            correlationTimeWindow: this.correlationTimeWindow,
            timestamp: new Date().toISOString()
        };
    }

    // Manual correlation trigger (for testing)
    async triggerManualCorrelation() {
        console.log('🔄 Triggering manual correlation check...');
        
        // Try to correlate any pending data
        for (const [violationId, radarData] of this.pendingRadarData) {
            const radarTime = new Date(radarData.timestamp);
            const matchingImages = this.findMatchingImages(radarTime);
            
            if (matchingImages.length > 0) {
                console.log(`✅ Manual correlation found match for ${violationId}`);
                this.createCorrelatedViolation(radarData, matchingImages);
                this.pendingRadarData.delete(violationId);
            }
        }
        
        return this.getStats();
    }
}

module.exports = CorrelationService;
