const dgram = require('dgram');
const axios = require('axios');

class RadarIntegrationTester {
  constructor() {
    this.client = dgram.createSocket('udp4');
    this.radarPort = 17081;
    this.imageServerPort = 3003;
  }

  /**
   * Sends a test radar message via UDP
   */
  async sendRadarMessage(message) {
    return new Promise((resolve, reject) => {
      console.log(`📡 Sending radar message: "${message}"`);
      
      const buffer = Buffer.from(message);
      this.client.send(buffer, this.radarPort, 'localhost', (error) => {
        if (error) {
          console.error('❌ Error sending UDP message:', error.message);
          reject(error);
        } else {
          console.log('✅ Message sent successfully');
          resolve();
        }
      });
    });
  }

  /**
   * Tests the complete radar to violation folder workflow
   */
  async testCompleteWorkflow() {
    console.log('🚀 Testing Complete Radar Integration Workflow');
    console.log('==============================================');

    try {
      // Test messages with different speeds
      const testMessages = [
        "ID: 2,Speed: 70, Time: 14:53:00.",  // Violation (40 km/h over limit)
        "ID: 2,Speed: 25, Time: 14:53:15.",  // Compliant
        "ID: 2,Speed: 45, Time: 14:53:30.",  // Violation (15 km/h over limit)
        "ID: 2,Speed: 85, Time: 14:53:45."   // Severe violation (55 km/h over limit)
      ];

      console.log('\n📋 Step 1: Sending Radar Messages');
      for (let i = 0; i < testMessages.length; i++) {
        const message = testMessages[i];
        await this.sendRadarMessage(message);
        
        // Wait 3 seconds between messages to allow processing
        console.log('⏳ Waiting 3 seconds for processing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      console.log('\n📋 Step 2: Checking Violation Folders Created');
      await this.checkViolationFolders();

      console.log('\n📋 Step 3: Testing API Endpoints');
      await this.testAPIEndpoints();

      console.log('\n✅ Complete workflow test finished!');

    } catch (error) {
      console.error('❌ Workflow test failed:', error.message);
    }
  }

  /**
   * Checks if violation folders were created
   */
  async checkViolationFolders() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const testPath = path.join(__dirname, 'processing_inbox_test');
      const today = new Date().toISOString().split('T')[0];
      const camera002Path = path.join(testPath, 'camera002', today);
      
      console.log(`🔍 Checking violation folders in: ${camera002Path}`);
      
      try {
        const folders = await fs.readdir(camera002Path, { withFileTypes: true });
        const violationFolders = folders.filter(f => f.isDirectory());
        
        console.log(`📁 Found ${violationFolders.length} violation folders:`);
        
        for (const folder of violationFolders) {
          const folderPath = path.join(camera002Path, folder.name);
          const verdictPath = path.join(folderPath, 'verdict.json');
          
          try {
            const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
            console.log(`  📄 ${folder.name}:`);
            console.log(`     Speed: ${verdictData.speed} km/h`);
            console.log(`     Decision: ${verdictData.decision}`);
            console.log(`     Car Filter: ${verdictData.car_filter}`);
            console.log(`     Photos: ${verdictData.photos.length}`);
          } catch (verdictError) {
            console.log(`  ⚠️ Could not read verdict for ${folder.name}`);
          }
        }
        
      } catch (readError) {
        if (readError.code === 'ENOENT') {
          console.log('📁 No violation folders found yet (this is expected if radar server is not running)');
        } else {
          throw readError;
        }
      }
      
    } catch (error) {
      console.error('❌ Error checking violation folders:', error.message);
    }
  }

  /**
   * Tests the API endpoints
   */
  async testAPIEndpoints() {
    try {
      const baseURL = `http://localhost:${this.imageServerPort}`;
      const today = new Date().toISOString().split('T')[0];
      
      // Test violation stats
      console.log('🔍 Testing violation statistics API...');
      try {
        const statsResponse = await axios.get(`${baseURL}/api/violations/stats/${today}`);
        console.log('📊 Violation Stats:');
        console.log(`   Total Violations: ${statsResponse.data.totalViolations}`);
        console.log(`   Camera Stats:`, statsResponse.data.cameraStats);
      } catch (statsError) {
        console.log('⚠️ Stats API not available:', statsError.message);
      }
      
      // Test violation listing
      console.log('🔍 Testing violation listing API...');
      try {
        const violationsResponse = await axios.get(`${baseURL}/api/violations/camera002/${today}`);
        console.log(`📋 Violations for camera002 on ${today}:`);
        console.log(`   Total: ${violationsResponse.data.total}`);
        
        if (violationsResponse.data.violations.length > 0) {
          violationsResponse.data.violations.forEach((violation, index) => {
            console.log(`   ${index + 1}. ${violation.eventId} - ${violation.verdict.speed} km/h (${violation.verdict.decision})`);
          });
        }
      } catch (violationsError) {
        console.log('⚠️ Violations API not available:', violationsError.message);
      }
      
    } catch (error) {
      console.error('❌ API test error:', error.message);
    }
  }

  /**
   * Shows the expected system behavior
   */
  showSystemBehavior() {
    console.log('\n📋 Expected System Behavior:');
    console.log('============================');
    console.log('1. 🎯 Radar detects vehicle speed');
    console.log('2. 📡 UDP message sent to radar server');
    console.log('3. 🧮 Server checks if speed > 30 km/h (limit)');
    console.log('4. 🚨 If violation:');
    console.log('   - Creates folder: /srv/processing_inbox/camera002/YYYY-MM-DD/eventId/');
    console.log('   - Generates 3 placeholder photos: photo_1.jpg, photo_2.jpg, photo_3.jpg');
    console.log('   - Creates verdict.json with all violation details');
    console.log('   - Includes car_filter classification based on speed excess');
    console.log('5. 📊 APIs available to query violations and statistics');
    console.log('');
    console.log('🏷️ Car Filter Classifications:');
    console.log('   - compliant: Speed ≤ 30 km/h');
    console.log('   - minor_violation: 31-40 km/h (1-10 km/h over)');
    console.log('   - moderate_violation: 41-50 km/h (11-20 km/h over)');
    console.log('   - serious_violation: 51-60 km/h (21-30 km/h over)');
    console.log('   - severe_violation: >60 km/h (30+ km/h over)');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.client.close();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new RadarIntegrationTester();
  
  // Show expected behavior first
  tester.showSystemBehavior();
  
  // Run the complete workflow test
  tester.testCompleteWorkflow().then(() => {
    console.log('\n🎉 Integration test complete!');
    tester.cleanup();
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Integration test failed:', error);
    tester.cleanup();
    process.exit(1);
  });
}

module.exports = RadarIntegrationTester;
