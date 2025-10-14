const ThreePhotoProcessor = require('./three-photo-processor');
const dgram = require('dgram');

class ThreePhotoSystemTester {
  constructor() {
    // Use local test directory for testing
    const testPath = require('path').join(__dirname, 'processing_inbox_test');
    this.processor = new ThreePhotoProcessor(testPath);
    this.testClient = dgram.createSocket('udp4');
  }

  /**
   * Creates a sample violation folder to test the system
   */
  async createSampleViolation() {
    console.log('🧪 Creating sample violation for testing...');
    
    const sampleViolationData = {
      event_id: "camera002:2025-10-05T11:31:48Z:70",
      camera_id: "camera002",
      src_ip: "192.168.1.60",
      event_ts: 1759663908.0,
      arrival_ts: 1759663908.1469595,
      decision: "violation",
      speed: 70,
      limit: 30
    };

    try {
      const folderPath = await this.processor.createViolationFolder(sampleViolationData, []);
      console.log(`✅ Sample violation created at: ${folderPath}`);
      
      // List the contents
      const fs = require('fs').promises;
      const contents = await fs.readdir(folderPath);
      console.log('📁 Folder contents:', contents);
      
      // Read and display the verdict.json
      const verdictPath = require('path').join(folderPath, 'verdict.json');
      const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
      console.log('📄 Verdict data:');
      console.log(JSON.stringify(verdictData, null, 2));
      
      return folderPath;
    } catch (error) {
      console.error('❌ Error creating sample violation:', error);
      throw error;
    }
  }

  /**
   * Tests the radar UDP integration with new system
   */
  async testRadarIntegration() {
    console.log('🧪 Testing radar UDP integration...');
    
    const testMessages = [
      "ID: 2,Speed: 70, Time: 11:31:48.",  // Violation
      "ID: 2,Speed: 25, Time: 11:32:15.",  // Compliant
      "ID: 2,Speed: 45, Time: 11:32:30.",  // Violation
      "ID: 2,Speed: 85, Time: 11:33:00."   // Severe violation
    ];

    for (const message of testMessages) {
      console.log(`📡 Sending test message: ${message}`);
      
      const buffer = Buffer.from(message);
      this.testClient.send(buffer, 17081, 'localhost', (error) => {
        if (error) {
          console.error('❌ Error sending UDP message:', error);
        } else {
          console.log('✅ Message sent successfully');
        }
      });
      
      // Wait 2 seconds between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Tests listing violations
   */
  async testListViolations() {
    console.log('🧪 Testing violation listing...');
    
    const today = new Date().toISOString().split('T')[0];
    const violations = await this.processor.listViolations('camera002', today);
    
    console.log(`📋 Found ${violations.length} violations for camera002 on ${today}`);
    
    violations.forEach((violation, index) => {
      console.log(`${index + 1}. Event ID: ${violation.eventId}`);
      console.log(`   Speed: ${violation.verdict.speed} km/h`);
      console.log(`   Decision: ${violation.verdict.decision}`);
      console.log(`   Car Filter: ${violation.verdict.car_filter}`);
      console.log(`   Photos: ${violation.verdict.photos.length}`);
      console.log('');
    });
  }

  /**
   * Tests the API endpoints
   */
  async testAPIEndpoints() {
    console.log('🧪 Testing API endpoints...');
    
    const axios = require('axios');
    const baseURL = 'http://localhost:3003';
    
    try {
      // Test health endpoint
      console.log('🔍 Testing health endpoint...');
      const healthResponse = await axios.get(`${baseURL}/health`);
      console.log('✅ Health check passed');
      console.log('Available endpoints:', Object.keys(healthResponse.data.endpoints));
      
      // Test violation stats
      console.log('🔍 Testing violation stats...');
      const today = new Date().toISOString().split('T')[0];
      const statsResponse = await axios.get(`${baseURL}/api/violations/stats/${today}`);
      console.log('📊 Violation stats:', statsResponse.data);
      
      // Test violation listing
      console.log('🔍 Testing violation listing...');
      const violationsResponse = await axios.get(`${baseURL}/api/violations/camera002/${today}`);
      console.log(`📋 Found ${violationsResponse.data.total} violations`);
      
      if (violationsResponse.data.violations.length > 0) {
        const firstViolation = violationsResponse.data.violations[0];
        console.log('📄 First violation details:');
        console.log(`   Event ID: ${firstViolation.eventId}`);
        console.log(`   Speed: ${firstViolation.verdict.speed} km/h`);
        console.log(`   Decision: ${firstViolation.verdict.decision}`);
        
        // Test getting specific violation details
        console.log('🔍 Testing specific violation details...');
        const detailsResponse = await axios.get(`${baseURL}/api/violations/camera002/${today}/${firstViolation.eventId}`);
        console.log('📋 Violation details retrieved successfully');
        console.log(`   Photos available: ${detailsResponse.data.photos.filter(p => p.exists).length}/3`);
      }
      
    } catch (error) {
      console.error('❌ API test error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }

  /**
   * Runs all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Three-Photo System Tests');
    console.log('=====================================');
    
    try {
      // Test 1: Create sample violation
      console.log('\n📋 Test 1: Creating Sample Violation');
      await this.createSampleViolation();
      
      // Test 2: List violations
      console.log('\n📋 Test 2: Listing Violations');
      await this.testListViolations();
      
      // Test 3: Test API endpoints
      console.log('\n📋 Test 3: Testing API Endpoints');
      await this.testAPIEndpoints();
      
      // Test 4: Test radar integration (optional - requires radar server running)
      console.log('\n📋 Test 4: Testing Radar Integration (optional)');
      console.log('💡 To test radar integration, make sure radar-udp-server.js is running');
      console.log('💡 Then uncomment the line below:');
      console.log('// await this.testRadarIntegration();');
      
      console.log('\n✅ All tests completed successfully!');
      console.log('\n📁 Check /srv/processing_inbox/camera002/ for created violation folders');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error);
    } finally {
      this.testClient.close();
    }
  }

  /**
   * Demonstrates the expected folder structure
   */
  showExpectedStructure() {
    console.log('\n📁 Expected Folder Structure:');
    console.log('/srv/processing_inbox/');
    console.log('├── camera001/');
    console.log('│   └── 2025-10-05/');
    console.log('│       └── camera001:2025-10-05T10:30:00Z:45/');
    console.log('│           ├── photo_1.jpg');
    console.log('│           ├── photo_2.jpg');
    console.log('│           ├── photo_3.jpg');
    console.log('│           └── verdict.json');
    console.log('├── camera002/');
    console.log('│   └── 2025-10-05/');
    console.log('│       └── camera002:2025-10-05T11:31:48Z:70/');
    console.log('│           ├── photo_1.jpg');
    console.log('│           ├── photo_2.jpg');
    console.log('│           ├── photo_3.jpg');
    console.log('│           └── verdict.json');
    console.log('└── camera003/');
    console.log('    └── 2025-10-05/');
    console.log('        └── ...');
    
    console.log('\n📄 Sample verdict.json structure:');
    console.log(JSON.stringify({
      "event_id": "camera002:2025-10-05T11:31:48Z:70",
      "camera_id": "camera002",
      "src_ip": "192.168.1.60",
      "event_ts": 1759663908.0,
      "arrival_ts": 1759663908.1469595,
      "decision": "violation",
      "speed": 70,
      "limit": 30,
      "car_filter": "serious_violation",
      "payload": {
        "decision": "violation",
        "limit": 30,
        "speed": 70,
        "camera_id": "camera002",
        "event_ts": "2025-10-05T11:31:48Z",
        "event_id": "camera002:2025-10-05T11:31:48Z:70"
      },
      "photos": [
        {"filename": "photo_1.jpg", "sequence": 1},
        {"filename": "photo_2.jpg", "sequence": 2},
        {"filename": "photo_3.jpg", "sequence": 3}
      ],
      "created_at": "2025-10-05T14:47:06.000Z",
      "processing_status": "pending"
    }, null, 2));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ThreePhotoSystemTester();
  
  // Show expected structure first
  tester.showExpectedStructure();
  
  // Run all tests
  tester.runAllTests().then(() => {
    console.log('\n🎉 Testing complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Testing failed:', error);
    process.exit(1);
  });
}

module.exports = ThreePhotoSystemTester;
