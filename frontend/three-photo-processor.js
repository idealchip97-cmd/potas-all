const fs = require('fs').promises;
const path = require('path');

class ThreePhotoProcessor {
  constructor(processingInboxPath = '/srv/processing_inbox') {
    this.processingInboxPath = processingInboxPath;
    this.speedLimit = 30; // Static speed limit
    this.photoCount = 3; // Number of photos per violation
  }

  /**
   * Creates a violation folder with 3 photos and a verdict.json file
   * @param {Object} violationData - The violation data from radar
   * @param {Array} imageFiles - Array of image file paths (should be 3)
   * @returns {Promise<string>} - Path to the created violation folder
   */
  async createViolationFolder(violationData, imageFiles = []) {
    try {
      const {
        event_id,
        camera_id,
        src_ip,
        event_ts,
        arrival_ts,
        speed,
        decision
      } = violationData;

      // Create folder structure: /srv/processing_inbox/camera002/2025-10-05/event_id/
      const dateStr = new Date(event_ts * 1000).toISOString().split('T')[0];
      const violationFolderPath = path.join(
        this.processingInboxPath,
        camera_id,
        dateStr,
        event_id
      );

      // Ensure the directory exists
      await fs.mkdir(violationFolderPath, { recursive: true });
      console.log(`📁 Created violation folder: ${violationFolderPath}`);

      // Create verdict.json file
      const verdictData = {
        event_id: event_id,
        camera_id: camera_id,
        src_ip: src_ip,
        event_ts: event_ts,
        arrival_ts: arrival_ts,
        decision: decision,
        speed: speed,
        limit: this.speedLimit, // Static limit of 30
        car_filter: this.generateCarFilter(speed, this.speedLimit),
        payload: {
          decision: decision,
          limit: this.speedLimit,
          speed: speed,
          camera_id: camera_id,
          event_ts: new Date(event_ts * 1000).toISOString(),
          event_id: event_id
        },
        photos: [],
        created_at: new Date().toISOString(),
        processing_status: 'pending'
      };

      // Process and copy the 3 photos
      if (imageFiles.length > 0) {
        const photoPromises = imageFiles.slice(0, this.photoCount).map(async (imagePath, index) => {
          const photoNumber = index + 1;
          const photoFilename = `photo_${photoNumber}.jpg`;
          const destinationPath = path.join(violationFolderPath, photoFilename);
          
          try {
            // Copy the image file
            await fs.copyFile(imagePath, destinationPath);
            console.log(`📷 Copied photo ${photoNumber}: ${photoFilename}`);
            
            // Add photo info to verdict data
            verdictData.photos.push({
              filename: photoFilename,
              sequence: photoNumber,
              timestamp: new Date().toISOString(),
              size: (await fs.stat(destinationPath)).size
            });
            
            return photoFilename;
          } catch (error) {
            console.error(`❌ Error copying photo ${photoNumber}:`, error.message);
            return null;
          }
        });

        await Promise.all(photoPromises);
      } else {
        // Create placeholder photos if no images provided
        for (let i = 1; i <= this.photoCount; i++) {
          verdictData.photos.push({
            filename: `photo_${i}.jpg`,
            sequence: i,
            timestamp: new Date().toISOString(),
            size: 0,
            status: 'placeholder'
          });
        }
      }

      // Write verdict.json file
      const verdictPath = path.join(violationFolderPath, 'verdict.json');
      await fs.writeFile(verdictPath, JSON.stringify(verdictData, null, 2));
      console.log(`📄 Created verdict.json: ${verdictPath}`);

      return violationFolderPath;
    } catch (error) {
      console.error('❌ Error creating violation folder:', error);
      throw error;
    }
  }

  /**
   * Generates a car filter classification based on speed
   * @param {number} speed - Detected speed
   * @param {number} limit - Speed limit
   * @returns {string} - Car classification
   */
  generateCarFilter(speed, limit) {
    const excess = speed - limit;
    
    if (excess <= 0) return 'compliant';
    if (excess <= 10) return 'minor_violation';
    if (excess <= 20) return 'moderate_violation';
    if (excess <= 30) return 'serious_violation';
    return 'severe_violation';
  }

  /**
   * Simulates capturing 3 photos for a violation
   * @param {string} cameraId - Camera identifier
   * @param {number} eventTimestamp - Event timestamp
   * @returns {Promise<Array>} - Array of simulated photo paths
   */
  async simulatePhotoCapture(cameraId, eventTimestamp) {
    // This would normally interface with camera hardware
    // For now, we'll return placeholder paths
    const photos = [];
    const baseTimestamp = new Date(eventTimestamp * 1000);
    
    for (let i = 0; i < this.photoCount; i++) {
      const photoTime = new Date(baseTimestamp.getTime() + (i * 100)); // 100ms apart
      const photoFilename = `${cameraId}_${photoTime.toISOString().replace(/[:.]/g, '')}_${i + 1}.jpg`;
      photos.push(photoFilename);
    }
    
    return photos;
  }

  /**
   * Processes a radar violation and creates the complete folder structure
   * @param {Object} radarData - Radar detection data
   * @param {string} sourceIP - Source IP of the radar
   * @returns {Promise<Object>} - Processing result
   */
  async processViolation(radarData, sourceIP) {
    try {
      const eventTimestamp = Date.now() / 1000;
      const arrivalTimestamp = eventTimestamp + 0.1469595; // Simulate processing delay
      
      // Generate event ID
      const eventId = `${radarData.cameraId}:${new Date(eventTimestamp * 1000).toISOString()}:${radarData.speed}`;
      
      // Create violation data structure
      const violationData = {
        event_id: eventId,
        camera_id: radarData.cameraId || 'camera002',
        src_ip: sourceIP,
        event_ts: eventTimestamp,
        arrival_ts: arrivalTimestamp,
        decision: radarData.speed > this.speedLimit ? 'violation' : 'compliant',
        speed: radarData.speed,
        limit: this.speedLimit
      };

      // Simulate photo capture
      const photoFiles = await this.simulatePhotoCapture(violationData.camera_id, eventTimestamp);
      
      // Create the violation folder
      const folderPath = await this.createViolationFolder(violationData, []);
      
      console.log(`✅ Violation processed: ${eventId}`);
      console.log(`📁 Folder created: ${folderPath}`);
      
      return {
        success: true,
        eventId: eventId,
        folderPath: folderPath,
        violationData: violationData,
        photoCount: this.photoCount
      };
    } catch (error) {
      console.error('❌ Error processing violation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Lists all violation folders for a specific camera and date
   * @param {string} cameraId - Camera identifier
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} - Array of violation folders
   */
  async listViolations(cameraId, date) {
    try {
      const cameraPath = path.join(this.processingInboxPath, cameraId, date);
      
      try {
        const folders = await fs.readdir(cameraPath, { withFileTypes: true });
        const violations = [];
        
        for (const folder of folders) {
          if (folder.isDirectory()) {
            const violationPath = path.join(cameraPath, folder.name);
            const verdictPath = path.join(violationPath, 'verdict.json');
            
            try {
              const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
              violations.push({
                eventId: folder.name,
                path: violationPath,
                verdict: verdictData
              });
            } catch (verdictError) {
              console.warn(`⚠️ Could not read verdict for ${folder.name}:`, verdictError.message);
            }
          }
        }
        
        return violations;
      } catch (readError) {
        if (readError.code === 'ENOENT') {
          console.log(`📁 No violations found for ${cameraId} on ${date}`);
          return [];
        }
        throw readError;
      }
    } catch (error) {
      console.error('❌ Error listing violations:', error);
      return [];
    }
  }

  /**
   * Gets violation details including photos and verdict
   * @param {string} cameraId - Camera identifier
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} eventId - Event identifier
   * @returns {Promise<Object>} - Violation details
   */
  async getViolationDetails(cameraId, date, eventId) {
    try {
      const violationPath = path.join(this.processingInboxPath, cameraId, date, eventId);
      const verdictPath = path.join(violationPath, 'verdict.json');
      
      // Read verdict file
      const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
      
      // Check for photos
      const photos = [];
      for (let i = 1; i <= this.photoCount; i++) {
        const photoPath = path.join(violationPath, `photo_${i}.jpg`);
        try {
          const stats = await fs.stat(photoPath);
          photos.push({
            filename: `photo_${i}.jpg`,
            path: photoPath,
            size: stats.size,
            exists: true
          });
        } catch (photoError) {
          photos.push({
            filename: `photo_${i}.jpg`,
            path: photoPath,
            size: 0,
            exists: false
          });
        }
      }
      
      return {
        eventId: eventId,
        path: violationPath,
        verdict: verdictData,
        photos: photos
      };
    } catch (error) {
      console.error('❌ Error getting violation details:', error);
      throw error;
    }
  }
}

module.exports = ThreePhotoProcessor;
