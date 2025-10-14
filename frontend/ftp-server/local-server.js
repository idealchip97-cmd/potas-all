const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = 3003;

// Enable CORS for the frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'],
  credentials: true
}));

// Local path configuration  
const LOCAL_BASE_PATH = path.join(__dirname, '..', 'local-images', 'camera001', '192.168.1.54');

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

// API endpoint to list images from local directory
app.get('/api/ftp-images/list', async (req, res) => {
  try {
    const { camera = '192.168.1.54', date = new Date().toISOString().split('T')[0] } = req.query;
    
    console.log(`📋 Listing images for camera: ${camera}, date: ${date}`);
    
    const localPath = path.join(LOCAL_BASE_PATH, date, 'Common');
    console.log(`📁 Accessing local directory: ${localPath}`);
    
    const hasAccess = await checkPathAccess(localPath);
    if (!hasAccess) {
      throw new Error(`Cannot access ${localPath}. Directory may not exist or insufficient permissions.`);
    }

    const files = await fs.readdir(localPath, { withFileTypes: true });
    console.log(`📄 Found ${files.length} total files`);
    
    // Filter only image files and get their stats
    const imageFiles = [];
    
    for (const file of files) {
      if (file.isFile() && /\.(jpg|jpeg|png|gif|bmp)$/i.test(file.name)) {
        try {
          const filePath = path.join(localPath, file.name);
          const stats = await fs.stat(filePath);
          
          imageFiles.push({
            filename: file.name,
            modified: stats.mtime.toISOString(),
            size: stats.size,
            url: `/api/ftp-images/camera001/${camera}/${date}/Common/${file.name}`
          });
        } catch (statError) {
          console.warn(`⚠️ Could not get stats for ${file.name}:`, statError.message);
        }
      }
    }
    
    // Sort by modification time, newest first
    imageFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    console.log(`🖼️ Filtered to ${imageFiles.length} image files`);
    if (imageFiles.length > 0) {
      console.log('Sample files:', imageFiles.slice(0, 3).map(f => f.filename));
    }
    
    res.json({
      success: true,
      files: imageFiles,
      total: imageFiles.length,
      path: localPath,
      source: 'local',
      debug: {
        totalFiles: files.length,
        imageFiles: imageFiles.length,
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
