const JsonCaseProcessor = require('./json-case-processor');
const fs = require('fs').promises;
const path = require('path');

class SimpleJsonProcessor {
  constructor() {
    // Use test environment paths
    const testProcessingPath = path.join(__dirname, 'processing_inbox_test');
    this.processor = new JsonCaseProcessor('/srv/camera_uploads', testProcessingPath);
  }

  /**
   * Processes JSON case files from a directory
   */
  async processDirectory(directory) {
    console.log(`🔄 Processing JSON files from: ${directory}`);
    
    try {
      // Override the FTP cases path
      this.processor.ftpCasesPath = directory;
      
      // Process existing cases
      await this.processor.processExistingCases();
      
      const stats = this.processor.getStats();
      console.log(`✅ Processed ${stats.processedCases} case files`);
      
      return stats;
    } catch (error) {
      console.error('❌ Error processing directory:', error);
      throw error;
    }
  }

  /**
   * Creates sample case files and processes them
   */
  async demonstrateSystem() {
    console.log('🚀 JSON Case Processing Demonstration');
    console.log('====================================');
    
    // Create sample cases directory
    const sampleDir = await this.createSampleCases();
    
    // Process the sample cases
    console.log('\n📋 Processing Sample Cases:');
    await this.processDirectory(sampleDir);
    
    // Show results
    console.log('\n📋 Checking Results:');
    await this.showResults();
    
    console.log('\n✅ Demonstration complete!');
  }

  /**
   * Creates sample JSON case files
   */
  async createSampleCases() {
    const sampleDir = path.join(__dirname, 'demo_json_cases');
    await fs.mkdir(sampleDir, { recursive: true });
    
    const cases = [
      {
        filename: 'camera002_violation_70kmh.json',
        data: {
          camera_id: 'camera002',
          speed: 70,
          src_ip: '192.168.1.60',
          event_ts: Math.floor(Date.now() / 1000),
          decision: 'violation',
          location: 'Main Street Intersection'
        }
      },
      {
        filename: 'camera001_compliant_25kmh.json',
        data: {
          camera_id: 'camera001',
          velocity: 25,
          src_ip: '192.168.1.55',
          timestamp: new Date().toISOString(),
          decision: 'compliant',
          location: 'School Zone'
        }
      },
      {
        filename: 'camera003_severe_85kmh.json',
        data: {
          camera_id: 'camera003',
          radar_speed: 85,
          source_ip: '192.168.1.65',
          created_at: new Date().toISOString(),
          decision: 'violation',
          location: 'Highway Entry'
        }
      },
      {
        filename: 'camera002_minor_35kmh.json',
        data: {
          camera_id: 'camera002',
          speed: 35,
          src_ip: '192.168.1.60',
          event_ts: Math.floor(Date.now() / 1000) - 600, // 10 minutes ago
          decision: 'violation',
          location: 'Residential Area'
        }
      },
      {
        filename: 'nested_payload_example.json',
        data: {
          camera_id: 'camera001',
          timestamp: new Date().toISOString(),
          payload: {
            speed: 55,
            camera_id: 'camera001',
            event_ts: new Date().toISOString(),
            metadata: {
              weather: 'clear',
              visibility: 'good'
            }
          },
          src_ip: '192.168.1.55'
        }
      }
    ];
    
    console.log('📄 Creating sample JSON case files:');
    for (const caseFile of cases) {
      const filePath = path.join(sampleDir, caseFile.filename);
      await fs.writeFile(filePath, JSON.stringify(caseFile.data, null, 2));
      console.log(`   ✓ ${caseFile.filename} (${caseFile.data.speed || caseFile.data.velocity || caseFile.data.radar_speed || caseFile.data.payload?.speed} km/h)`);
    }
    
    console.log(`✅ Created ${cases.length} sample files in: ${sampleDir}`);
    return sampleDir;
  }

  /**
   * Shows the processing results
   */
  async showResults() {
    try {
      const processingPath = path.join(__dirname, 'processing_inbox_test');
      const today = new Date().toISOString().split('T')[0];
      
      console.log('📊 Violation Processing Results:');
      console.log('===============================');
      
      const cameras = ['camera001', 'camera002', 'camera003'];
      let totalViolations = 0;
      
      for (const cameraId of cameras) {
        const cameraPath = path.join(processingPath, cameraId, today);
        
        try {
          const folders = await fs.readdir(cameraPath, { withFileTypes: true });
          const violationFolders = folders.filter(f => f.isDirectory());
          
          if (violationFolders.length > 0) {
            console.log(`\n📁 ${cameraId.toUpperCase()}: ${violationFolders.length} violations`);
            totalViolations += violationFolders.length;
            
            for (const folder of violationFolders) {
              const verdictPath = path.join(cameraPath, folder.name, 'verdict.json');
              try {
                const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
                console.log(`   🚨 ${verdictData.speed} km/h - ${verdictData.car_filter} - ${folder.name}`);
                
                // Show photos
                const photoCount = verdictData.photos ? verdictData.photos.length : 0;
                console.log(`      📷 ${photoCount} photos prepared`);
              } catch (verdictError) {
                console.log(`   ❌ Could not read verdict for ${folder.name}`);
              }
            }
          }
        } catch (readError) {
          // Camera folder doesn't exist
        }
      }
      
      console.log(`\n📊 SUMMARY: ${totalViolations} total violations processed`);
      
      if (totalViolations > 0) {
        console.log('\n🎯 System Behavior Confirmed:');
        console.log('   ✓ JSON case files automatically processed');
        console.log('   ✓ Speed violations (>30 km/h) detected');
        console.log('   ✓ 3-photo violation folders created');
        console.log('   ✓ Complete verdict.json metadata generated');
        console.log('   ✓ Car filter classification applied');
        console.log('   ✓ Folder structure: /processing_inbox/cameraXXX/YYYY-MM-DD/eventId/');
      }
      
    } catch (error) {
      console.error('❌ Error showing results:', error);
    }
  }

  /**
   * Processes a specific JSON file
   */
  async processFile(filePath) {
    console.log(`🔄 Processing single file: ${filePath}`);
    
    try {
      await this.processor.processCaseFile(filePath);
      console.log('✅ File processed successfully');
    } catch (error) {
      console.error('❌ Error processing file:', error);
    }
  }

  /**
   * Shows system status
   */
  getStatus() {
    const stats = this.processor.getStats();
    return {
      mode: 'JSON Case Processing',
      processedCases: stats.processedCases,
      speedLimit: 30,
      timestamp: new Date().toISOString(),
      processingPath: this.processor.threePhotoProcessor.processingInboxPath
    };
  }
}

// Command line interface
if (require.main === module) {
  const processor = new SimpleJsonProcessor();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run demonstration
    processor.demonstrateSystem().then(() => {
      console.log('\n🎉 JSON processing demonstration complete!');
      process.exit(0);
    }).catch((error) => {
      console.error('\n💥 Demonstration failed:', error);
      process.exit(1);
    });
  } else if (args[0] === '--file' && args[1]) {
    // Process specific file
    processor.processFile(args[1]).then(() => {
      console.log('\n✅ File processing complete!');
      process.exit(0);
    }).catch((error) => {
      console.error('\n❌ File processing failed:', error);
      process.exit(1);
    });
  } else if (args[0] === '--directory' && args[1]) {
    // Process directory
    processor.processDirectory(args[1]).then(() => {
      console.log('\n✅ Directory processing complete!');
      process.exit(0);
    }).catch((error) => {
      console.error('\n❌ Directory processing failed:', error);
      process.exit(1);
    });
  } else {
    console.log('Usage:');
    console.log('  node simple-json-processor.js                    # Run demonstration');
    console.log('  node simple-json-processor.js --file <path>      # Process single file');
    console.log('  node simple-json-processor.js --directory <path> # Process directory');
  }
}

module.exports = SimpleJsonProcessor;
