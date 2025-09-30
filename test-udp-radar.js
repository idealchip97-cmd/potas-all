#!/usr/bin/env node

const dgram = require('dgram');

// UDP client to send test radar data
const client = dgram.createSocket('udp4');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 17081;

// Test radar messages in your format
const testMessages = [
    'ID: 1,Speed: 55, Time: 15:49:09.',
    'ID: 1,Speed: 69, Time: 16:02:41.',
    'ID: 1,Speed: 99, Time: 16:06:11.',
    'ID: 1,Speed: 75, Time: 16:07:13.',
    'ID: 2,Speed: 85, Time: 16:10:30.',
    'ID: 1,Speed: 120, Time: 16:15:45.'
];

function sendRadarData() {
    console.log('🚗 UDP Radar Test Client');
    console.log('========================');
    console.log(`📡 Sending test data to ${SERVER_HOST}:${SERVER_PORT}`);
    console.log('');

    let messageIndex = 0;

    const sendNextMessage = () => {
        if (messageIndex >= testMessages.length) {
            console.log('✅ All test messages sent');
            client.close();
            return;
        }

        const message = testMessages[messageIndex];
        const buffer = Buffer.from(message);

        client.send(buffer, 0, buffer.length, SERVER_PORT, SERVER_HOST, (err) => {
            if (err) {
                console.error('❌ Error sending message:', err);
            } else {
                console.log(`📤 Sent: ${message}`);
            }
            
            messageIndex++;
            
            // Send next message after 2 seconds
            setTimeout(sendNextMessage, 2000);
        });
    };

    // Start sending messages
    sendNextMessage();
}

function sendSingleMessage(message) {
    const buffer = Buffer.from(message);
    
    client.send(buffer, 0, buffer.length, SERVER_PORT, SERVER_HOST, (err) => {
        if (err) {
            console.error('❌ Error sending message:', err);
        } else {
            console.log(`📤 Sent: ${message}`);
        }
        client.close();
    });
}

// Command line usage
const args = process.argv.slice(2);

if (args.length === 0) {
    // Send all test messages
    sendRadarData();
} else if (args[0] === '--help' || args[0] === '-h') {
    console.log('🚗 UDP Radar Test Client');
    console.log('========================');
    console.log('');
    console.log('Usage:');
    console.log('  node test-udp-radar.js                    # Send all test messages');
    console.log('  node test-udp-radar.js "ID: 1,Speed: 65, Time: 16:30:00."  # Send custom message');
    console.log('  node test-udp-radar.js --help             # Show this help');
    console.log('');
    console.log('Message format: "ID: <radar_id>,Speed: <speed>, Time: <HH:MM:SS>."');
    console.log('');
    console.log('Examples:');
    testMessages.forEach(msg => console.log(`  "${msg}"`));
} else {
    // Send custom message
    const customMessage = args.join(' ');
    console.log('🚗 UDP Radar Test Client - Custom Message');
    console.log('==========================================');
    console.log(`📡 Sending to ${SERVER_HOST}:${SERVER_PORT}`);
    sendSingleMessage(customMessage);
}

// Handle client errors
client.on('error', (err) => {
    console.error('❌ UDP Client error:', err);
    client.close();
});

console.log('💡 Make sure the backend UDP service is running on port 17081');
console.log('💡 Start backend with: npm run dev (in potassium-backend- directory)');
console.log('💡 Then start external data service via API: POST /api/external-data/start');
