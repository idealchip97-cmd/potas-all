#!/usr/bin/env node

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:3001';
const IMAGE_SERVER_URL = 'http://localhost:3003';

// Test admin credentials
const ADMIN_CREDENTIALS = {
    email: 'admin@example.com',
    password: 'admin123'
};

let authToken = null;

async function login() {
    try {
        console.log('🔐 Logging in as admin...');
        const response = await axios.post(`${BACKEND_URL}/api/auth/login`, ADMIN_CREDENTIALS);
        authToken = response.data.token;
        console.log('✅ Admin login successful');
        return true;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data?.message || error.message);
        console.log('💡 Make sure admin user exists or update credentials in the script');
        return false;
    }
}

async function clearDemoData() {
    if (!authToken) return false;

    const headers = { Authorization: `Bearer ${authToken}` };

    try {
        console.log('🗑️ Clearing demo data...');
        
        // Clear fines
        try {
            const finesResponse = await axios.delete(`${BACKEND_URL}/api/fines/clear-all`, { headers });
            console.log(`✅ Cleared fines: ${finesResponse.data.message}`);
        } catch (error) {
            console.log('⚠️ Could not clear fines (might be empty already)');
        }
        
        // Clear radars
        try {
            const radarsResponse = await axios.delete(`${BACKEND_URL}/api/radars/clear-all`, { headers });
            console.log(`✅ Cleared radars: ${radarsResponse.data.message}`);
        } catch (error) {
            console.log('⚠️ Could not clear radars (might be empty already)');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to clear demo data:', error.response?.data?.message || error.message);
        return false;
    }
}

async function checkCameraDirectories() {
    try {
        console.log('📷 Checking available cameras from FTP directories...');
        const response = await axios.get(`${IMAGE_SERVER_URL}/api/ftp-images/cameras`);
        
        if (response.data.success) {
            const cameras = response.data.cameras;
            console.log(`✅ Found ${cameras.length} camera(s): ${cameras.join(', ')}`);
            
            // Check for images in each camera
            for (const camera of cameras) {
                try {
                    const datesResponse = await axios.get(`${IMAGE_SERVER_URL}/api/ftp-images/dates`);
                    if (datesResponse.data.success && datesResponse.data.dates.length > 0) {
                        console.log(`📸 Camera ${camera} has images for dates: ${datesResponse.data.dates.map(d => d.date).join(', ')}`);
                    } else {
                        console.log(`⚠️ Camera ${camera} has no images yet`);
                    }
                } catch (error) {
                    console.log(`⚠️ Could not check images for camera ${camera}`);
                }
            }
            
            return cameras;
        }
        return [];
    } catch (error) {
        console.error('❌ Failed to check cameras:', error.message);
        return [];
    }
}

async function simulateRadarData(cameras) {
    console.log('📡 Creating radar records based on camera directories...');
    
    // For now, we'll just log what would be created
    // In a real system, radars would be created when UDP data arrives
    cameras.forEach((camera, index) => {
        console.log(`📍 Radar ${index + 1}:`);
        console.log(`   Camera IP: ${camera}`);
        console.log(`   FTP Path: /srv/camera_uploads/camera001/${camera}`);
        console.log(`   Status: Active (based on FTP directory existence)`);
        console.log(`   Location: Camera Location ${camera}`);
    });
}

async function showAccessInstructions() {
    console.log('');
    console.log('🌐 Real-time System Setup Complete!');
    console.log('=====================================');
    console.log('');
    console.log('📋 Frontend Pages (All Real-time):');
    console.log(`   • Fines: ${FRONTEND_URL}/fines`);
    console.log(`   • Radars: ${FRONTEND_URL}/radars`);
    console.log(`   • Plate Recognition: ${FRONTEND_URL}/plate-recognition`);
    console.log(`   • Fines Images Monitor: ${FRONTEND_URL}/fines-images-monitor`);
    console.log(`   • Radar Info Monitor: ${FRONTEND_URL}/radar-info-monitor`);
    console.log('');
    console.log('🔄 Data Sources:');
    console.log('   • FTP Images: /srv/camera_uploads/camera001/192.168.1.54/');
    console.log('   • UDP Radar Data: Port 17081 (send: "ID: 1,Speed: 77, Time: 10:30:00.")');
    console.log('   • Real-time Updates: Auto-refresh every 5-10 seconds');
    console.log('');
    console.log('🧪 Test UDP Data:');
    console.log('   node /home/rnd2/Desktop/radar_sys/test-udp-radar.js');
    console.log('');
    console.log('📊 API Endpoints:');
    console.log(`   • Cameras: ${IMAGE_SERVER_URL}/api/ftp-images/cameras`);
    console.log(`   • Images: ${IMAGE_SERVER_URL}/api/ftp-images/list?camera=192.168.1.54&date=2025-09-30`);
    console.log(`   • Violation Cycle: ${BACKEND_URL}/api/plate-recognition/violations-cycle`);
}

async function main() {
    console.log('🚀 Setting up Real-time Radar System');
    console.log('====================================');
    console.log('');

    // Step 1: Login
    if (!(await login())) {
        console.log('❌ Setup failed - could not authenticate');
        return;
    }

    // Step 2: Clear demo data
    await clearDemoData();

    // Step 3: Check camera directories
    const cameras = await checkCameraDirectories();
    
    // Step 4: Show what radars would be created
    if (cameras.length > 0) {
        await simulateRadarData(cameras);
    }

    // Step 5: Show access instructions
    await showAccessInstructions();
}

// Run setup
main().catch(console.error);
