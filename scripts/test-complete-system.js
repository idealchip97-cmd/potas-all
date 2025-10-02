const dgram = require('dgram');

// Complete system test with camera correlation simulation
const client = dgram.createSocket('udp4');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 17081;

// Test scenarios with different speeds and timing
const testScenarios = [
  {
    name: "Speed Violation with Camera Correlation",
    data: 'ID: 1,Speed: 55, Time: 15:16:30.',
    description: "Speed 55 km/h (violation) - should correlate with camera images if available"
  },
  {
    name: "Compliant Speed",
    data: 'ID: 1,Speed: 25, Time: 15:16:35.',
    description: "Speed 25 km/h (compliant) - saved to readings but no fine created"
  },
  {
    name: "High Speed Violation",
    data: 'ID: 2,Speed: 88, Time: 15:16:40.',
    description: "Speed 88 km/h (major violation) - $300 fine + camera correlation"
  },
  {
    name: "Moderate Violation",
    data: 'ID: 1,Speed: 45, Time: 15:16:45.',
    description: "Speed 45 km/h (moderate violation) - $100 fine + camera correlation"
  },
  {
    name: "Edge Case - Exactly at Limit",
    data: 'ID: 3,Speed: 30, Time: 15:16:50.',
    description: "Speed 30 km/h (exactly at limit) - compliant, no fine"
  },
  {
    name: "Duplicate Prevention Test",
    data: 'ID: 1,Speed: 55, Time: 15:16:30.',
    description: "Duplicate of first reading - should be prevented"
  }
];

function sendRadarData(scenario, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const message = Buffer.from(scenario.data);
      
      client.send(message, 0, message.length, SERVER_PORT, SERVER_HOST, (err) => {
        if (err) {
          console.error(`❌ Error sending: "${scenario.data}"`, err);
        } else {
          console.log(`📡 ${scenario.name}`);
          console.log(`   Data: "${scenario.data}"`);
          console.log(`   Expected: ${scenario.description}`);
          console.log('');
        }
        resolve();
      });
    }, delay);
  });
}

async function runCompleteSystemTest() {
  console.log('🚀 Complete Radar System Test with Camera Correlation');
  console.log('=====================================================');
  console.log(`📡 Sending test data to ${SERVER_HOST}:${SERVER_PORT}`);
  console.log('⚡ Speed limit: 30 km/h');
  console.log('📷 Camera correlation window: ±2 seconds');
  console.log('🗄️ All readings saved to radar_readings table');
  console.log('💰 Fines created for violations with correlated images');
  console.log('');

  console.log('📋 Test Scenarios:');
  console.log('------------------');

  for (let i = 0; i < testScenarios.length; i++) {
    await sendRadarData(testScenarios[i], i * 3000); // 3 second intervals
  }

  console.log('✅ All test scenarios completed!');
  console.log('');
  console.log('🔍 Check Results:');
  console.log('-----------------');
  console.log('📊 Frontend: http://localhost:3004/radar-info-monitor');
  console.log('   - Radars Tab: Shows radar status');
  console.log('   - Fines Tab: Shows created fines with images');
  console.log('   - Readings Tab: Shows ALL radar readings (persistent)');
  console.log('');
  console.log('🗄️ Database: http://localhost/phpmyadmin');
  console.log('   - radar_readings table: All detections');
  console.log('   - fines table: Violations only');
  console.log('   - Check correlatedImages field for camera data');
  console.log('');
  console.log('📷 Image Server: http://localhost:3003/api/ftp-images/list');
  console.log('   - Check for images with matching timestamps');
  console.log('');
  console.log('🎯 Expected Results:');
  console.log('   - 6 radar readings saved (including duplicate prevention)');
  console.log('   - 3 fines created (speeds: 55, 88, 45 km/h)');
  console.log('   - Camera images correlated within 2-second window');
  console.log('   - Real-time updates in frontend');
  
  client.close();
}

// Handle errors
client.on('error', (err) => {
  console.error('❌ UDP Client error:', err);
  client.close();
});

// Run the complete test
runCompleteSystemTest().catch(console.error);
