const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3000';

// Test credentials (use your actual admin credentials)
const TEST_CREDENTIALS = {
    email: 'admin@potasfactory.com',
    password: 'admin123' // Update with actual password
};

let authToken = null;

async function login() {
    try {
        console.log('🔐 Logging in...');
        const response = await axios.post(`${BASE_URL}/api/auth/login`, TEST_CREDENTIALS);
        
        if (response.data.success) {
            authToken = response.data.data.token;
            console.log('✅ Login successful');
            return true;
        } else {
            console.error('❌ Login failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Login error:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testPlateRecognitionSync() {
    if (!authToken) {
        console.error('❌ No auth token available');
        return;
    }

    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };

    try {
        console.log('\n📊 Getting sync statistics...');
        const statsResponse = await axios.get(`${BASE_URL}/api/plate-recognition-sync/statistics`, { headers });
        
        if (statsResponse.data.success) {
            console.log('✅ Sync Statistics:');
            console.log('   Fines:');
            console.log(`     - Total: ${statsResponse.data.data.fines.total}`);
            console.log(`     - With Plates: ${statsResponse.data.data.fines.withPlates}`);
            console.log(`     - Without Plates: ${statsResponse.data.data.fines.withoutPlates}`);
            console.log(`     - Completion Rate: ${statsResponse.data.data.fines.plateCompletionRate}%`);
            console.log('   Plate Recognitions:');
            console.log(`     - Total: ${statsResponse.data.data.plateRecognitions.total}`);
            console.log(`     - Successful: ${statsResponse.data.data.plateRecognitions.successful}`);
            console.log(`     - Success Rate: ${statsResponse.data.data.plateRecognitions.successRate}%`);
        }

        console.log('\n🔄 Getting sync status and recommendations...');
        const statusResponse = await axios.get(`${BASE_URL}/api/plate-recognition-sync/status`, { headers });
        
        if (statusResponse.data.success) {
            console.log('✅ Sync Status Retrieved');
            const recommendations = statusResponse.data.data.recommendations;
            
            if (recommendations.length > 0) {
                console.log('💡 Recommendations:');
                recommendations.forEach((rec, index) => {
                    console.log(`   ${index + 1}. ${rec.message}`);
                    console.log(`      Action: ${rec.action}`);
                });
            } else {
                console.log('✅ No sync actions needed - system is up to date');
            }
        }

        // Test sync if there are fines without plates
        if (statsResponse.data.data.fines.withoutPlates > 0) {
            console.log('\n🔄 Testing sync to fines...');
            const syncResponse = await axios.post(`${BASE_URL}/api/plate-recognition-sync/sync-to-fines`, {}, { headers });
            
            if (syncResponse.data.success) {
                console.log(`✅ Sync completed: ${syncResponse.data.message}`);
                console.log(`   Synced: ${syncResponse.data.data.syncedCount} fines`);
            }
        }

        // Test creating fines from plate recognition
        console.log('\n🆕 Testing fine creation from plate recognition...');
        const createResponse = await axios.post(`${BASE_URL}/api/plate-recognition-sync/create-fines`, {}, { headers });
        
        if (createResponse.data.success) {
            console.log(`✅ Fine creation completed: ${createResponse.data.message}`);
            console.log(`   Created: ${createResponse.data.data.createdCount} new fines`);
        }

    } catch (error) {
        console.error('❌ Test error:', error.response?.data?.message || error.message);
    }
}

async function testPlateRecognitionAPI() {
    if (!authToken) {
        console.error('❌ No auth token available');
        return;
    }

    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };

    try {
        console.log('\n📋 Testing plate recognition API...');
        
        // Test getting plate recognition results
        const plateResponse = await axios.get(`${BASE_URL}/api/plate-recognition?limit=5`, { headers });
        
        if (plateResponse.data.success) {
            console.log(`✅ Found ${plateResponse.data.data.results.length} plate recognition results`);
            
            if (plateResponse.data.data.results.length > 0) {
                const sample = plateResponse.data.data.results[0];
                console.log('   Sample result:');
                console.log(`     - ID: ${sample.id}`);
                console.log(`     - Plate: ${sample.plateNumber}`);
                console.log(`     - Confidence: ${sample.confidence}%`);
                console.log(`     - Status: ${sample.status}`);
            }
        }

        // Test getting statistics
        const statsResponse = await axios.get(`${BASE_URL}/api/plate-recognition/statistics`, { headers });
        
        if (statsResponse.data.success) {
            console.log('✅ Plate Recognition Statistics:');
            console.log(`   - Total Processed: ${statsResponse.data.data.totalProcessed}`);
            console.log(`   - Successful: ${statsResponse.data.data.successfulRecognitions}`);
            console.log(`   - Success Rate: ${statsResponse.data.data.successRate}%`);
            console.log(`   - Average Confidence: ${statsResponse.data.data.averageConfidence}%`);
        }

    } catch (error) {
        console.error('❌ Plate recognition API test error:', error.response?.data?.message || error.message);
    }
}

async function main() {
    console.log('🧪 Testing Plate Recognition to Fines Integration');
    console.log('================================================');

    // Login first
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.error('❌ Cannot proceed without authentication');
        return;
    }

    // Test plate recognition API
    await testPlateRecognitionAPI();

    // Test sync functionality
    await testPlateRecognitionSync();

    console.log('\n✅ Integration test completed!');
    console.log('\n📝 Available API endpoints:');
    console.log('   GET  /api/plate-recognition-sync/statistics');
    console.log('   GET  /api/plate-recognition-sync/status');
    console.log('   POST /api/plate-recognition-sync/sync-to-fines');
    console.log('   POST /api/plate-recognition-sync/create-fines');
    console.log('   POST /api/plate-recognition-sync/full-sync');
}

// Run the test
main().catch(console.error);
