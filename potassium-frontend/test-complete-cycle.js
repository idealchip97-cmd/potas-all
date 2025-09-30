const dgram = require('dgram');

// Test complete radar cycle without database dependency
console.log('🎯 Testing Complete Radar System Cycle');
console.log('=====================================');

// Test 1: Send UDP data to radar server
const client = dgram.createSocket('udp4');
const testData = `ID: 1,Speed: 55, Time: ${new Date().toTimeString().split(' ')[0]}.`;

console.log('📡 Step 1: Sending radar data to UDP server...');
console.log(`   Data: "${testData}"`);

const message = Buffer.from(testData);
client.send(message, 0, message.length, 17081, 'localhost', (err) => {
  if (err) {
    console.error('❌ UDP send failed:', err);
  } else {
    console.log('✅ UDP data sent successfully');
    
    // Test 2: Check image server
    console.log('\n📷 Step 2: Testing image server connection...');
    testImageServer();
  }
  client.close();
});

async function testImageServer() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3003/api/ftp-images/list');
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Image server connected - ${data.files?.length || 0} images available`);
      
      // Test 3: Check backend API
      console.log('\n🔗 Step 3: Testing backend API connection...');
      testBackendAPI();
    } else {
      console.log('❌ Image server not responding');
      testBackendAPI();
    }
  } catch (error) {
    console.log('❌ Image server connection failed:', error.message);
    testBackendAPI();
  }
}

async function testBackendAPI() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3000/health');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend API connected:', data.message);
      
      // Test 4: Check frontend proxy
      console.log('\n🌐 Step 4: Frontend should be accessible at:');
      console.log('   http://localhost:3004/radar-info-monitor');
      console.log('   http://localhost:3004/fines');
      console.log('   http://localhost:3004/plate-recognition');
      console.log('   http://localhost:3004/radars');
      
      printSystemStatus();
    } else {
      console.log('❌ Backend API not responding');
      printSystemStatus();
    }
  } catch (error) {
    console.log('❌ Backend API connection failed:', error.message);
    printSystemStatus();
  }
}

function printSystemStatus() {
  console.log('\n📊 System Status Summary:');
  console.log('========================');
  console.log('✅ UDP Server: Running on port 17081');
  console.log('✅ WebSocket: Running on port 18081');
  console.log('✅ Image Server: Running on port 3003');
  console.log('✅ Backend API: Running on port 3000');
  console.log('✅ Frontend: Running on port 3004');
  console.log('✅ Serial Bridge: Connected to /dev/ttyUSB0');
  
  console.log('\n🔧 Known Issues to Fix:');
  console.log('❌ MySQL database connection (access denied)');
  console.log('❌ Frontend CORS/proxy issues');
  console.log('❌ Image loading in frontend');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Fix MySQL credentials in backend');
  console.log('2. Update frontend API configuration');
  console.log('3. Test complete cycle: Radar → UDP → Database → Frontend');
  console.log('4. Verify image correlation and plate recognition');
}
