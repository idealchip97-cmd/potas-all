const dgram = require('dgram');

// Test script for the persistent UDP listener
const client = dgram.createSocket('udp4');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 17081;

// Test data samples
const testData = [
  'ID: 1,Speed: 55, Time: 14:58:30.', // Speed violation (55 > 30)
  'ID: 2,Speed: 25, Time: 14:58:35.', // No violation (25 < 30)
  'ID: 1,Speed: 45, Time: 14:58:40.', // Speed violation (45 > 30)
  'ID: 3,Speed: 60, Time: 14:58:45.', // Speed violation (60 > 30)
  '{"radarId": 4, "speed": 35, "timestamp": "2025-09-30T17:53:00Z"}', // JSON format violation
  'ID: 1,Speed: 55, Time: 14:58:30.', // Duplicate - should be prevented
];

// Binary test data (FE AF 05 01 0A [SPEED] 16 EF)
const binaryTestData = [
  Buffer.from([0xFE, 0xAF, 0x05, 0x01, 0x0A, 0x42, 0x16, 0xEF]), // Speed: 66 km/h
  Buffer.from([0xFE, 0xAF, 0x05, 0x01, 0x0A, 0x1E, 0x16, 0xEF]), // Speed: 30 km/h (no violation)
  Buffer.from([0xFE, 0xAF, 0x05, 0x01, 0x0A, 0x50, 0x16, 0xEF]), // Speed: 80 km/h
];

function sendData(data, delay = 1000) {
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
      
      client.send(message, 0, message.length, SERVER_PORT, SERVER_HOST, (err) => {
        if (err) {
          console.error(`❌ Error sending: ${description}`, err);
        } else {
          console.log(`📡 Sent: ${description}`);
        }
        resolve();
      });
    }, delay);
  });
}

async function runTests() {
  console.log('🚀 Starting Persistent UDP Listener Test');
  console.log(`📡 Sending test data to ${SERVER_HOST}:${SERVER_PORT}`);
  console.log('⚡ Speed limit is 30 km/h - violations should create fines and save to MySQL');
  console.log('');

  console.log('📄 Testing text format messages...');
  for (let i = 0; i < testData.length; i++) {
    await sendData(testData[i], i * 2000); // 2 second intervals
  }

  console.log('');
  console.log('📦 Testing binary format messages...');
  for (let i = 0; i < binaryTestData.length; i++) {
    await sendData(binaryTestData[i], 2000); // 2 second intervals
  }

  console.log('');
  console.log('✅ All test data sent');
  console.log('💡 Check the backend server console for processing results');
  console.log('🗄️ Check MySQL database for saved radar readings and fines');
  console.log('🌐 Check API endpoints:');
  console.log('   • http://localhost:3000/health - Overall health');
  console.log('   • http://localhost:3000/api/udp/status - UDP listener status');
  console.log('   • http://localhost:3000/api/radars - Radar readings');
  console.log('   • http://localhost:3000/api/fines - Created fines');
  
  client.close();
}

// Handle errors
client.on('error', (err) => {
  console.error('❌ UDP Client error:', err);
  client.close();
});

// Run the tests
runTests().catch(console.error);
