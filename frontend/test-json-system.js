const JsonCaseProcessor = require('./json-case-processor');
const fs = require('fs').promises;
const path = require('path');

class JsonSystemTester {
  constructor() {
    this.processor = new JsonCaseProcessor();
    this.testCasesDir = path.join(__dirname, 'test_json_cases');
  }

  /**
   * Creates various test JSON case files
   */
  async createTestCases() {
    console.log('🧪 Creating test JSON case files...');
    
    await fs.mkdir(this.testCasesDir, { recursive: true });
    
    const testCases = [
      {
        filename: 'violation_case_001.json',
        description: 'Severe violation - 70 km/h',
        data: {
          camera_id: 'camera002',
          speed: 70,
          src_ip: '192.168.1.60',
          event_ts: Math.floor(Date.now() / 1000),
          decision: 'violation',
          location: 'Main Street',
          weather: 'clear'
        }
      },
      {
        filename: 'compliant_case_001.json',
        description: 'Compliant vehicle - 25 km/h',
        data: {
          camera_id: 'camera002',
          velocity: 25,
          src_ip: '192.168.1.60',
          timestamp: new Date().toISOString(),
          decision: 'compliant',
          location: 'School Zone'
        }
      },
      {
        filename: 'violation_case_002.json',
        description: 'Minor violation - 35 km/h',
        data: {
          camera_id: 'camera001',
          radar_speed: 35,
          source_ip: '192.168.1.55',
          created_at: new Date().toISOString(),
          decision: 'violation',
          payload: {
            additional_data: 'test'
          }
        }
      },
      {
        filename: 'severe_violation_case.json',
        description: 'Severe violation - 85 km/h',
        data: {
          camera_id: 'camera003',
          speed: 85,
          src_ip: '192.168.1.65',
          event_ts: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago
          decision: 'violation',
          vehicle_type: 'car',
          lane: 2
        }
      },
      {
        filename: 'nested_payload_case.json',
        description: 'Speed in nested payload',
        data: {
          camera_id: 'camera002',
          src_ip: '192.168.1.60',
          timestamp: new Date().toISOString(),
          payload: {
            speed: 45,
            camera_id: 'camera002',
            event_ts: new Date().toISOString()
          },
          metadata: {
            version: '1.0',
            source: 'radar_sensor'
          }
        }
      }
    ];
    
    for (const testCase of testCases) {
      const filePath = path.join(this.testCasesDir, testCase.filename);
      await fs.writeFile(filePath, JSON.stringify(testCase.data, null, 2));
      console.log(`📄 Created: ${testCase.filename} - ${testCase.description}`);
    }
    
    console.log(`✅ Created ${testCases.length} test case files in: ${this.testCasesDir}`);
    return this.testCasesDir;
  }

  /**
   * Tests the JSON case processor
   */
  async testJsonProcessor() {
    console.log('🧪 Testing JSON Case Processor...');
    
    try {
      // Override the FTP cases path to use our test directory
      this.processor.ftpCasesPath = this.testCasesDir;
      
      // Process existing cases
      await this.processor.processExistingCases();
      
      console.log('✅ JSON processing test completed');
      
      // Show statistics
      const stats = this.processor.getStats();
      console.log('📊 Processing Statistics:');
      console.log(`   Processed Cases: ${stats.processedCases}`);
      console.log(`   Watched Directory: ${stats.watchedDirectory}`);
      
    } catch (error) {
      console.error('❌ JSON processor test failed:', error);
    }
  }

  /**
   * Tests file watching functionality
   */
  async testFileWatching() {
    console.log('🧪 Testing file watching functionality...');
    
    try {
      // Override the FTP cases path to use our test directory
      this.processor.ftpCasesPath = this.testCasesDir;
      
      // Start monitoring
      await this.processor.startMonitoring();
      
      console.log('👀 File watcher started. Creating new test file...');
      
      // Wait 2 seconds then create a new file
      setTimeout(async () => {
        const newCaseFile = path.join(this.testCasesDir, 'dynamic_test_case.json');
        const newCaseData = {
          camera_id: 'camera002',
          speed: 55,
          src_ip: '192.168.1.60',
          event_ts: Math.floor(Date.now() / 1000),
          decision: 'violation',
          test_type: 'dynamic_creation'
        };
        
        await fs.writeFile(newCaseFile, JSON.stringify(newCaseData, null, 2));
        console.log('📄 Created dynamic test case file');
        
        // Stop monitoring after 5 seconds
        setTimeout(async () => {
          await this.processor.stop();
          console.log('✅ File watching test completed');
        }, 5000);
        
      }, 2000);
      
    } catch (error) {
      console.error('❌ File watching test failed:', error);
    }
  }

  /**
   * Shows the expected JSON case file formats
   */
  showExpectedFormats() {
    console.log('\n📋 Expected JSON Case File Formats:');
    console.log('=====================================');
    
    console.log('\n1. Basic Format:');
    console.log(JSON.stringify({
      camera_id: 'camera002',
      speed: 70,
      src_ip: '192.168.1.60',
      event_ts: 1728123456,
      decision: 'violation'
    }, null, 2));
    
    console.log('\n2. Alternative Speed Fields:');
    console.log(JSON.stringify({
      camera_id: 'camera001',
      velocity: 45,  // or radar_speed
      timestamp: '2025-10-05T14:58:00Z',
      source_ip: '192.168.1.55'
    }, null, 2));
    
    console.log('\n3. Nested Payload Format:');
    console.log(JSON.stringify({
      camera_id: 'camera003',
      payload: {
        speed: 85,
        camera_id: 'camera003',
        event_ts: '2025-10-05T14:58:00Z'
      },
      src_ip: '192.168.1.65'
    }, null, 2));
    
    console.log('\n📝 Supported Speed Fields:');
    console.log('   - speed');
    console.log('   - velocity');
    console.log('   - radar_speed');
    console.log('   - payload.speed');
    console.log('   - payload.velocity');
    
    console.log('\n📝 Supported Camera ID Fields:');
    console.log('   - camera_id');
    console.log('   - cameraId');
    console.log('   - camera');
    console.log('   - payload.camera_id');
    
    console.log('\n📝 Supported Timestamp Fields:');
    console.log('   - event_ts (Unix timestamp)');
    console.log('   - timestamp (ISO string)');
    console.log('   - created_at (ISO string)');
    console.log('   - detection_time (ISO string)');
  }

  /**
   * Checks violation folders created
   */
  async checkViolationFolders() {
    console.log('\n🔍 Checking created violation folders...');
    
    try {
      const processingPath = path.join(__dirname, 'processing_inbox_test');
      const today = new Date().toISOString().split('T')[0];
      
      // Check for camera folders
      const cameras = ['camera001', 'camera002', 'camera003'];
      
      for (const cameraId of cameras) {
        const cameraPath = path.join(processingPath, cameraId, today);
        
        try {
          const folders = await fs.readdir(cameraPath, { withFileTypes: true });
          const violationFolders = folders.filter(f => f.isDirectory());
          
          if (violationFolders.length > 0) {
            console.log(`📁 ${cameraId}: ${violationFolders.length} violation folders`);
            
            for (const folder of violationFolders.slice(0, 3)) { // Show first 3
              const verdictPath = path.join(cameraPath, folder.name, 'verdict.json');
              try {
                const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
                console.log(`   📄 ${folder.name}: ${verdictData.speed} km/h (${verdictData.car_filter})`);
              } catch (verdictError) {
                console.log(`   📄 ${folder.name}: verdict.json not readable`);
              }
            }
          }
        } catch (readError) {
          // Camera folder doesn't exist yet
        }
      }
      
    } catch (error) {
      console.error('❌ Error checking violation folders:', error);
    }
  }

  /**
   * Runs all tests
   */
  async runAllTests() {
    console.log('🚀 Starting JSON System Tests');
    console.log('=============================');
    
    try {
      // Show expected formats
      this.showExpectedFormats();
      
      // Test 1: Create test cases
      console.log('\n📋 Test 1: Creating Test JSON Cases');
      await this.createTestCases();
      
      // Test 2: Process existing cases
      console.log('\n📋 Test 2: Processing JSON Cases');
      await this.testJsonProcessor();
      
      // Test 3: Check violation folders
      console.log('\n📋 Test 3: Checking Violation Folders');
      await this.checkViolationFolders();
      
      console.log('\n✅ All JSON system tests completed!');
      console.log('\n💡 To test file watching, run: node test-json-system.js --watch');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error);
    }
  }

  /**
   * Cleanup test files
   */
  async cleanup() {
    try {
      await fs.rm(this.testCasesDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up test files');
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new JsonSystemTester();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--watch')) {
    // Test file watching
    tester.createTestCases().then(() => {
      return tester.testFileWatching();
    }).catch((error) => {
      console.error('💥 File watching test failed:', error);
      process.exit(1);
    });
  } else {
    // Run all tests
    tester.runAllTests().then(() => {
      console.log('\n🎉 Testing complete!');
      process.exit(0);
    }).catch((error) => {
      console.error('\n💥 Testing failed:', error);
      process.exit(1);
    });
  }
}

module.exports = JsonSystemTester;
