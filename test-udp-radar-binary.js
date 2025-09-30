#!/usr/bin/env node

/**
 * Test script to send binary UDP radar data
 * Simulates the radar device sending speed detection packets
 */

const dgram = require('dgram');

// Configuration
const UDP_HOST = 'localhost';
const UDP_PORT = 17081;

// Test speeds to send
const testSpeeds = [66, 45, 78, 52, 89, 35, 71];

function createRadarPacket(speed, radarId = 10) {
    // Create packet in format: FE AF 05 01 0A [SPEED] [CHECKSUM] EF
    const packet = Buffer.alloc(8);
    
    packet[0] = 0xFE; // Start byte
    packet[1] = 0xAF; // Header
    packet[2] = 0x05; // Command
    packet[3] = 0x01; // Sub-command
    packet[4] = radarId; // Radar ID
    packet[5] = speed; // Speed value
    packet[6] = 0x16; // Checksum (simplified)
    packet[7] = 0xEF; // End byte
    
    return packet;
}

function sendRadarData(speed, radarId = 10) {
    return new Promise((resolve, reject) => {
        const client = dgram.createSocket('udp4');
        const packet = createRadarPacket(speed, radarId);
        
        console.log(`📡 Sending radar data: Speed=${speed} km/h, RadarId=${radarId}`);
        console.log(`📦 Packet: ${packet.toString('hex').toUpperCase()}`);
        
        client.send(packet, 0, packet.length, UDP_PORT, UDP_HOST, (err) => {
            if (err) {
                console.error('❌ Send error:', err.message);
                reject(err);
            } else {
                console.log('✅ Packet sent successfully');
                resolve();
            }
            client.close();
        });
    });
}

async function runTest() {
    console.log('🚀 Starting UDP Radar Binary Test');
    console.log(`📡 Target: ${UDP_HOST}:${UDP_PORT}`);
    console.log('');
    
    try {
        for (let i = 0; i < testSpeeds.length; i++) {
            const speed = testSpeeds[i];
            const radarId = 10; // Use radar ID 10
            
            console.log(`\n--- Test ${i + 1}/${testSpeeds.length} ---`);
            await sendRadarData(speed, radarId);
            
            // Wait between sends
            if (i < testSpeeds.length - 1) {
                console.log('⏳ Waiting 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        console.log('\n🎉 All test packets sent successfully!');
        console.log('\n💡 Check the following:');
        console.log('   1. Backend logs for packet processing');
        console.log('   2. http://localhost:3004/radar-info-monitor for radar data');
        console.log('   3. http://localhost:3004/fines-images-monitor for correlated images');
        console.log('   4. Database for stored violations and fines');
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    }
}

// Interactive mode
if (process.argv.length > 2) {
    const speed = parseInt(process.argv[2]);
    const radarId = parseInt(process.argv[3]) || 10;
    
    if (isNaN(speed) || speed < 0 || speed > 200) {
        console.error('❌ Invalid speed. Usage: node test-udp-radar-binary.js <speed> [radarId]');
        process.exit(1);
    }
    
    console.log('🎯 Single packet mode');
    sendRadarData(speed, radarId).then(() => {
        console.log('✅ Done');
    }).catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
} else {
    // Run full test suite
    runTest();
}

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted by user');
    process.exit(0);
});
