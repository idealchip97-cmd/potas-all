const dgram = require('dgram');

// Test script to simulate serial data and verify UDP conversion
console.log('🧪 Testing Serial-to-UDP Bridge Packet Parsing');
console.log('===============================================');

// Simulate the hex packets from your radar simulator
const testPackets = [
  { speed: 77, hex: 'FE AF 05 01 0A 4D 16 EF', description: 'Speed 77 km/h - VIOLATION' },
  { speed: 88, hex: 'FE AF 05 01 0A 58 16 EF', description: 'Speed 88 km/h - VIOLATION' },
  { speed: 55, hex: 'FE AF 05 01 0A 37 16 EF', description: 'Speed 55 km/h - VIOLATION' },
  { speed: 25, hex: 'FE AF 05 01 0A 19 16 EF', description: 'Speed 25 km/h - OK' },
];

function parseHexPacket(hexString) {
  // Remove spaces and convert to buffer
  const cleanHex = hexString.replace(/\s/g, '');
  const buffer = Buffer.from(cleanHex, 'hex');
  
  console.log(`📨 Raw packet: ${hexString}`);
  console.log(`📊 Buffer: [${Array.from(buffer).map(b => '0x' + b.toString(16).toUpperCase()).join(', ')}]`);
  
  // Parse according to format: FE AF 05 01 0A [SPEED] 16 EF
  if (buffer.length >= 8 && buffer[0] === 0xFE && buffer[1] === 0xAF) {
    const speedHex = buffer[5];
    const speed = speedHex;
    
    console.log(`🎯 Extracted speed: ${speed} km/h (0x${speedHex.toString(16).toUpperCase()})`);
    
    // Create timestamp
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    
    // Create UDP message
    const udpMessage = `ID: 1,Speed: ${speed}, Time: ${timeString}.`;
    console.log(`📡 UDP message: "${udpMessage}"`);
    
    const violationStatus = speed > 30 ? '🚨 VIOLATION (Fine will be created)' : '✅ OK (No fine)';
    console.log(`⚖️ Status: ${violationStatus}`);
    
    return { speed, udpMessage, violation: speed > 30 };
  } else {
    console.log('❌ Invalid packet format');
    return null;
  }
}

console.log('🔍 Analyzing radar simulator packets:');
console.log('');

testPackets.forEach((packet, index) => {
  console.log(`Test ${index + 1}: ${packet.description}`);
  console.log('─'.repeat(50));
  
  const result = parseHexPacket(packet.hex);
  
  if (result) {
    console.log(`✅ Parsing successful`);
    console.log(`📊 Expected speed: ${packet.speed}, Parsed speed: ${result.speed}`);
    
    if (packet.speed === result.speed) {
      console.log('✅ Speed parsing correct');
    } else {
      console.log('❌ Speed parsing incorrect');
    }
  }
  
  console.log('');
});

console.log('📋 Summary:');
console.log('----------');
console.log('✅ Packet format: FE AF 05 01 0A [SPEED] 16 EF');
console.log('✅ Speed extraction: Byte at position 5 (0-indexed)');
console.log('✅ UDP format: "ID: 1,Speed: XX, Time: HH:MM:SS."');
console.log('✅ Speed limit: 30 km/h (violations create fines)');
console.log('');
console.log('🚀 To test with real radar simulator:');
console.log('1. node serial-to-udp-bridge.js');
console.log('2. python3 ~/Desktop/radar_simulator/radar_simulator.py');
console.log('3. Enter speeds like 77, 88, 55 (above 30 = violations)');
console.log('4. Check http://localhost:3004/radar-info-monitor for real-time updates');
