const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { Client } = require('basic-ftp');

const app = express();
const PORT = 3003; // Use a different port to avoid conflicts

// Enable CORS for the frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// FTP configuration
const FTP_CONFIG = {
  host: '192.186.1.55',
  port: 21,
  user: 'camera001',
  password: 'RadarCamera01',
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
    ftpClient.ftp.verbose = false; // Reduce logging
    
    await ftpClient.access(FTP_CONFIG);
    ftpConnected = true;
    console.log('FTP connection established');
    
    // Handle connection errors
    ftpClient.ftp.socket.on('error', (err) => {
      console.error('FTP socket error:', err.message);
      ftpConnected = false;
    });
    
    ftpClient.ftp.socket.on('close', () => {
      console.log('FTP connection closed');
      ftpConnected = false;
    });
    
  } catch (error) {
    console.error('Failed to connect to FTP server:', error.message);
    ftpConnected = false;
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
    
    await ensureFTPConnection();
    
    const ftpPath = `/srv/camera_uploads/camera001/${camera}/${date}/Common/`;
    console.log(`Listing FTP directory: ${ftpPath}`);
    
    const files = await ftpClient.list(ftpPath);
    
    // Filter only image files and format response
    const imageFiles = files
      .filter(file => file.isFile && /\.(jpg|jpeg|png|gif|bmp)$/i.test(file.name))
      .map(file => ({
        filename: file.name,
        modified: file.modifiedAt ? file.modifiedAt.toISOString() : new Date().toISOString(),
        size: file.size,
        url: `/api/ftp-images/camera001/${camera}/${date}/Common/${file.name}`
      }))
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    res.json({
      success: true,
      files: imageFiles,
      total: imageFiles.length,
      path: ftpPath
    });
    
  } catch (error) {
    console.error('Error listing FTP files:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      files: []
    });
  }
});

// API endpoint to serve individual FTP images
app.get('/api/ftp-images/camera001/:camera/:date/Common/:filename', async (req, res) => {
  try {
    const { camera, date, filename } = req.params;
    
    await ensureFTPConnection();
    
    const ftpPath = `/srv/camera_uploads/camera001/${camera}/${date}/Common/${filename}`;
    console.log(`Downloading FTP file: ${ftpPath}`);
    
    // Create a temporary buffer to store the image
    const chunks = [];
    
    await ftpClient.downloadTo(
      {
        write: (chunk) => chunks.push(chunk),
        end: () => {},
        destroy: () => {}
      },
      ftpPath
    );
    
    const imageBuffer = Buffer.concat(chunks);
    
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
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error('Error downloading FTP file:', error.message);
    res.status(404).json({
      success: false,
      error: `File not found: ${error.message}`
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FTP Image Server is running',
    timestamp: new Date().toISOString(),
    ftpConnected: ftpConnected
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
