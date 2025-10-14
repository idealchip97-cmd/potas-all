const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const ThreePhotoProcessor = require('./three-photo-processor');

class JsonCaseProcessor {
  constructor(ftpCasesPath = '/srv/camera_uploads', processingInboxPath = null) {
    // Use local test directory if no processing path specified
    const testProcessingPath = processingInboxPath || 
      (process.env.NODE_ENV === 'test' ? 
        require('path').join(__dirname, 'processing_inbox_test') : 
        '/srv/processing_inbox');
    
    this.threePhotoProcessor = new ThreePhotoProcessor(testProcessingPath);
    this.ftpCasesPath = ftpCasesPath;
    this.processedCases = new Set(); // Track processed cases to avoid duplicates
    this.watcher = null;
    this.isRunning = false;
  }

  /**
   * Starts monitoring FTP cases directory for new JSON files
   */
  async startMonitoring() {
    console.log('🚀 Starting JSON Case Processor');
    console.log('📁 Monitoring FTP cases directory:', this.ftpCasesPath);
    
    this.isRunning = true;
    
    try {
      // First, process any existing JSON files
      await this.processExistingCases();
      
      // Then start watching for new files
      this.startFileWatcher();
      
      console.log('✅ JSON Case Processor started successfully');
      console.log('🔍 Watching for new case JSON files...');
      
    } catch (error) {
      console.error('❌ Error starting JSON Case Processor:', error);
      throw error;
    }
  }

  /**
   * Processes existing JSON case files in the FTP directory
   */
  async processExistingCases() {
    try {
      console.log('🔍 Scanning for existing case JSON files...');
      
      const jsonFiles = await this.findJsonCaseFiles(this.ftpCasesPath);
      console.log(`📋 Found ${jsonFiles.length} existing JSON case files`);
      
      for (const jsonFile of jsonFiles) {
        await this.processCaseFile(jsonFile);
      }
      
    } catch (error) {
      console.error('❌ Error processing existing cases:', error);
    }
  }

  /**
   * Recursively finds all JSON case files in the FTP directory
   */
  async findJsonCaseFiles(dirPath) {
    const jsonFiles = [];
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findJsonCaseFiles(fullPath);
          jsonFiles.push(...subFiles);
        } else if (item.isFile() && item.name.endsWith('.json')) {
          // Check if it's a case file (contains radar/speed data)
          if (await this.isCaseFile(fullPath)) {
            jsonFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
      console.warn(`⚠️ Could not access directory: ${dirPath}`);
    }
    
    return jsonFiles;
  }

  /**
   * Checks if a JSON file is a valid case file with radar data
   */
  async isCaseFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Check if it has the required radar data fields
      return (
        data.speed !== undefined ||
        data.velocity !== undefined ||
        data.radar_speed !== undefined ||
        (data.payload && (data.payload.speed !== undefined || data.payload.velocity !== undefined))
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Starts file system watcher for new JSON files
   */
  startFileWatcher() {
    console.log('👀 Starting file system watcher...');
    
    // Watch for JSON files in the FTP cases directory
    this.watcher = chokidar.watch(`${this.ftpCasesPath}/**/*.json`, {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true // Don't trigger for existing files
    });

    this.watcher
      .on('add', async (filePath) => {
        console.log(`📄 New JSON file detected: ${filePath}`);
        if (await this.isCaseFile(filePath)) {
          await this.processCaseFile(filePath);
        }
      })
      .on('change', async (filePath) => {
        console.log(`📝 JSON file modified: ${filePath}`);
        if (await this.isCaseFile(filePath)) {
          await this.processCaseFile(filePath);
        }
      })
      .on('error', (error) => {
        console.error('❌ File watcher error:', error);
      });
  }

  /**
   * Processes a single case JSON file
   */
  async processCaseFile(filePath) {
    try {
      console.log(`🔄 Processing case file: ${filePath}`);
      
      // Check if already processed
      if (this.processedCases.has(filePath)) {
        console.log(`⏭️ Case already processed: ${filePath}`);
        return;
      }

      // Read and parse the JSON file
      const content = await fs.readFile(filePath, 'utf8');
      const caseData = JSON.parse(content);
      
      // Extract radar data from the case
      const radarData = this.extractRadarData(caseData, filePath);
      
      if (!radarData) {
        console.log(`⚠️ No valid radar data found in: ${filePath}`);
        return;
      }

      console.log(`🎯 Extracted radar data:`, {
        speed: radarData.speed,
        camera: radarData.cameraId,
        decision: radarData.decision
      });

      // Check if it's a violation (speed > 30 km/h)
      if (radarData.speed > 30) {
        console.log(`🚨 VIOLATION DETECTED: ${radarData.speed} km/h (limit: 30 km/h)`);
        
        // Process with three-photo system
        const violationResult = await this.threePhotoProcessor.processViolation(radarData, radarData.src_ip || '192.168.1.60');
        
        if (violationResult.success) {
          console.log(`✅ Created violation folder: ${violationResult.folderPath}`);
          console.log(`📄 Event ID: ${violationResult.eventId}`);
        } else {
          console.error(`❌ Failed to create violation folder:`, violationResult.error);
        }
      } else {
        console.log(`✅ Vehicle compliant: ${radarData.speed} km/h (limit: 30 km/h)`);
      }

      // Mark as processed
      this.processedCases.add(filePath);
      
    } catch (error) {
      console.error(`❌ Error processing case file ${filePath}:`, error);
    }
  }

  /**
   * Extracts radar data from various JSON case file formats
   */
  extractRadarData(caseData, filePath) {
    try {
      // Extract camera ID from file path or data
      const cameraId = this.extractCameraId(caseData, filePath);
      
      // Extract speed from various possible fields
      let speed = null;
      if (caseData.speed !== undefined) {
        speed = parseInt(caseData.speed);
      } else if (caseData.velocity !== undefined) {
        speed = parseInt(caseData.velocity);
      } else if (caseData.radar_speed !== undefined) {
        speed = parseInt(caseData.radar_speed);
      } else if (caseData.payload && caseData.payload.speed !== undefined) {
        speed = parseInt(caseData.payload.speed);
      } else if (caseData.payload && caseData.payload.velocity !== undefined) {
        speed = parseInt(caseData.payload.velocity);
      }

      if (speed === null || isNaN(speed)) {
        return null;
      }

      // Extract other data
      const eventTimestamp = this.extractTimestamp(caseData);
      const srcIp = caseData.src_ip || caseData.source_ip || '192.168.1.60';
      const decision = speed > 30 ? 'violation' : 'compliant';

      return {
        cameraId: cameraId,
        speed: speed,
        detectionTime: new Date(eventTimestamp),
        src_ip: srcIp,
        decision: decision,
        originalData: caseData
      };
      
    } catch (error) {
      console.error('❌ Error extracting radar data:', error);
      return null;
    }
  }

  /**
   * Extracts camera ID from case data or file path
   */
  extractCameraId(caseData, filePath) {
    // Try to get camera ID from data
    if (caseData.camera_id) return caseData.camera_id;
    if (caseData.cameraId) return caseData.cameraId;
    if (caseData.camera) return caseData.camera;
    if (caseData.payload && caseData.payload.camera_id) return caseData.payload.camera_id;
    
    // Try to extract from file path
    const pathParts = filePath.split('/');
    for (const part of pathParts) {
      if (part.startsWith('camera')) {
        return part;
      }
    }
    
    // Default fallback
    return 'camera002';
  }

  /**
   * Extracts timestamp from case data
   */
  extractTimestamp(caseData) {
    // Try various timestamp fields
    if (caseData.event_ts) return caseData.event_ts * 1000; // Convert from seconds to milliseconds
    if (caseData.timestamp) return new Date(caseData.timestamp).getTime();
    if (caseData.created_at) return new Date(caseData.created_at).getTime();
    if (caseData.detection_time) return new Date(caseData.detection_time).getTime();
    if (caseData.payload && caseData.payload.event_ts) return new Date(caseData.payload.event_ts).getTime();
    
    // Default to current time
    return Date.now();
  }

  /**
   * Gets processing statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      processedCases: this.processedCases.size,
      watchedDirectory: this.ftpCasesPath,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Stops the processor and file watcher
   */
  async stop() {
    console.log('🛑 Stopping JSON Case Processor...');
    
    this.isRunning = false;
    
    if (this.watcher) {
      await this.watcher.close();
      console.log('👀 File watcher stopped');
    }
    
    console.log('✅ JSON Case Processor stopped');
  }

  /**
   * Creates sample case files for testing
   */
  async createSampleCaseFiles() {
    console.log('🧪 Creating sample case files for testing...');
    
    const sampleCasesDir = path.join(__dirname, 'sample_cases');
    await fs.mkdir(sampleCasesDir, { recursive: true });
    
    const sampleCases = [
      {
        filename: 'case001.json',
        data: {
          camera_id: 'camera002',
          speed: 70,
          src_ip: '192.168.1.60',
          event_ts: Math.floor(Date.now() / 1000),
          decision: 'violation'
        }
      },
      {
        filename: 'case002.json',
        data: {
          camera_id: 'camera002',
          velocity: 25,
          src_ip: '192.168.1.60',
          timestamp: new Date().toISOString(),
          decision: 'compliant'
        }
      },
      {
        filename: 'case003.json',
        data: {
          camera_id: 'camera001',
          radar_speed: 85,
          source_ip: '192.168.1.55',
          created_at: new Date().toISOString(),
          decision: 'violation'
        }
      }
    ];
    
    for (const sampleCase of sampleCases) {
      const filePath = path.join(sampleCasesDir, sampleCase.filename);
      await fs.writeFile(filePath, JSON.stringify(sampleCase.data, null, 2));
      console.log(`📄 Created sample case: ${filePath}`);
    }
    
    console.log(`✅ Created ${sampleCases.length} sample case files in: ${sampleCasesDir}`);
    return sampleCasesDir;
  }
}

module.exports = JsonCaseProcessor;
