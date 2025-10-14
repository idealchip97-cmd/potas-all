#!/usr/bin/env node

const { Client } = require('basic-ftp');

// Common credential combinations to test
const credentialSets = [
  { user: 'admin', password: 'idealchip123' },
  { user: 'admin', password: 'admin' },
  { user: 'admin', password: 'password' },
  { user: 'admin', password: '' },
  { user: 'ftp', password: 'ftp' },
  { user: 'anonymous', password: '' },
  { user: 'camera', password: 'camera' },
  { user: 'user', password: 'user' },
  { user: 'root', password: 'root' },
  { user: 'ftpuser', password: 'ftpuser' }
];

async function testCredentials() {
  console.log('🔐 Testing FTP Credentials');
  console.log('==========================');
  console.log(`Host: 192.168.1.55:21`);
  console.log('');

  for (const [index, creds] of credentialSets.entries()) {
    const client = new Client();
    client.ftp.verbose = false; // Reduce noise
    
    try {
      console.log(`${index + 1}. Testing: ${creds.user} / ${creds.password || '(empty)'}`);
      
      await client.access({
        host: '192.168.1.55',
        port: 21,
        user: creds.user,
        password: creds.password,
        secure: false
      });
      
      console.log(`✅ SUCCESS! Valid credentials found:`);
      console.log(`   Username: ${creds.user}`);
      console.log(`   Password: ${creds.password || '(empty)'}`);
      
      // Test directory access
      try {
        const files = await client.list('/');
        console.log(`   Root directory contains ${files.length} items`);
        
        // Try to find camera uploads directory
        const cameraDir = files.find(f => f.name.includes('camera') || f.name.includes('srv'));
        if (cameraDir) {
          console.log(`   Found potential camera directory: ${cameraDir.name}`);
        }
      } catch (listError) {
        console.log(`   ⚠️ Directory listing failed: ${listError.message}`);
      }
      
      client.close();
      return creds;
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      client.close();
    }
  }
  
  console.log('');
  console.log('❌ No valid credentials found from common combinations');
  console.log('💡 You may need to:');
  console.log('   • Check with the camera/FTP server administrator');
  console.log('   • Look for credential files on the camera system');
  console.log('   • Check camera web interface for FTP settings');
  
  return null;
}

// Run the test
testCredentials().catch(console.error);
