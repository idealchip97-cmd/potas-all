const express = require('express');
const cors = require('cors');
const { Client } = require('basic-ftp');
const { Writable } = require('stream');

const app = express();
const PORT = 3003;

// Enable CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true
}));

// FTP configuration with correct credentials
const FTP_CONFIG = {
  host: '192.168.1.55',
  port: 21,
  user: 'camera001',
  password: 'RadarCamera01',
  secure: false
};

// FTP path configuration
const FTP_BASE_PATH = '/192.168.1.54';

// Create a new FTP client for each request
async function createFTPClient() {
  const client = new Client();
  client.ftp.verbose = false;
  
  try {
    await client.access({
      ...FTP_CONFIG,
      timeout: 10000
    });
    return client;
  } catch (error) {
    client.close();
    throw error;
  }
}

// API endpoint to list available dates
app.get('/api/ftp-images/dates', async (req, res) => {
  let client = null;
  
  try {
    console.log('📅 Listing available dates...');
    client = await createFTPClient();
    
    const baseDirs = await client.list(FTP_BASE_PATH);
    const dateDirs = baseDirs
      .filter(d => d.isDirectory && /\d{4}-\d{2}-\d{2}/.test(d.name))
      .map(d => ({
        date: d.name,
        modified: d.modifiedAt ? d.modifiedAt.toISOString() : null
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    console.log(`✅ Found ${dateDirs.length} date directories`);
    
    res.json({
      success: true,
      dates: dateDirs,
      total: dateDirs.length
    });
    
  } catch (error) {
    console.error('❌ Error listing dates:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      dates: []
    });
  } finally {
    if (client) client.close();
  }
});

// API endpoint to list FTP images
app.get('/api/ftp-images/list', async (req, res) => {
  let client = null;
  
  try {
    const { camera = '192.168.1.54', date } = req.query;
    console.log(`📋 Listing images for camera: ${camera}, date: ${date || 'ALL'}`);
    
    client = await createFTPClient();
    let allImageFiles = [];
    
    if (date && date !== 'all') {
      // Get images for specific date
      const ftpPath = `${FTP_BASE_PATH}/${date}/Common/`;
      console.log(`📁 Accessing FTP directory: ${ftpPath}`);
      
      try {
        const files = await client.list(ftpPath);
        allImageFiles = processImageFiles(files, camera, date);
      } catch (dirError) {
        console.warn(`⚠️ Could not access date ${date}:`, dirError.message);
      }
    } else {
      // Get images from all available dates
      console.log(`📁 Accessing all dates in: ${FTP_BASE_PATH}`);
      
      const baseDirs = await client.list(FTP_BASE_PATH);
      const dateDirs = baseDirs.filter(d => d.isDirectory && /\d{4}-\d{2}-\d{2}/.test(d.name));
      
      console.log(`📅 Found ${dateDirs.length} date directories`);
      
      for (const dateDir of dateDirs) {
        const datePath = `${FTP_BASE_PATH}/${dateDir.name}/Common/`;
        
        try {
          const files = await client.list(datePath);
          const dateImages = processImageFiles(files, camera, dateDir.name);
          allImageFiles = allImageFiles.concat(dateImages);
        } catch (dateError) {
          console.warn(`⚠️ Could not access date ${dateDir.name}:`, dateError.message);
        }
      }
    }
    
    // Sort by modification time, newest first
    allImageFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    console.log(`🖼️ Total images found: ${allImageFiles.length}`);
    
    res.json({
      success: true,
      files: allImageFiles,
      total: allImageFiles.length,
      debug: {
        totalFiles: allImageFiles.length,
        ftpConnected: true
      }
    });
    
  } catch (error) {
    console.error('❌ Error listing FTP files:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      files: []
    });
  } finally {
    if (client) client.close();
  }
});

// Helper function to process image files
function processImageFiles(files, camera, date) {
  return files
    .filter(file => file.isFile && /\.(jpg|jpeg|png|gif|bmp)$/i.test(file.name))
    .map(file => ({
      filename: file.name,
      modified: file.modifiedAt ? file.modifiedAt.toISOString() : new Date().toISOString(),
      size: file.size,
      date: date,
      url: `/api/ftp-images/camera001/${camera}/${date}/Common/${file.name}`
    }));
}

// API endpoint to serve individual FTP images
app.get('/api/ftp-images/camera001/:camera/:date/Common/:filename', async (req, res) => {
  let client = null;
  
  try {
    const { camera, date, filename } = req.params;
    console.log(`🖼️ Downloading image: ${filename} for camera ${camera} on ${date}`);
    
    client = await createFTPClient();
    const ftpPath = `${FTP_BASE_PATH}/${date}/Common/${filename}`;
    
    // Download image to buffer
    const chunks = [];
    const startTime = Date.now();
    
    // Create a proper writable stream
    const bufferStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      }
    });
    
    await client.downloadTo(bufferStream, ftpPath);
    
    const downloadTime = Date.now() - startTime;
    const imageBuffer = Buffer.concat(chunks);
    
    console.log(`✅ Downloaded ${filename}: ${imageBuffer.length} bytes in ${downloadTime}ms`);
    
    // Set appropriate headers
    const ext = filename.toLowerCase().split('.').pop();
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    
    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error(`❌ Error downloading FTP file ${req.params.filename}:`, error.message);
    res.status(404).json({
      success: false,
      error: `File not found: ${error.message}`
    });
  } finally {
    if (client) client.close();
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  let testConnection = false;
  
  try {
    const client = await createFTPClient();
    testConnection = true;
    client.close();
  } catch (error) {
    console.warn('Health check FTP connection failed:', error.message);
  }
  
  res.json({
    success: true,
    message: 'FTP Image Server is running',
    timestamp: new Date().toISOString(),
    ftp: {
      connected: testConnection,
      host: FTP_CONFIG.host,
      port: FTP_CONFIG.port,
      user: FTP_CONFIG.user
    }
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 FTP Image Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  
  // Test FTP connection on startup
  try {
    const client = await createFTPClient();
    console.log('✅ FTP connection test successful');
    client.close();
  } catch (error) {
    console.error('❌ FTP connection test failed:', error.message);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});
