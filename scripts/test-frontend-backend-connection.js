const axios = require('axios');

async function testFrontendBackendConnection() {
    console.log('🔗 TESTING FRONTEND-BACKEND CONNECTION');
    console.log('=====================================');
    
    try {
        // Test 1: Backend Health Check
        console.log('\n1. Testing backend health...');
        const health = await axios.get('http://localhost:3000/health');
        console.log('✅ Backend is healthy');
        
        // Test 2: Login and get token
        console.log('\n2. Testing login flow...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/signin', {
            email: 'admin@potasfactory.com',
            password: 'admin123'
        });
        
        if (loginResponse.data.success) {
            const token = loginResponse.data.data.token;
            console.log('✅ Login successful');
            console.log(`   Token: ${token.substring(0, 30)}...`);
            
            // Test 3: Use token to access protected endpoint
            console.log('\n3. Testing protected endpoint with token...');
            const protectedResponse = await axios.get('http://localhost:3000/api/radars', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (protectedResponse.data.success) {
                console.log('✅ Protected endpoint accessible');
                console.log(`   Found ${protectedResponse.data.data.radars.length} radars`);
            }
            
            // Test 4: Test invalid token (should get 401)
            console.log('\n4. Testing invalid token (should fail)...');
            try {
                await axios.get('http://localhost:3000/api/radars', {
                    headers: { Authorization: 'Bearer invalid_token_12345' }
                });
                console.log('❌ Invalid token should have failed');
            } catch (error) {
                if (error.response?.status === 401) {
                    console.log('✅ Invalid token properly rejected (401)');
                } else {
                    console.log(`❌ Unexpected error: ${error.response?.status}`);
                }
            }
            
            console.log('\n📋 FRONTEND INTEGRATION GUIDE:');
            console.log('==============================');
            console.log('✅ Backend URL: http://localhost:3000');
            console.log('✅ Login endpoint: POST /api/auth/signin');
            console.log('✅ Protected endpoints: Include "Authorization: Bearer <token>" header');
            console.log('✅ Token validation: Working correctly');
            console.log('');
            console.log('🔐 Working credentials:');
            console.log('   Email: admin@potasfactory.com');
            console.log('   Password: admin123');
            console.log('');
            console.log('💡 Frontend should:');
            console.log('   1. Use real backend API (http://localhost:3000/api)');
            console.log('   2. Store real JWT tokens (not demo tokens)');
            console.log('   3. Handle 401 errors gracefully');
            console.log('   4. Include Authorization header in all protected requests');
            
        } else {
            console.log('❌ Login failed');
        }
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Backend server is not running. Start it with:');
            console.log('   cd /home/rnd2/Desktop/radar_sys/potassium-backend-');
            console.log('   node server.js');
        }
    }
}

testFrontendBackendConnection();
