const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { Client } = require('basic-ftp');

const app = express();
const PORT = 3003; // Use a different port to avoid conflicts

// Enable CORS for the frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'],
  credentials: true
}));

// FTP configuration
const FTP_CONFIG = {
  host: '192.168.1.14',
  port: 21,
  user: 'admin',
  password: 'idealchip123',
  secure: false
};

// Cache for FTP connections to avoid reconnecting for each request
let ftpClient = null;
let ftpConnected = false;

// Initialize FTP connection
async function initializeFTP() {
  try {
    if (ftpClient) {
      ftpClient.close();
    }
    
    ftpClient = new Client();
    ftpClient.ftp.verbose = true; // Enable verbose logging for debugging
    
    console.log(`Attempting FTP connection to ${FTP_CONFIG.host}:${FTP_CONFIG.port} with user ${FTP_CONFIG.user}`);
    
    await ftpClient.access({
      ...FTP_CONFIG,
      timeout: 10000 // 10 second timeout
    });
    
    ftpConnected = true;
    console.log('✅ FTP connection established successfully');
    console.log('Testing directory listing...');
    
    // Test directory access
    try {
      const testPath = '/srv/camera_uploads/camera001/192.168.1.54/2025-09-27/Common/';
      const files = await ftpClient.list(testPath);
      console.log(`✅ Successfully listed ${files.length} files in ${testPath}`);
      console.log('Sample files:', files.slice(0, 3).map(f => f.name));
    } catch (testError) {
      console.warn('⚠️ Directory test failed:', testError.message);
    }
    
    // Handle connection errors
    ftpClient.ftp.socket.on('error', (err) => {
      console.error('❌ FTP socket error:', err.message);
      ftpConnected = false;
    });
    
    ftpClient.ftp.socket.on('close', () => {
      console.log('🔌 FTP connection closed');
      ftpConnected = false;
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to FTP server:', error.message);
    console.error('Full error:', error);
    ftpConnected = false;
    
    // Provide helpful troubleshooting information
    if (error.message.includes('EHOSTUNREACH')) {
      console.log('💡 Troubleshooting: Host unreachable. Check:');
      console.log('   - Network connectivity to 192.168.1.14');
      console.log('   - Firewall settings');
      console.log('   - VPN connection if required');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Troubleshooting: Connection refused. Check:');
      console.log('   - FTP service is running on port 21');
      console.log('   - Port 21 is not blocked');
    } else if (error.message.includes('Authentication failed')) {
      console.log('💡 Troubleshooting: Authentication failed. Check:');
      console.log('   - Username: admin');
      console.log('   - Password: idealchip123');
    }
    
    throw error;
  }
}

// Ensure FTP connection is active
async function ensureFTPConnection() {
  if (!ftpConnected || !ftpClient) {
    await initializeFTP();
  }
}

// API endpoint to list FTP images
app.get('/api/ftp-images/list', async (req, res) => {
  try {
    const { camera = '192.168.1.54', date = new Date().toISOString().split('T')[0] } = req.query;
    
    console.log(`📋 Listing images for camera: ${camera}, date: ${date}`);
    
    await ensureFTPConnection();
    
    const ftpPath = `/srv/camera_uploads/camera001/${camera}/${date}/Common/`;
    console.log(`📁 Accessing FTP directory: ${ftpPath}`);
    
    const files = await ftpClient.list(ftpPath);
    console.log(`📄 Found ${files.length} total files`);
    
    // Filter only image files and format response
    const imageFiles = files
      .filter(file => {
        const isFile = file.isFile;
        const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(file.name);
        return isFile && isImage;
      })
      .map(file => ({
        filename: file.name,
        modified: file.modifiedAt ? file.modifiedAt.toISOString() : new Date().toISOString(),
        size: file.size,
        url: `/api/ftp-images/camera001/${camera}/${date}/Common/${file.name}`
      }))
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    console.log(`🖼️ Filtered to ${imageFiles.length} image files`);
    if (imageFiles.length > 0) {
      console.log('Sample files:', imageFiles.slice(0, 3).map(f => f.filename));
    }
    
    res.json({
      success: true,
      files: imageFiles,
      total: imageFiles.length,
      path: ftpPath,
      debug: {
        totalFiles: files.length,
        imageFiles: imageFiles.length,
        ftpConnected: ftpConnected
      }
    });
    
  } catch (error) {
    console.error('❌ Error listing FTP files:', error.message);
    
    // Provide more detailed error information
    let errorDetails = {
      success: false,
      error: error.message,
      files: [],
      debug: {
        ftpConnected: ftpConnected,
        errorType: error.code || 'UNKNOWN',
        timestamp: new Date().toISOString()
      }
    };
    
    if (error.message.includes('No such file')) {
      errorDetails.suggestion = 'Directory path may not exist. Check the camera and date parameters.';
    } else if (error.message.includes('Permission denied')) {
      errorDetails.suggestion = 'Access denied. Check FTP credentials and permissions.';
    }
    
    res.status(500).json(errorDetails);
  }
});

// API endpoint to serve individual FTP images
app.get('/api/ftp-images/camera001/:camera/:date/Common/:filename', async (req, res) => {
  try {
    const { camera, date, filename } = req.params;
    
    console.log(`🖼️ Downloading image: ${filename} for camera ${camera} on ${date}`);
    
    await ensureFTPConnection();
    
    const ftpPath = `/srv/camera_uploads/camera001/${camera}/${date}/Common/${filename}`;
    console.log(`📥 FTP path: ${ftpPath}`);
    
    // Create a temporary buffer to store the image
    const chunks = [];
    let totalSize = 0;
    
    const startTime = Date.now();
    
    await ftpClient.downloadTo(
      {
        write: (chunk) => {
          chunks.push(chunk);
          totalSize += chunk.length;
        },
        end: () => {},
        destroy: () => {}
      },
      ftpPath
    );
    
    const downloadTime = Date.now() - startTime;
    const imageBuffer = Buffer.concat(chunks);
    
    console.log(`✅ Downloaded ${filename}: ${imageBuffer.length} bytes in ${downloadTime}ms`);
    
    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg'; // default
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.bmp':
        contentType = 'image/bmp';
        break;
      case '.jpg':
      case '.jpeg':
      default:
        contentType = 'image/jpeg';
        break;
    }
    
    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*',
      'X-Download-Time': `${downloadTime}ms`,
      'X-File-Size': imageBuffer.length
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error(`❌ Error downloading FTP file ${req.params.filename}:`, error.message);
    
    let errorResponse = {
      success: false,
      error: `File not found: ${error.message}`,
      filename: req.params.filename,
      debug: {
        ftpConnected: ftpConnected,
        errorType: error.code || 'UNKNOWN'
      }
    };
    
    if (error.message.includes('No such file')) {
      errorResponse.suggestion = 'File may not exist or path is incorrect';
    } else if (error.message.includes('Permission denied')) {
      errorResponse.suggestion = 'Access denied. Check FTP permissions';
    }
    
    res.status(404).json(errorResponse);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FTP Image Server is running',
    timestamp: new Date().toISOString(),
    ftp: {
      connected: ftpConnected,
      host: FTP_CONFIG.host,
      port: FTP_CONFIG.port,
      user: FTP_CONFIG.user
    },
    endpoints: {
      list: '/api/ftp-images/list?camera=192.168.1.54&date=2025-09-27',
      image: '/api/ftp-images/camera001/192.168.1.54/2025-09-27/Common/[filename]'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`FTP Image Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  
  // Initialize FTP connection on startup
  initializeFTP().catch(err => {
    console.error('Failed to initialize FTP connection on startup:', err.message);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  if (ftpClient) {
    ftpClient.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  if (ftpClient) {
    ftpClient.close();
  }
  process.exit(0);
});
