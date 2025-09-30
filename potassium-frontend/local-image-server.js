const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

const app = express();
const PORT = 3003;

// Enable CORS for the frontend - very permissive for development
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Parse JSON bodies
app.use(express.json());

// Local path configuration
const LOCAL_BASE_PATH = '/srv/camera_uploads/camera001/192.168.1.54';
const BACKEND_API_URL = 'http://localhost:3000/api';

// Helper function to get radar data from backend
async function getRadarDataForTimeRange(startTime, endTime) {
  try {
    const response = await axios.get(`${BACKEND_API_URL}/fines`, {
      params: {
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString()
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.warn('⚠️ Could not fetch radar data from backend:', error.message);
    return [];
  }
}

// Helper function to correlate image with radar data
function correlateImageWithRadar(imageTime, radarData, windowSeconds = 30) {
  const imageTimestamp = imageTime.getTime();
  
  for (const radar of radarData) {
    const radarTime = new Date(radar.timestamp || radar.createdAt);
    const timeDiff = Math.abs(imageTimestamp - radarTime.getTime());
    
    if (timeDiff <= (windowSeconds * 1000)) {
      return {
        radarId: radar.radarId,
        speed: radar.speed,
        speedLimit: radar.speedLimit,
        isViolation: radar.speed > radar.speedLimit,
        fineAmount: radar.fineAmount,
        correlationId: radar.id,
        timeDifference: timeDiff
      };
    }
  }
  
  return null;
}

console.log('🖼️  Local Image Server starting...');
console.log(`📁 Base path: ${LOCAL_BASE_PATH}`);

// Helper function to check if path exists and is accessible
async function checkPathAccess(dirPath) {
  try {
    await fs.access(dirPath, fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

// API endpoint to get available cameras
app.get('/api/ftp-images/cameras', async (req, res) => {
  try {
    console.log('📷 Getting available cameras from FTP directories...');
    
    const cameraBasePath = '/srv/camera_uploads/camera001';
    const cameras = [];
    
    const hasAccess = await checkPathAccess(cameraBasePath);
    if (hasAccess) {
      const items = await fs.readdir(cameraBasePath, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && item.name.match(/^\d+\.\d+\.\d+\.\d+$/)) {
          cameras.push(item.name);
        }
      }
    }
    
    // Always include default camera if none found
    if (cameras.length === 0) {
      cameras.push('192.168.1.54');
    }
    
    console.log(`✅ Found ${cameras.length} camera(s): ${cameras.join(', ')}`);
    
    res.json({
      success: true,
      cameras: cameras,
      total: cameras.length,
      source: 'local',
      basePath: cameraBasePath
    });
  } catch (error) {
    console.error('❌ Error getting cameras:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      cameras: ['192.168.1.54'] // Default fallback
    });
  }
});

// API endpoint to list available dates
app.get('/api/ftp-images/dates', async (req, res) => {
  try {
    console.log('📅 Listing available dates from local path...');
    
    const hasAccess = await checkPathAccess(LOCAL_BASE_PATH);
    if (!hasAccess) {
      throw new Error(`Cannot access ${LOCAL_BASE_PATH}. Check permissions.`);
    }

    const baseDirs = await fs.readdir(LOCAL_BASE_PATH, { withFileTypes: true });
    const dateDirs = baseDirs
      .filter(d => d.isDirectory() && /\d{4}-\d{2}-\d{2}/.test(d.name))
      .map(d => ({
        date: d.name,
        modified: new Date().toISOString() // We'll use current time as fallback
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    console.log(`✅ Found ${dateDirs.length} date directories`);
    
    res.json({
      success: true,
      dates: dateDirs,
      total: dateDirs.length,
      source: 'local'
    });
    
  } catch (error) {
    console.error('❌ Error listing dates:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      dates: [],
      suggestion: 'Check if the path exists and you have read permissions'
    });
  }
});

// API endpoint to list images from local directory (supports all dates or specific date)
app.get('/api/ftp-images/list', async (req, res) => {
  try {
    const { camera = '192.168.1.54', date } = req.query;
    
    console.log(`📋 Listing images for camera: ${camera}, date: ${date || 'ALL'}`);
    
    let allImageFiles = [];
    
    if (date && date !== 'all') {
      // Get images for specific date
      const localPath = path.join(LOCAL_BASE_PATH, date, 'Common');
      console.log(`📁 Accessing specific date directory: ${localPath}`);
      
      const hasAccess = await checkPathAccess(localPath);
      if (hasAccess) {
        const files = await fs.readdir(localPath, { withFileTypes: true });
        allImageFiles = await processImageFiles(files, localPath, camera, date);
      }
    } else {
      // Get images from all available dates
      console.log(`📁 Accessing all dates in: ${LOCAL_BASE_PATH}`);
      
      const hasAccess = await checkPathAccess(LOCAL_BASE_PATH);
      if (!hasAccess) {
        throw new Error(`Cannot access ${LOCAL_BASE_PATH}. Check permissions.`);
      }

      const baseDirs = await fs.readdir(LOCAL_BASE_PATH, { withFileTypes: true });
      const dateDirs = baseDirs.filter(d => d.isDirectory() && /\d{4}-\d{2}-\d{2}/.test(d.name));
      
      console.log(`📅 Found ${dateDirs.length} date directories`);
      
      for (const dateDir of dateDirs) {
        const datePath = path.join(LOCAL_BASE_PATH, dateDir.name, 'Common');
        
        try {
          const hasDateAccess = await checkPathAccess(datePath);
          if (hasDateAccess) {
            const files = await fs.readdir(datePath, { withFileTypes: true });
            const dateImages = await processImageFiles(files, datePath, camera, dateDir.name);
            allImageFiles = allImageFiles.concat(dateImages);
          }
        } catch (dateError) {
          console.warn(`⚠️ Could not access date ${dateDir.name}:`, dateError.message);
        }
      }
    }
    
    // Sort by modification time, newest first
    allImageFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    console.log(`🖼️ Total images found: ${allImageFiles.length}`);
    if (allImageFiles.length > 0) {
      console.log('Sample files:', allImageFiles.slice(0, 3).map(f => f.filename));
    }
    
    res.json({
      success: true,
      files: allImageFiles,
      total: allImageFiles.length,
      source: 'local',
      dateFilter: date || 'all',
      debug: {
        totalFiles: allImageFiles.length,
        imageFiles: allImageFiles.length,
        accessGranted: true
      }
    });
    
  } catch (error) {
    console.error('❌ Error listing local files:', error.message);
    
    let errorDetails = {
      success: false,
      error: error.message,
      files: [],
      source: 'local',
      debug: {
        accessGranted: false,
        errorType: error.code || 'UNKNOWN',
        timestamp: new Date().toISOString()
      }
    };
    
    if (error.message.includes('ENOENT')) {
      errorDetails.suggestion = 'Directory does not exist. Check the date parameter.';
    } else if (error.message.includes('EACCES')) {
      errorDetails.suggestion = 'Permission denied. Try running with sudo or check file permissions.';
    }
    
    res.status(500).json(errorDetails);
  }
});

// Helper function to process image files and extract timestamp from filename
async function processImageFiles(files, dirPath, camera, date) {
  const imageFiles = [];
  
  // Get radar data for the date range to correlate with images
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);
  const radarData = await getRadarDataForTimeRange(dayStart, dayEnd);
  
  console.log(`🔍 Found ${radarData.length} radar records for ${date}`);
  
  for (const file of files) {
    if (file.isFile() && /\.(jpg|jpeg|png|gif|bmp)$/i.test(file.name)) {
      try {
        const filePath = path.join(dirPath, file.name);
        const stats = await fs.stat(filePath);
        
        // Extract timestamp from filename if possible (format: YYYYMMDDHHMMSS.jpg)
        let extractedTimestamp = null;
        let imageTime = stats.mtime;
        
        const timestampMatch = file.name.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
        if (timestampMatch) {
          const [, year, month, day, hour, minute, second] = timestampMatch;
          imageTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
          extractedTimestamp = imageTime.toISOString();
        }
        
        // Try to correlate with radar data
        const radarCorrelation = correlateImageWithRadar(imageTime, radarData);
        
        const imageData = {
          filename: file.name,
          modified: extractedTimestamp || stats.mtime.toISOString(),
          size: stats.size,
          date: date,
          url: `/api/ftp-images/camera001/${camera}/${date}/Common/${file.name}`,
          timestamp: extractedTimestamp || stats.mtime.toISOString(),
          // Add radar correlation data
          radarId: radarCorrelation?.radarId,
          speed: radarCorrelation?.speed,
          speedLimit: radarCorrelation?.speedLimit,
          isViolation: radarCorrelation?.isViolation || false,
          fineAmount: radarCorrelation?.fineAmount,
          correlationId: radarCorrelation?.correlationId,
          timeDifference: radarCorrelation?.timeDifference
        };
        
        if (radarCorrelation) {
          console.log(`🎯 Image ${file.name} correlated with radar: ${radarCorrelation.speed} km/h`);
        }
        
        imageFiles.push(imageData);
      } catch (statError) {
        console.warn(`⚠️ Could not get stats for ${file.name}:`, statError.message);
      }
    }
  }
  
  return imageFiles;
}

// API endpoint to serve individual images from local directory
app.get('/api/ftp-images/camera001/:camera/:date/Common/:filename', async (req, res) => {
  try {
    const { camera, date, filename } = req.params;
    
    console.log(`🖼️ Serving local image: ${filename} for camera ${camera} on ${date}`);
    
    const localPath = path.join(LOCAL_BASE_PATH, date, 'Common', filename);
    console.log(`📁 Local file path: ${localPath}`);
    
    // Check if file exists and is accessible
    const hasAccess = await checkPathAccess(localPath);
    if (!hasAccess) {
      throw new Error(`File not found or not accessible: ${filename}`);
    }
    
    const startTime = Date.now();
    
    // Read the file
    const imageBuffer = await fs.readFile(localPath);
    const readTime = Date.now() - startTime;
    
    console.log(`✅ Read ${filename}: ${imageBuffer.length} bytes in ${readTime}ms`);
    
    // Set appropriate headers based on file extension
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
      'X-Read-Time': `${readTime}ms`,
      'X-File-Size': imageBuffer.length,
      'X-Source': 'local'
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error(`❌ Error serving local file ${req.params.filename}:`, error.message);
    
    let errorResponse = {
      success: false,
      error: `File not found: ${error.message}`,
      filename: req.params.filename,
      source: 'local',
      debug: {
        errorType: error.code || 'UNKNOWN'
      }
    };
    
    if (error.message.includes('ENOENT')) {
      errorResponse.suggestion = 'File does not exist in the specified path';
    } else if (error.message.includes('EACCES')) {
      errorResponse.suggestion = 'Permission denied. Check file permissions';
    }
    
    res.status(404).json(errorResponse);
  }
});

// FTP test endpoint - simulates FTP connection test
app.post('/api/ftp-test', (req, res) => {
  const { host, port, username, password } = req.body;
  
  console.log(`🔍 FTP Test Request: ${username}@${host}:${port}`);
  
  // Test with correct credentials
  if (host === '192.168.1.55' && username === 'camera001' && password === 'RadarCamera01') {
    console.log('✅ Correct FTP credentials provided - simulating success');
    res.json({
      success: true,
      message: 'FTP authentication successful',
      connected: true
    });
    return;
  }
  
  // Simulate authentication failure for incorrect credentials
  if (host === '192.168.1.55' && username === 'admin' && password === 'idealchip123') {
    console.log('❌ Simulating known FTP authentication failure (old credentials)');
    res.json({
      success: false,
      error: '530 Login incorrect.',
      message: 'FTP authentication failed - old credentials rejected by server',
      suggestion: 'Use correct credentials: camera001/RadarCamera01'
    });
    return;
  }
  
  // For other credentials, simulate connection failure
  res.json({
    success: false,
    error: 'Connection test failed',
    message: 'FTP server connection could not be established'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Local Image Server is running',
    timestamp: new Date().toISOString(),
    source: 'local',
    config: {
      basePath: LOCAL_BASE_PATH,
      port: PORT
    },
    endpoints: {
      dates: '/api/ftp-images/dates',
      list: '/api/ftp-images/list?camera=192.168.1.54&date=2025-09-28',
      image: '/api/ftp-images/camera001/192.168.1.54/2025-09-28/Common/[filename]'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    source: 'local'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Local Image Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Serving images from: ${LOCAL_BASE_PATH}`);
  console.log('');
  console.log('🔍 Testing local path access...');
  
  // Test path access on startup
  checkPathAccess(LOCAL_BASE_PATH)
    .then(hasAccess => {
      if (hasAccess) {
        console.log('✅ Local path is accessible');
        
        // Test listing a sample date directory
        fs.readdir(LOCAL_BASE_PATH, { withFileTypes: true })
          .then(dirs => {
            const dateDirs = dirs.filter(d => d.isDirectory() && /\d{4}-\d{2}-\d{2}/.test(d.name));
            console.log(`✅ Found ${dateDirs.length} date directories`);
            if (dateDirs.length > 0) {
              console.log('Available dates:', dateDirs.map(d => d.name).sort().reverse().slice(0, 5));
            }
          })
          .catch(err => console.warn('⚠️ Could not list date directories:', err.message));
      } else {
        console.error('❌ Cannot access local path. Check permissions.');
        console.log('💡 Try running with: sudo node local-image-server.js');
      }
    })
    .catch(err => console.error('❌ Path access test failed:', err.message));
});
