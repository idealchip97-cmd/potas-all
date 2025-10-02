const dgram = require('dgram');
const axios = require('axios');

// Test script for UDP readings system
const SERVER_HOST = 'localhost';
const UDP_PORT = 17081;
const API_BASE = 'http://localhost:3000/api';

// Test data samples
const testData = [
  'ID: 1,Speed: 55, Time: 18:04:30.', // Speed violation (55 > 30)
  'ID: 2,Speed: 25, Time: 18:04:35.', // No violation (25 < 30)
  'ID: 1,Speed: 45, Time: 18:04:40.', // Speed violation (45 > 30)
  'ID: 3,Speed: 60, Time: 18:04:45.', // Speed violation (60 > 30)
  '{"radarId": 4, "speed": 35, "timestamp": "2025-09-30T18:04:50Z"}', // JSON format violation
  'ID: 5,Speed: 20, Time: 18:04:55.', // No violation (20 < 30)
];

// Binary test data (FE AF 05 01 0A [SPEED] 16 EF)
const binaryTestData = [
  Buffer.from([0xFE, 0xAF, 0x05, 0x01, 0x0A, 0x42, 0x16, 0xEF]), // Speed: 66 km/h
  Buffer.from([0xFE, 0xAF, 0x05, 0x01, 0x0A, 0x1E, 0x16, 0xEF]), // Speed: 30 km/h (no violation)
  Buffer.from([0xFE, 0xAF, 0x05, 0x01, 0x0A, 0x50, 0x16, 0xEF]), // Speed: 80 km/h
];

class UdpReadingsTest {
  constructor() {
    this.client = dgram.createSocket('udp4');
    this.testResults = {
      udpMessagesSent: 0,
      apiTestsPassed: 0,
      apiTestsFailed: 0,
      errors: []
    };
  }

  async sendUdpData(data, delay = 1000) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let message;
        let description;
        
        if (Buffer.isBuffer(data)) {
          message = data;
          description = `Binary: ${data.toString('hex').toUpperCase()}`;
        } else {
          message = Buffer.from(data);
          description = `Text: "${data}"`;
        }
        
        this.client.send(message, 0, message.length, UDP_PORT, SERVER_HOST, (err) => {
          if (err) {
            console.error(`❌ Error sending: ${description}`, err);
            this.testResults.errors.push(`UDP Send Error: ${err.message}`);
          } else {
            console.log(`📡 Sent: ${description}`);
            this.testResults.udpMessagesSent++;
          }
          resolve();
        });
      }, delay);
    });
  }

  async testApiEndpoint(endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${API_BASE}${endpoint}`,
        timeout: 5000
      };
      
      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      console.log(`✅ API Test Passed: ${method} ${endpoint} - Status: ${response.status}`);
      this.testResults.apiTestsPassed++;
      return response.data;
    } catch (error) {
      console.error(`❌ API Test Failed: ${method} ${endpoint} - ${error.message}`);
      this.testResults.apiTestsFailed++;
      this.testResults.errors.push(`API Error: ${method} ${endpoint} - ${error.message}`);
      return null;
    }
  }

  async runUdpTests() {
    console.log('🚀 Starting UDP Readings System Test');
    console.log(`📡 Sending test data to ${SERVER_HOST}:${UDP_PORT}`);
    console.log('⚡ Speed limit is 30 km/h - violations should create fines and save to UDP readings table');
    console.log('');

    console.log('📄 Testing text format messages...');
    for (let i = 0; i < testData.length; i++) {
      await this.sendUdpData(testData[i], i * 1500); // 1.5 second intervals
    }

    console.log('');
    console.log('📦 Testing binary format messages...');
    for (let i = 0; i < binaryTestData.length; i++) {
      await this.sendUdpData(binaryTestData[i], 1500); // 1.5 second intervals
    }

    // Wait for data to be processed
    console.log('');
    console.log('⏳ Waiting 5 seconds for data processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  async runApiTests() {
    console.log('');
    console.log('🔌 Testing UDP Readings API Endpoints...');

    // Test basic endpoints
    await this.testApiEndpoint('/udp-readings');
    await this.testApiEndpoint('/udp-readings/live');
    await this.testApiEndpoint('/udp-readings/stats/summary');
    await this.testApiEndpoint('/udp-readings/violations/recent');

    // Test with filters
    await this.testApiEndpoint('/udp-readings?isViolation=true&limit=10');
    await this.testApiEndpoint('/udp-readings?messageFormat=text');
    await this.testApiEndpoint('/udp-readings?messageFormat=binary');
    await this.testApiEndpoint('/udp-readings?messageFormat=json');

    // Test UDP listener status
    await this.testApiEndpoint('/udp/status');

    // Test health endpoint
    await this.testApiEndpoint('/health');

    console.log('');
    console.log('📊 Testing Statistics Endpoints...');
    
    const stats = await this.testApiEndpoint('/udp-readings/stats/summary');
    if (stats && stats.success) {
      console.log('📈 Statistics Summary:');
      console.log(`   • Total Readings: ${stats.data.totalReadings}`);
      console.log(`   • Violations: ${stats.data.violationReadings}`);
      console.log(`   • Fines Created: ${stats.data.finesCreated}`);
      console.log(`   • Compliance Rate: ${stats.data.complianceRate}%`);
      console.log(`   • Average Speed: ${stats.data.averageSpeed} km/h`);
      console.log(`   • Max Speed: ${stats.data.maxSpeed} km/h`);
    }

    console.log('');
    console.log('📋 Testing Live Readings...');
    
    const liveReadings = await this.testApiEndpoint('/udp-readings/live?limit=5');
    if (liveReadings && liveReadings.success && liveReadings.data.length > 0) {
      console.log(`📊 Found ${liveReadings.data.length} recent readings:`);
      liveReadings.data.forEach((reading, index) => {
        console.log(`   ${index + 1}. Radar ${reading.radarId}: ${reading.speedDetected} km/h (${reading.messageFormat}) - ${reading.isViolation ? 'VIOLATION' : 'OK'}`);
      });
    }
  }

  async testBulkOperations() {
    console.log('');
    console.log('🔄 Testing Bulk Operations...');

    // Get some readings to test bulk operations
    const readings = await this.testApiEndpoint('/udp-readings?limit=3');
    if (readings && readings.success && readings.data.length > 0) {
      const ids = readings.data.map(r => r.id);
      
      // Test bulk processing
      await this.testApiEndpoint('/udp-readings/bulk/process', 'POST', {
        ids: ids,
        processingNotes: 'Bulk processed via API test'
      });
    }
  }

  async testExport() {
    console.log('');
    console.log('📤 Testing Export Functionality...');

    try {
      const response = await axios({
        method: 'GET',
        url: `${API_BASE}/udp-readings/export/csv`,
        timeout: 10000,
        responseType: 'text'
      });

      if (response.status === 200 && response.data.includes('ID,Radar ID')) {
        console.log('✅ CSV Export Test Passed - File generated successfully');
        console.log(`📄 CSV Preview (first 200 chars): ${response.data.substring(0, 200)}...`);
        this.testResults.apiTestsPassed++;
      } else {
        throw new Error('Invalid CSV format');
      }
    } catch (error) {
      console.error(`❌ CSV Export Test Failed: ${error.message}`);
      this.testResults.apiTestsFailed++;
      this.testResults.errors.push(`CSV Export Error: ${error.message}`);
    }
  }

  async runAllTests() {
    try {
      // Step 1: Send UDP data
      await this.runUdpTests();

      // Step 2: Test API endpoints
      await this.runApiTests();

      // Step 3: Test bulk operations
      await this.testBulkOperations();

      // Step 4: Test export
      await this.testExport();

      // Final results
      this.printResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.testResults.errors.push(`Test Suite Error: ${error.message}`);
    } finally {
      this.client.close();
    }
  }

  printResults() {
    console.log('');
    console.log('🎉 Test Results Summary');
    console.log('========================');
    console.log(`📡 UDP Messages Sent: ${this.testResults.udpMessagesSent}`);
    console.log(`✅ API Tests Passed: ${this.testResults.apiTestsPassed}`);
    console.log(`❌ API Tests Failed: ${this.testResults.apiTestsFailed}`);
    console.log(`🔧 Total Errors: ${this.testResults.errors.length}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('');
      console.log('❌ Errors Encountered:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('');
    console.log('🌐 Available Endpoints:');
    console.log('   • GET  /api/udp-readings - List all UDP readings');
    console.log('   • GET  /api/udp-readings/live - Live readings');
    console.log('   • GET  /api/udp-readings/stats/summary - Statistics');
    console.log('   • GET  /api/udp-readings/violations/recent - Recent violations');
    console.log('   • GET  /api/udp-readings/:id - Get specific reading');
    console.log('   • POST /api/udp-readings/bulk/process - Bulk process readings');
    console.log('   • GET  /api/udp-readings/export/csv - Export as CSV');
    console.log('   • GET  /api/udp/status - UDP listener status');
    console.log('');
    console.log('✅ UDP Readings System Test Complete!');
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

// Run the tests
const test = new UdpReadingsTest();
test.runAllTests().catch(console.error);
