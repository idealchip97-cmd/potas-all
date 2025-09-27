#!/usr/bin/env node

const { Client } = require('basic-ftp');

// FTP configuration
const FTP_CONFIG = {
  host: '192.168.1.14',
  port: 21,
  user: 'admin',
  password: 'idealchip123',
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

    // Test directory listing
    const testPath = '/srv/camera_uploads/camera001/192.168.1.54/2025-09-27/Common/';
    console.log(`📁 Testing directory access: ${testPath}`);
    
    try {
      const files = await client.list(testPath);
      console.log(`✅ Successfully listed ${files.length} files`);
      
      // Show image files
      const imageFiles = files.filter(f => f.isFile && /\.(jpg|jpeg|png|gif|bmp)$/i.test(f.name));
      console.log(`🖼️  Found ${imageFiles.length} image files:`);
      
      imageFiles.slice(0, 10).forEach((file, index) => {
        const size = (file.size / 1024).toFixed(1);
        const date = file.modifiedAt ? file.modifiedAt.toISOString().split('T')[0] : 'unknown';
        console.log(`   ${index + 1}. ${file.name} (${size} KB, ${date})`);
      });

      if (imageFiles.length > 10) {
        console.log(`   ... and ${imageFiles.length - 10} more files`);
      }

      // Test downloading a sample image
      if (imageFiles.length > 0) {
        const sampleFile = imageFiles[0];
        console.log('');
        console.log(`📥 Testing image download: ${sampleFile.name}`);
        
        const chunks = [];
        const startTime = Date.now();
        
        await client.downloadTo(
          {
            write: (chunk) => chunks.push(chunk),
            end: () => {},
            destroy: () => {}
          },
          `${testPath}${sampleFile.name}`
        );
        
        const downloadTime = Date.now() - startTime;
        const totalSize = Buffer.concat(chunks).length;
        
        console.log(`✅ Downloaded ${sampleFile.name}: ${totalSize} bytes in ${downloadTime}ms`);
        console.log(`📊 Download speed: ${(totalSize / 1024 / (downloadTime / 1000)).toFixed(1)} KB/s`);
      }

    } catch (dirError) {
      console.error('❌ Directory access failed:', dirError.message);
      
      // Try alternative paths
      const altPaths = [
        '/srv/camera_uploads/',
        '/srv/camera_uploads/camera001/',
        '/srv/camera_uploads/camera001/192.168.1.54/',
        '/srv/camera_uploads/camera001/192.168.1.54/2025-09-27/'
      ];
      
      console.log('');
      console.log('🔍 Trying alternative paths...');
      
      for (const altPath of altPaths) {
        try {
          const altFiles = await client.list(altPath);
          console.log(`✅ ${altPath} - Found ${altFiles.length} items`);
          if (altFiles.length > 0) {
            console.log(`   Sample items: ${altFiles.slice(0, 3).map(f => f.name).join(', ')}`);
          }
        } catch (altError) {
          console.log(`❌ ${altPath} - ${altError.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ FTP connection failed:', error.message);
    console.log('');
    console.log('💡 Troubleshooting tips:');
    
    if (error.message.includes('EHOSTUNREACH')) {
      console.log('   • Check network connectivity to 192.168.1.14');
      console.log('   • Verify you are on the same network as the FTP server');
      console.log('   • Check firewall settings');
      console.log('   • Try connecting with VPN if required');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('   • Verify FTP service is running on port 21');
      console.log('   • Check if port 21 is blocked by firewall');
      console.log('   • Try telnet 192.168.1.14 21 to test connectivity');
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
