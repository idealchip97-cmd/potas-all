#!/usr/bin/env node

/**
 * Complete Radar Cycle Test Script
 * 
 * Tests the complete radar → database → frontend → plate recognition cycle:
 * 1. Sends UDP radar violation data
 * 2. Verifies database storage
 * 3. Checks image correlation
 * 4. Tests WebSocket real-time updates
 * 5. Validates plate recognition processing
 */

const dgram = require('dgram');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    backend: {
        host: 'localhost',
        port: 3000,
        wsPort: 3000, // WebSocket on same port as HTTP server
    },
    frontend: {
        host: 'localhost',
        port: 3004,
    },
    udp: {
        host: 'localhost',
        port: 17081,
    },
    imageServer: {
        host: 'localhost',
        port: 3003,
    },
    auth: {
        email: 'admin@potassium.com',
        password: 'admin123'
    }
};

let authToken = null;
let testResults = {
    udpSent: false,
    databaseStored: false,
    imageCorrelated: false,
    websocketReceived: false,
    plateRecognized: false,
    cycleComplete: false
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message, success = null) {
    const icon = success === true ? '✅' : success === false ? '❌' : '🔄';
    const stepColor = success === true ? 'green' : success === false ? 'red' : 'yellow';
    log(`${icon} [${step}] ${message}`, stepColor);
}

// Authentication
async function authenticate() {
    try {
        logStep('AUTH', 'Authenticating with backend...');
        
        const response = await axios.post(`http://${CONFIG.backend.host}:${CONFIG.backend.port}/api/auth/signin`, {
            email: CONFIG.auth.email,
            password: CONFIG.auth.password
        });

        if (response.data.success) {
            authToken = response.data.data.token;
            logStep('AUTH', 'Authentication successful', true);
            return true;
        } else {
            logStep('AUTH', 'Authentication failed', false);
            return false;
        }
    } catch (error) {
        logStep('AUTH', `Authentication error: ${error.message}`, false);
        return false;
    }
}

// Start external data service
async function startExternalDataService() {
    try {
        logStep('SERVICE', 'Starting external data service...');
        
        const response = await axios.post(
            `http://${CONFIG.backend.host}:${CONFIG.backend.port}/api/external-data/start`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );

        if (response.data.success) {
            logStep('SERVICE', 'External data service started', true);
            return true;
        } else {
            logStep('SERVICE', `Service start failed: ${response.data.message}`, false);
            return false;
        }
    } catch (error) {
        if (error.response?.data?.message?.includes('already running')) {
            logStep('SERVICE', 'External data service already running', true);
            return true;
        }
        logStep('SERVICE', `Service start error: ${error.message}`, false);
        return false;
    }
}

// Setup WebSocket listener
function setupWebSocketListener() {
    return new Promise((resolve) => {
        try {
            logStep('WEBSOCKET', 'Connecting to WebSocket server...');
            
            const ws = new WebSocket(`ws://${CONFIG.backend.host}:${CONFIG.backend.port}`);
            
            ws.on('open', () => {
                logStep('WEBSOCKET', 'WebSocket connected', true);
                
                // Subscribe to all channels
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    channels: ['radar', 'fines', 'images', 'plates', 'cycle', 'system']
                }));
                
                logStep('WEBSOCKET', 'Subscribed to all channels');
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    logStep('WEBSOCKET', `Received: ${message.type}`, true);
                    
                    switch (message.type) {
                        case 'radar_data':
                            testResults.websocketReceived = true;
                            logStep('CYCLE', 'Real-time radar data received via WebSocket', true);
                            break;
                        case 'fine_data':
                            logStep('CYCLE', 'Real-time fine data received via WebSocket', true);
                            break;
                        case 'image_correlation':
                            testResults.imageCorrelated = true;
                            logStep('CYCLE', 'Image correlation completed via WebSocket', true);
                            break;
                        case 'plate_recognition':
                            testResults.plateRecognized = true;
                            logStep('CYCLE', 'Plate recognition completed via WebSocket', true);
                            break;
                        case 'correlation_cycle':
                            testResults.cycleComplete = true;
                            logStep('CYCLE', '🎯 COMPLETE CYCLE DETECTED!', true);
                            log('📊 Cycle Data:', 'cyan');
                            console.log(JSON.stringify(message.data, null, 2));
                            break;
                    }
                } catch (error) {
                    logStep('WEBSOCKET', `Message parse error: ${error.message}`, false);
                }
            });
            
            ws.on('error', (error) => {
                logStep('WEBSOCKET', `WebSocket error: ${error.message}`, false);
            });
            
            ws.on('close', () => {
                logStep('WEBSOCKET', 'WebSocket connection closed');
            });
            
            // Resolve after connection is established
            setTimeout(() => resolve(ws), 2000);
            
        } catch (error) {
            logStep('WEBSOCKET', `WebSocket setup error: ${error.message}`, false);
            resolve(null);
        }
    });
}

// Send UDP radar data
async function sendRadarData() {
    return new Promise((resolve) => {
        try {
            logStep('UDP', 'Sending radar violation data...');
            
            const client = dgram.createSocket('udp4');
            
            // Generate test radar data with current time
            const now = new Date();
            const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS format
            
            // Test data: Speed violation (77 km/h in 50 km/h zone)
            const testMessage = `ID: 1,Speed: 77, Time: ${timeString}.`;
            
            logStep('UDP', `Sending: "${testMessage}"`);
            
            const buffer = Buffer.from(testMessage);
            
            client.send(buffer, 0, buffer.length, CONFIG.udp.port, CONFIG.udp.host, (err) => {
                if (err) {
                    logStep('UDP', `Send error: ${err.message}`, false);
                    client.close();
                    resolve(false);
                } else {
                    testResults.udpSent = true;
                    logStep('UDP', 'Radar data sent successfully', true);
                    client.close();
                    resolve(true);
                }
            });
            
        } catch (error) {
            logStep('UDP', `UDP error: ${error.message}`, false);
            resolve(false);
        }
    });
}

// Check database for stored data
async function checkDatabaseStorage() {
    try {
        logStep('DATABASE', 'Checking database for stored violations...');
        
        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const response = await axios.get(
            `http://${CONFIG.backend.host}:${CONFIG.backend.port}/api/plate-recognition/violations-cycle?limit=10`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );

        if (response.data.success && response.data.data.length > 0) {
            testResults.databaseStored = true;
            logStep('DATABASE', `Found ${response.data.data.length} violation records`, true);
            
            // Show latest violation
            const latest = response.data.data[0];
            log('📋 Latest Violation:', 'cyan');
            console.log(`   Radar ID: ${latest.radarId}`);
            console.log(`   Speed: ${latest.speed} km/h (Limit: ${latest.speedLimit} km/h)`);
            console.log(`   Plate: ${latest.plateNumber}`);
            console.log(`   Time: ${latest.violationTime}`);
            console.log(`   Status: ${latest.status}`);
            
            return true;
        } else {
            logStep('DATABASE', 'No violations found in database', false);
            return false;
        }
    } catch (error) {
        logStep('DATABASE', `Database check error: ${error.message}`, false);
        return false;
    }
}

// Check image server availability
async function checkImageServer() {
    try {
        logStep('IMAGES', 'Checking image server availability...');
        
        const response = await axios.get(`http://${CONFIG.imageServer.host}:${CONFIG.imageServer.port}/api/ftp-images/list`);
        
        if (response.data && response.data.files) {
            logStep('IMAGES', `Image server available with ${response.data.files.length} images`, true);
            return true;
        } else {
            logStep('IMAGES', 'Image server responded but no images found', false);
            return false;
        }
    } catch (error) {
        logStep('IMAGES', `Image server check error: ${error.message}`, false);
        return false;
    }
}

// Check frontend accessibility
async function checkFrontend() {
    try {
        logStep('FRONTEND', 'Checking frontend accessibility...');
        
        const response = await axios.get(`http://${CONFIG.frontend.host}:${CONFIG.frontend.port}`, {
            timeout: 5000
        });
        
        if (response.status === 200) {
            logStep('FRONTEND', 'Frontend is accessible', true);
            return true;
        } else {
            logStep('FRONTEND', `Frontend returned status: ${response.status}`, false);
            return false;
        }
    } catch (error) {
        logStep('FRONTEND', `Frontend check error: ${error.message}`, false);
        return false;
    }
}

// Generate test report
function generateReport() {
    log('\n' + '='.repeat(60), 'bright');
    log('📊 COMPLETE RADAR CYCLE TEST REPORT', 'bright');
    log('='.repeat(60), 'bright');
    
    const results = [
        { name: 'UDP Data Sent', status: testResults.udpSent },
        { name: 'Database Storage', status: testResults.databaseStored },
        { name: 'Image Correlation', status: testResults.imageCorrelated },
        { name: 'WebSocket Updates', status: testResults.websocketReceived },
        { name: 'Plate Recognition', status: testResults.plateRecognized },
        { name: 'Complete Cycle', status: testResults.cycleComplete }
    ];
    
    results.forEach(result => {
        const icon = result.status ? '✅' : '❌';
        const color = result.status ? 'green' : 'red';
        log(`${icon} ${result.name}`, color);
    });
    
    const successCount = results.filter(r => r.status).length;
    const successRate = (successCount / results.length) * 100;
    
    log('\n📈 SUMMARY:', 'bright');
    log(`   Success Rate: ${successRate.toFixed(1)}% (${successCount}/${results.length})`, 
        successRate === 100 ? 'green' : successRate > 50 ? 'yellow' : 'red');
    
    if (testResults.cycleComplete) {
        log('\n🎉 COMPLETE RADAR CYCLE WORKING!', 'green');
        log('   The radar → database → frontend → plate recognition cycle is fully operational.', 'green');
    } else {
        log('\n⚠️  CYCLE INCOMPLETE', 'yellow');
        log('   Some components may need attention for full cycle completion.', 'yellow');
    }
    
    log('\n🔗 System URLs:', 'cyan');
    log(`   Backend API: http://${CONFIG.backend.host}:${CONFIG.backend.port}`);
    log(`   Frontend: http://${CONFIG.frontend.host}:${CONFIG.frontend.port}`);
    log(`   Image Server: http://${CONFIG.imageServer.host}:${CONFIG.imageServer.port}`);
    log(`   Plate Recognition: http://${CONFIG.frontend.host}:${CONFIG.frontend.port}/plate-recognition`);
    
    log('\n' + '='.repeat(60), 'bright');
}

// Main test execution
async function runCompleteTest() {
    log('🚀 Starting Complete Radar Cycle Test', 'bright');
    log('Testing: UDP → Database → WebSocket → Frontend → Plate Recognition\n', 'cyan');
    
    // Step 1: Authentication
    const authSuccess = await authenticate();
    if (!authSuccess) {
        log('❌ Cannot proceed without authentication', 'red');
        return;
    }
    
    // Step 2: Start external data service
    const serviceStarted = await startExternalDataService();
    if (!serviceStarted) {
        log('❌ Cannot proceed without external data service', 'red');
        return;
    }
    
    // Step 3: Check system components
    await checkImageServer();
    await checkFrontend();
    
    // Step 4: Setup WebSocket listener
    const ws = await setupWebSocketListener();
    
    // Wait for WebSocket to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 5: Send radar data
    const udpSent = await sendRadarData();
    
    if (udpSent) {
        // Step 6: Wait for processing and check results
        logStep('PROCESSING', 'Waiting for cycle completion (10 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Step 7: Check database storage
        await checkDatabaseStorage();
    }
    
    // Step 8: Generate report
    generateReport();
    
    // Cleanup
    if (ws) {
        ws.close();
    }
}

// Handle script termination
process.on('SIGINT', () => {
    log('\n🛑 Test interrupted by user', 'yellow');
    generateReport();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    log(`\n💥 Uncaught exception: ${error.message}`, 'red');
    generateReport();
    process.exit(1);
});

// Run the test
if (require.main === module) {
    runCompleteTest().catch(error => {
        log(`\n💥 Test failed: ${error.message}`, 'red');
        generateReport();
        process.exit(1);
    });
}

module.exports = {
    runCompleteTest,
    CONFIG,
    testResults
};
