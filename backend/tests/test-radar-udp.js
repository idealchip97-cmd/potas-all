const dgram = require('dgram');

// Test script to send radar data to UDP server
const client = dgram.createSocket('udp4');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 17081;

// Test data samples
const testData = [
  'ID: 1,Speed: 55, Time: 14:58:30.', // Speed violation (55 > 30)
  'ID: 2,Speed: 25, Time: 14:58:35.', // No violation (25 < 30)
  'ID: 1,Speed: 45, Time: 14:58:40.', // Speed violation (45 > 30)
  'ID: 3,Speed: 60, Time: 14:58:45.', // Speed violation (60 > 30)
  'ID: 1,Speed: 55, Time: 14:58:30.', // Duplicate - should be prevented
];

function sendRadarData(data, delay = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const message = Buffer.from(data);
      
      client.send(message, 0, message.length, SERVER_PORT, SERVER_HOST, (err) => {
        if (err) {
          console.error(`❌ Error sending: "${data}"`, err);
        } else {
          console.log(`📡 Sent: "${data}"`);
        }
        resolve();
      });
    }, delay);
  });
}

async function runTests() {
  console.log('🚀 Starting Radar UDP Test');
  console.log(`📡 Sending test data to ${SERVER_HOST}:${SERVER_PORT}`);
  console.log('⚡ Speed limit is 30 km/h - violations should create fines');
  console.log('');

  for (let i = 0; i < testData.length; i++) {
    await sendRadarData(testData[i], i * 2000); // 2 second intervals
  }

  console.log('');
  console.log('✅ All test data sent');
  console.log('💡 Check the UDP server console for processing results');
  console.log('🗄️ Check MySQL database for created fines');
  console.log('🌐 Check frontend at http://localhost:3004/radar-info-monitor for real-time updates');
  
  client.close();
}

// Handle errors
client.on('error', (err) => {
  console.error('❌ UDP Client error:', err);
  client.close();
});

// Run the tests
runTests().catch(console.error);
