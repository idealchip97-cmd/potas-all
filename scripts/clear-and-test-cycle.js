#!/usr/bin/env node

const axios = require('axios');
const dgram = require('dgram');

const BACKEND_URL = 'http://localhost:3000';
const UDP_PORT = 17081;

// Test credentials (you'll need to update these)
const TEST_USER = {
    email: 'admin@example.com',
    password: 'admin123'
};

let authToken = null;

async function login() {
    try {
        console.log('🔐 Logging in...');
        const response = await axios.post(`${BACKEND_URL}/api/auth/login`, TEST_USER);
        authToken = response.data.token;
        console.log('✅ Login successful');
        return true;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function clearData() {
    if (!authToken) {
        console.error('❌ No auth token available');
        return false;
    }

    const headers = { Authorization: `Bearer ${authToken}` };

    try {
        console.log('🗑️ Clearing existing data...');
        
        // Clear fines
        const finesResponse = await axios.delete(`${BACKEND_URL}/api/fines/clear-all`, { headers });
        console.log(`✅ Cleared fines: ${finesResponse.data.message}`);
        
        // Clear radars
        const radarsResponse = await axios.delete(`${BACKEND_URL}/api/radars/clear-all`, { headers });
        console.log(`✅ Cleared radars: ${radarsResponse.data.message}`);
        
        return true;
    } catch (error) {
        console.error('❌ Failed to clear data:', error.response?.data?.message || error.message);
        return false;
    }
}

async function startExternalDataService() {
    if (!authToken) {
        console.error('❌ No auth token available');
        return false;
    }

    const headers = { Authorization: `Bearer ${authToken}` };

    try {
        console.log('🚀 Starting external data service...');
        const response = await axios.post(`${BACKEND_URL}/api/external-data/start`, {}, { headers });
        console.log('✅ External data service started');
        return true;
    } catch (error) {
        console.error('❌ Failed to start external data service:', error.response?.data?.message || error.message);
        return false;
    }
}

async function sendUDPTestData() {
    return new Promise((resolve, reject) => {
        console.log('📡 Sending UDP test data...');
        
        const client = dgram.createSocket('udp4');
        const testMessages = [
            'ID: 1,Speed: 75, Time: 10:30:00.',
            'ID: 1,Speed: 85, Time: 10:30:15.',
            'ID: 2,Speed: 95, Time: 10:30:30.',
            'ID: 1,Speed: 120, Time: 10:30:45.'
        ];

        let messageIndex = 0;

        const sendNextMessage = () => {
            if (messageIndex >= testMessages.length) {
                client.close();
                console.log('✅ All UDP test messages sent');
                resolve(true);
                return;
            }

            const message = testMessages[messageIndex];
            const buffer = Buffer.from(message);

            client.send(buffer, 0, buffer.length, UDP_PORT, 'localhost', (err) => {
                if (err) {
                    console.error('❌ Error sending UDP message:', err);
                    client.close();
                    reject(err);
                    return;
                }
                
                console.log(`📤 Sent: ${message}`);
                messageIndex++;
                
                // Send next message after 2 seconds
                setTimeout(sendNextMessage, 2000);
            });
        };

        sendNextMessage();
    });
}

async function checkCorrelationStats() {
    if (!authToken) {
        console.error('❌ No auth token available');
        return false;
    }

    const headers = { Authorization: `Bearer ${authToken}` };

    try {
        console.log('📊 Checking correlation statistics...');
        const response = await axios.get(`${BACKEND_URL}/api/external-data/correlation/stats`, { headers });
        console.log('✅ Correlation stats:', response.data.data);
        return true;
    } catch (error) {
        console.error('❌ Failed to get correlation stats:', error.response?.data?.message || error.message);
        return false;
    }
}

async function checkViolationsCycle() {
    if (!authToken) {
        console.error('❌ No auth token available');
        return false;
    }

    const headers = { Authorization: `Bearer ${authToken}` };

    try {
        console.log('🎯 Checking violations cycle data...');
        const response = await axios.get(`${BACKEND_URL}/api/plate-recognition/violations-cycle`, { headers });
        
        console.log('✅ Violations cycle data:');
        console.log(`   Total violations: ${response.data.pagination.total}`);
        console.log(`   Data flow: ${response.data.cycle.description}`);
        
        if (response.data.data.length > 0) {
            console.log('📋 Sample violation:');
            const sample = response.data.data[0];
            console.log(`   Radar ID: ${sample.radarId}`);
            console.log(`   Plate: ${sample.plateNumber}`);
            console.log(`   Speed: ${sample.speed} km/h (limit: ${sample.speedLimit})`);
            console.log(`   Fine: $${sample.fineAmount}`);
            console.log(`   Status: ${sample.status}`);
            console.log(`   Has Image: ${sample.hasImage}`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to get violations cycle:', error.response?.data?.message || error.message);
        return false;
    }
}

async function runCompleteTest() {
    console.log('🚗 Starting Complete UDP-FTP Correlation Cycle Test');
    console.log('====================================================');
    console.log('');

    // Step 1: Login
    if (!(await login())) {
        console.log('❌ Test failed at login step');
        return;
    }

    // Step 2: Clear existing data
    if (!(await clearData())) {
        console.log('❌ Test failed at clear data step');
        return;
    }

    // Step 3: Start external data service
    if (!(await startExternalDataService())) {
        console.log('❌ Test failed at start service step');
        return;
    }

    // Wait a bit for service to initialize
    console.log('⏳ Waiting for services to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Send UDP test data
    try {
        await sendUDPTestData();
    } catch (error) {
        console.log('❌ Test failed at UDP data step');
        return;
    }

    // Step 5: Wait for correlation processing
    console.log('⏳ Waiting for correlation processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 6: Check correlation stats
    await checkCorrelationStats();

    // Step 7: Check final violations cycle
    await checkViolationsCycle();

    console.log('');
    console.log('🎯 Test Complete!');
    console.log('================');
    console.log('');
    console.log('🌐 Check the results at:');
    console.log('   • Fines: http://localhost:3001/fines');
    console.log('   • Radars: http://localhost:3001/radars');
    console.log('   • Plate Recognition: http://localhost:3001/plate-recognition');
    console.log('   • Fines Images Monitor: http://localhost:3001/fines-images-monitor');
    console.log('   • Radar Info Monitor: http://localhost:3001/radar-info-monitor');
}

// Run the test
runCompleteTest().catch(console.error);
