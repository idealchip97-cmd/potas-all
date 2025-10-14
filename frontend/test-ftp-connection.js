#!/usr/bin/env node

const { Client } = require('basic-ftp');

// FTP configuration - UPDATED WITH CORRECT CREDENTIALS
const FTP_CONFIG = {
  host: '192.168.1.55',
  port: 21,
  user: 'camera001',
  password: 'RadarCamera01',
  secure: false
};

async function testFTPConnection() {
  console.log('🔍 Testing FTP Connection to Camera Server');
  console.log('==========================================');
  console.log(`Host: ${FTP_CONFIG.host}:${FTP_CONFIG.port}`);
  console.log(`User: ${FTP_CONFIG.user}`);
  console.log('');

  const client = new Client();
  client.ftp.verbose = true;

  try {
    console.log('📡 Connecting to FTP server...');
    await client.access(FTP_CONFIG);
    console.log('✅ FTP connection established successfully!');
    console.log('');

    // Test directory structure exploration
    console.log('🔍 Exploring FTP directory structure...');
    
    const pathsToTest = [
      '/192.168.1.54',
      '/192.168.1.54/2025-09-30',
      '/192.168.1.54/2025-09-30/Common',
      '/192.168.1.54/2025-09-29',
      '/192.168.1.54/2025-09-29/Common'
    ];
    
    for (const testPath of pathsToTest) {
      try {
        console.log(`\n📁 Testing: ${testPath}`);
        const files = await client.list(testPath);
        console.log(`✅ Found ${files.length} items`);
        
        if (files.length > 0 && files.length <= 20) {
          files.forEach(file => {
            const type = file.isDirectory ? '📁' : '📄';
            const size = file.isFile ? ` (${(file.size / 1024).toFixed(1)} KB)` : '';
            console.log(`   ${type} ${file.name}${size}`);
          });
        } else if (files.length > 20) {
          console.log(`   First 5 items:`);
          files.slice(0, 5).forEach(file => {
            const type = file.isDirectory ? '📁' : '📄';
            console.log(`   ${type} ${file.name}`);
          });
          console.log(`   ... and ${files.length - 5} more items`);
        }
      } catch (error) {
        console.log(`❌ Cannot access: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ FTP connection failed:', error.message);
    console.log('');
    console.log('💡 Troubleshooting tips:');
    
    if (error.message.includes('EHOSTUNREACH')) {
      console.log('   • Check network connectivity to 192.168.1.55');
      console.log('   • Verify you are on the same network as the FTP server');
      console.log('   • Check firewall settings');
      console.log('   • Try connecting with VPN if required');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('   • Verify FTP service is running on port 21');
      console.log('   • Check if port 21 is blocked by firewall');
      console.log('   • Try telnet 192.168.1.55 21 to test connectivity');
    } else if (error.message.includes('Authentication failed')) {
      console.log('   • Verify username: admin');
      console.log('   • Verify password: idealchip123');
      console.log('   • Check if FTP user account is active');
    } else {
      console.log('   • Check FTP server logs for more details');
      console.log('   • Verify FTP server configuration');
    }
    
  } finally {
    client.close();
  }
}

// Run the test
testFTPConnection().catch(console.error);
