const fs = require('fs').promises;
const path = require('path');
const Fine = require('../models/Fine');
const Radar = require('../models/Radar');
const { Op } = require('sequelize');

/**
 * AI to Fines Database Synchronization Service
 * Processes AI detection results and creates fine records in the database
 */
class AiToFinesSync {
  constructor() {
    this.processingInbox = '/srv/processing_inbox';
    this.isRunning = false;
    this.processedCases = new Set();
  }

  /**
   * Start the synchronization service
   */
  async start() {
    if (this.isRunning) {
      console.log('🔄 AI to Fines sync service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting AI to Fines synchronization service...');
    
    try {
      // Initial sync of all existing AI results
      await this.syncAllAiResults();
      
      // Set up periodic sync (every 30 seconds)
      this.syncInterval = setInterval(() => {
        this.syncAllAiResults().catch(error => {
          console.error('❌ Error in periodic sync:', error);
        });
      }, 30000);
      
      console.log('✅ AI to Fines sync service started successfully');
    } catch (error) {
      console.error('❌ Failed to start AI to Fines sync service:', error);
      this.isRunning = false;
    }
  }

  /**
   * Stop the synchronization service
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 AI to Fines sync service stopped');
  }

  /**
   * Sync all AI results to fines database
   */
  async syncAllAiResults() {
    try {
      console.log('🔍 Scanning for AI detection results...');
      
      const cameras = await fs.readdir(this.processingInbox);
      let processedCount = 0;
      let skippedCount = 0;
      
      for (const camera of cameras) {
        const cameraPath = path.join(this.processingInbox, camera);
        const stat = await fs.stat(cameraPath);
        
        if (!stat.isDirectory()) continue;
        
        // Get or create radar record for this camera
        const radar = await this.getOrCreateRadar(camera);
        
        // Read all date directories
        const dates = await fs.readdir(cameraPath);
        
        for (const date of dates) {
          const datePath = path.join(cameraPath, date);
          const dateStat = await fs.stat(datePath);
          
          if (!dateStat.isDirectory()) continue;
          
          // Read all case directories
          const caseNames = await fs.readdir(datePath);
          
          for (const caseName of caseNames) {
            const casePath = path.join(datePath, caseName);
            const caseStat = await fs.stat(casePath);
            
            if (!caseStat.isDirectory()) continue;
            
            // Check if AI results exist
            const aiResultsPath = path.join(casePath, 'ai', 'ai_detection_results.json');
            
            try {
              await fs.access(aiResultsPath);
              
              const caseId = `${camera}_${date}_${caseName}`;
              
              // Skip if already processed
              if (this.processedCases.has(caseId)) {
                skippedCount++;
                continue;
              }
              
              // Process this case
              const success = await this.processCaseToFines(aiResultsPath, radar, caseId);
              if (success) {
                this.processedCases.add(caseId);
                processedCount++;
              }
              
            } catch (e) {
              // No AI results for this case
              continue;
            }
          }
        }
      }
      
      if (processedCount > 0 || skippedCount > 0) {
        console.log(`📊 AI Sync Summary: ${processedCount} new cases processed, ${skippedCount} already synced`);
      }
      
    } catch (error) {
      console.error('❌ Error syncing AI results:', error);
    }
  }

  /**
   * Get or create radar record for camera
   */
  async getOrCreateRadar(cameraId) {
    try {
      let radar = await Radar.findOne({ where: { identifier: cameraId } });
      
      if (!radar) {
        // Create new radar record
        radar = await Radar.create({
          identifier: cameraId,
          name: `Radar Camera ${cameraId.replace('camera', '')}`,
          location: `Location ${cameraId}`,
          speedLimit: 30, // Default speed limit
          status: 'active',
          ipAddress: '192.168.1.60', // Default IP
          port: 8080,
          model: 'AI-Enhanced Radar',
          firmware: '1.0.0',
          installationDate: new Date(),
          lastMaintenance: new Date()
        });
        
        console.log(`✅ Created new radar record for ${cameraId}`);
      }
      
      return radar;
    } catch (error) {
      console.error(`❌ Error getting/creating radar for ${cameraId}:`, error);
      throw error;
    }
  }

  /**
   * Process a single AI case to create fine record
   */
  async processCaseToFines(aiResultsPath, radar, caseId) {
    try {
      // Read AI results
      const aiData = JSON.parse(await fs.readFile(aiResultsPath, 'utf8'));
      
      // Extract violation data
      const originalData = aiData.original_case_data;
      if (!originalData || originalData.decision !== 'violation') {
        // Not a violation, skip
        return false;
      }
      
      // Get the best plate detection (highest confidence)
      let bestPlate = null;
      if (aiData.detected_plates && aiData.detected_plates.length > 0) {
        bestPlate = aiData.detected_plates.reduce((best, current) => 
          current.confidence > (best?.confidence || 0) ? current : best
        );
      }
      
      // Calculate violation amount and fine
      const speedDetected = originalData.speed || 0;
      const speedLimit = originalData.limit || 30;
      const violationAmount = Math.max(0, speedDetected - speedLimit);
      const fineAmount = this.calculateFineAmount(violationAmount);
      
      // Create violation datetime from event timestamp
      let violationDateTime = new Date();
      if (originalData.event_ts) {
        // Convert Unix timestamp to Date (assuming it's in seconds)
        violationDateTime = new Date(originalData.event_ts * 1000);
      }
      
      // Get first processed image for imageUrl
      let imageUrl = null;
      if (aiData.processed_images && aiData.processed_images.length > 0) {
        const firstImage = aiData.processed_images[0];
        // Create relative URL for the processed image
        imageUrl = `/ai-images/${aiData.camera_id}/${aiData.case_id.split(':')[1].split('-').slice(0,3).join('-')}/${path.basename(path.dirname(aiResultsPath))}/ai/processed_${firstImage.filename}`;
      }
      
      // Check if fine already exists
      const existingFine = await Fine.findOne({
        where: {
          radarId: radar.id,
          violationDateTime: violationDateTime,
          [Op.or]: [
            { notes: { [Op.like]: `%${caseId}%` } },
            { notes: { [Op.like]: `%${originalData.burst_id}%` } }
          ]
        }
      });
      
      if (existingFine) {
        console.log(`⚠️ Fine already exists for case ${caseId}`);
        return false;
      }
      
      // Create fine record
      const fine = await Fine.create({
        radarId: radar.id,
        vehiclePlate: bestPlate?.plate_text || null,
        speedDetected: speedDetected,
        speedLimit: speedLimit,
        violationAmount: violationAmount,
        fineAmount: fineAmount,
        violationDateTime: violationDateTime,
        status: 'pending',
        imageUrl: imageUrl,
        notes: JSON.stringify({
          caseId: caseId,
          burstId: originalData.burst_id,
          aiProcessingTimestamp: aiData.processing_timestamp,
          platesDetected: aiData.total_plates_detected,
          plateConfidence: bestPlate?.confidence || null,
          detectionMethod: bestPlate?.detection_method || null,
          imagesProcessed: aiData.images_processed
        })
      });
      
      console.log(`✅ Created fine record for case ${caseId}: ${bestPlate?.plate_text || 'No plate'} - ${speedDetected}km/h (${violationAmount}km/h over limit)`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error processing case ${caseId}:`, error);
      return false;
    }
  }

  /**
   * Calculate fine amount based on violation amount
   */
  calculateFineAmount(violationAmount) {
    // Jordan traffic fine structure (approximate)
    if (violationAmount <= 0) return 0;
    if (violationAmount <= 10) return 50; // JOD 50 for 1-10 km/h over
    if (violationAmount <= 20) return 100; // JOD 100 for 11-20 km/h over
    if (violationAmount <= 30) return 200; // JOD 200 for 21-30 km/h over
    if (violationAmount <= 40) return 300; // JOD 300 for 31-40 km/h over
    return 500; // JOD 500 for 40+ km/h over
  }

  /**
   * Get synchronization statistics
   */
  async getStats() {
    try {
      const totalFines = await Fine.count();
      const pendingFines = await Fine.count({ where: { status: 'pending' } });
      const processedFines = await Fine.count({ where: { status: 'processed' } });
      const paidFines = await Fine.count({ where: { status: 'paid' } });
      
      // Count AI cases
      const cameras = await fs.readdir(this.processingInbox);
      let totalAiCases = 0;
      
      for (const camera of cameras) {
        const cameraPath = path.join(this.processingInbox, camera);
        const stat = await fs.stat(cameraPath);
        if (!stat.isDirectory()) continue;
        
        const dates = await fs.readdir(cameraPath);
        for (const date of dates) {
          const datePath = path.join(cameraPath, date);
          const dateStat = await fs.stat(datePath);
          if (!dateStat.isDirectory()) continue;
          
          const caseNames = await fs.readdir(datePath);
          for (const caseName of caseNames) {
            const aiResultsPath = path.join(datePath, caseName, 'ai', 'ai_detection_results.json');
            try {
              await fs.access(aiResultsPath);
              totalAiCases++;
            } catch (e) {
              // No AI results
            }
          }
        }
      }
      
      return {
        isRunning: this.isRunning,
        totalAiCases,
        processedCases: this.processedCases.size,
        totalFines,
        pendingFines,
        processedFines,
        paidFines,
        syncRate: totalAiCases > 0 ? ((this.processedCases.size / totalAiCases) * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('❌ Error getting sync stats:', error);
      return null;
    }
  }
}

module.exports = AiToFinesSync;
