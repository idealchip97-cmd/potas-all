const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

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

// Multi-camera path configuration
const CAMERA_BASE_PATH = '/srv/camera_uploads';
const PROCESSING_INBOX_PATH = process.env.NODE_ENV === 'test' ? 
  path.join(__dirname, 'processing_inbox_test') : 
  '/srv/processing_inbox';
const LOCAL_BASE_PATH = '/srv/camera_uploads/camera001/192.168.1.54'; // Fallback for backward compatibility

console.log('🖼️  Multi-Camera Image Server starting...');
console.log(`📁 Processing inbox: ${PROCESSING_INBOX_PATH}`);
console.log(`📁 Camera uploads: ${CAMERA_BASE_PATH}`);
console.log(`📁 Legacy path: ${LOCAL_BASE_PATH}`);

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
    console.log('📷 Getting available cameras from both FTP and processing directories...');
    
    const cameras = new Set();
    
    // Check processing inbox for camera folders
    const hasProcessingAccess = await checkPathAccess(PROCESSING_INBOX_PATH);
    if (hasProcessingAccess) {
      const processingItems = await fs.readdir(PROCESSING_INBOX_PATH, { withFileTypes: true });
      for (const item of processingItems) {
        if (item.isDirectory() && item.name.startsWith('camera')) {
          cameras.add(item.name);
          console.log(`📁 Found processing camera: ${item.name}`);
        }
      }
    }
    
    // Check FTP uploads directory structure
    const hasFtpAccess = await checkPathAccess(CAMERA_BASE_PATH);
    if (hasFtpAccess) {
      const ftpItems = await fs.readdir(CAMERA_BASE_PATH, { withFileTypes: true });
      for (const item of ftpItems) {
        if (item.isDirectory() && item.name.startsWith('camera')) {
          cameras.add(item.name);
          console.log(`📁 Found FTP camera: ${item.name}`);
        }
      }
    }
    
    // Convert to array and sort
    const cameraList = Array.from(cameras).sort();
    
    // Always include default cameras if none found
    if (cameraList.length === 0) {
      cameraList.push('camera001', 'camera002');
    }
    
    console.log(`✅ Found ${cameraList.length} camera(s): ${cameraList.join(', ')}`);
    
    res.json({
      success: true,
      cameras: cameraList,
      total: cameraList.length,
      source: 'multi-source',
      processingPath: PROCESSING_INBOX_PATH,
      ftpPath: CAMERA_BASE_PATH
    });
  } catch (error) {
    console.error('❌ Error getting cameras:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      cameras: ['camera001', 'camera002'] // Default fallback
    });
  }
});

// API endpoint to list available dates for all cameras
app.get('/api/ftp-images/dates', async (req, res) => {
  try {
    const { camera } = req.query;
    console.log(`📅 Listing available dates for camera: ${camera || 'ALL'}`);
    
    const allDates = new Set();
    
    // Check processing inbox for dates
    const hasProcessingAccess = await checkPathAccess(PROCESSING_INBOX_PATH);
    if (hasProcessingAccess) {
      if (camera) {
        // Get dates for specific camera
        const cameraPath = path.join(PROCESSING_INBOX_PATH, camera);
        const hasCameraAccess = await checkPathAccess(cameraPath);
        if (hasCameraAccess) {
          const cameraDirs = await fs.readdir(cameraPath, { withFileTypes: true });
          cameraDirs
            .filter(d => d.isDirectory() && /\d{4}-\d{2}-\d{2}/.test(d.name))
            .forEach(d => allDates.add(d.name));
        }
      } else {
        // Get dates from all cameras
        const processingItems = await fs.readdir(PROCESSING_INBOX_PATH, { withFileTypes: true });
        for (const item of processingItems) {
          if (item.isDirectory() && item.name.startsWith('camera')) {
            const cameraPath = path.join(PROCESSING_INBOX_PATH, item.name);
            try {
              const cameraDirs = await fs.readdir(cameraPath, { withFileTypes: true });
              cameraDirs
                .filter(d => d.isDirectory() && /\d{4}-\d{2}-\d{2}/.test(d.name))
                .forEach(d => allDates.add(d.name));
            } catch (err) {
              console.warn(`⚠️ Could not read camera ${item.name}:`, err.message);
            }
          }
        }
      }
    }
    
    // Also check legacy FTP path for backward compatibility
    const hasAccess = await checkPathAccess(LOCAL_BASE_PATH);
    if (hasAccess) {
      const baseDirs = await fs.readdir(LOCAL_BASE_PATH, { withFileTypes: true });
      baseDirs
        .filter(d => d.isDirectory() && /\d{4}-\d{2}-\d{2}/.test(d.name))
        .forEach(d => allDates.add(d.name));
    }
    
    // Convert to array and sort
    const dateDirs = Array.from(allDates)
      .map(date => ({
        date: date,
        modified: new Date().toISOString()
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    console.log(`✅ Found ${dateDirs.length} date directories for ${camera || 'all cameras'}`);
    
    res.json({
      success: true,
      dates: dateDirs,
      total: dateDirs.length,
      source: 'multi-source',
      camera: camera || 'all'
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

// API endpoint to get cases for specific camera and date
app.get('/api/ftp-images/cases/:cameraId/:date', async (req, res) => {
  try {
    const { cameraId, date } = req.params;
    console.log(`📁 Getting cases for ${cameraId} on ${date}`);
    
    const cameraPath = path.join(PROCESSING_INBOX_PATH, cameraId, date);
    const cases = [];
    
    const hasAccess = await checkPathAccess(cameraPath);
    if (!hasAccess) {
      return res.json({
        success: true,
        cases: [],
        total: 0,
        message: `No cases found for ${cameraId} on ${date}`,
        cameraId: cameraId,
        date: date
      });
    }
    
    const caseEntries = await fs.readdir(cameraPath, { withFileTypes: true });
    const caseFolders = caseEntries.filter(entry => entry.isDirectory());
    
    for (const caseFolder of caseFolders) {
      const eventId = caseFolder.name;
      const casePath = path.join(cameraPath, eventId);
      const verdictPath = path.join(casePath, 'verdict.json');
      
      try {
        // Check if verdict exists
        const hasVerdict = await checkPathAccess(verdictPath);
        let verdict = null;
        
        if (hasVerdict) {
          const verdictData = await fs.readFile(verdictPath, 'utf8');
          verdict = JSON.parse(verdictData);
        }
        
        // Get photos in the case folder
        const photos = [];
        const files = await fs.readdir(casePath);
        const imageFiles = files.filter(f => 
          /\.(jpg|jpeg|png|gif|bmp)$/i.test(f) && 
          !f.startsWith('.')
        );
        
        // Sort image files naturally
        imageFiles.sort((a, b) => {
          const aNum = parseInt(a.match(/(\d+)/)?.[1] || '0');
          const bNum = parseInt(b.match(/(\d+)/)?.[1] || '0');
          return aNum - bNum;
        });
        
        for (const filename of imageFiles) {
          try {
            const photoPath = path.join(casePath, filename);
            const photoStats = await fs.stat(photoPath);
            
            photos.push({
              filename: filename,
              size: photoStats.size,
              exists: true,
              url: `/api/violations/${cameraId}/${date}/${eventId}/${filename}`,
              thumbnailUrl: `/api/violations/${cameraId}/${date}/${eventId}/${filename}`,
              imageUrl: `/api/violations/${cameraId}/${date}/${eventId}/${filename}`
            });
          } catch (photoError) {
            console.warn(`⚠️ Could not stat photo ${filename}:`, photoError.message);
          }
        }
        
        cases.push({
          eventId: eventId,
          cameraId: cameraId,
          date: date,
          verdict: verdict,
          photos: photos,
          photoCount: photos.length,
          hasVerdict: hasVerdict,
          folderPath: casePath,
          isViolation: verdict ? verdict.decision === 'violation' : false,
          speed: verdict ? verdict.speed : null,
          speedLimit: verdict ? verdict.limit : null
        });
        
      } catch (caseError) {
        console.warn(`⚠️ Could not process case ${eventId}:`, caseError.message);
      }
    }
    
    // Sort by event timestamp if available, otherwise by eventId
    cases.sort((a, b) => {
      if (a.verdict && b.verdict && a.verdict.event_ts && b.verdict.event_ts) {
        return b.verdict.event_ts - a.verdict.event_ts;
      }
      return b.eventId.localeCompare(a.eventId);
    });
    
    console.log(`✅ Found ${cases.length} cases for ${cameraId} on ${date}`);
    
    res.json({
      success: true,
      cases: cases,
      total: cases.length,
      cameraId: cameraId,
      date: date,
      violations: cases.filter(c => c.isViolation).length,
      compliant: cases.filter(c => !c.isViolation && c.hasVerdict).length
    });
    
  } catch (error) {
    console.error('❌ Error getting cases:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      cases: []
    });
  }
});

// API endpoint to serve violation photos
app.get('/api/violations/:cameraId/:date/:eventId/:photoFilename', async (req, res) => {
  try {
    const { cameraId, date, eventId, photoFilename } = req.params;
    
    console.log(`🖼️ Serving violation photo: ${photoFilename} for event ${eventId}`);
    
    const photoPath = path.join(PROCESSING_INBOX_PATH, cameraId, date, eventId, photoFilename);
    
    const hasAccess = await checkPathAccess(photoPath);
    if (!hasAccess) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }
    
    const imageBuffer = await fs.readFile(photoPath);
    
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'X-Source': 'violation-folder'
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error(`❌ Error serving violation photo ${req.params.photoFilename}:`, error.message);
    res.status(404).json({
      success: false,
      error: `Photo not found: ${error.message}`
    });
  }
});

// Legacy API endpoint for backward compatibility
app.get('/api/ftp-images/list', async (req, res) => {
  try {
    const { camera = '192.168.1.54', date } = req.query;
    
    console.log(`📋 Legacy API: Listing images for camera: ${camera}, date: ${date || 'ALL'}`);
    
    // For backward compatibility, serve from legacy path
    let allImageFiles = [];
    
    if (date && date !== 'all') {
      const localPath = path.join(LOCAL_BASE_PATH, date, 'Common');
      const hasAccess = await checkPathAccess(localPath);
      if (hasAccess) {
        const files = await fs.readdir(localPath, { withFileTypes: true });
        allImageFiles = await processLegacyImageFiles(files, localPath, camera, date);
      }
    } else {
      const hasAccess = await checkPathAccess(LOCAL_BASE_PATH);
      if (hasAccess) {
        const baseDirs = await fs.readdir(LOCAL_BASE_PATH, { withFileTypes: true });
        const dateDirs = baseDirs.filter(d => d.isDirectory() && /\d{4}-\d{2}-\d{2}/.test(d.name));
        
        for (const dateDir of dateDirs) {
          const datePath = path.join(LOCAL_BASE_PATH, dateDir.name, 'Common');
          try {
            const hasDateAccess = await checkPathAccess(datePath);
            if (hasDateAccess) {
              const files = await fs.readdir(datePath, { withFileTypes: true });
              const dateImages = await processLegacyImageFiles(files, datePath, camera, dateDir.name);
              allImageFiles = allImageFiles.concat(dateImages);
            }
          } catch (dateError) {
            console.warn(`⚠️ Could not access date ${dateDir.name}:`, dateError.message);
          }
        }
      }
    }
    
    allImageFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    console.log(`🖼️ Total legacy images found: ${allImageFiles.length}`);
    
    res.json({
      success: true,
      files: allImageFiles,
      total: allImageFiles.length,
      source: 'legacy',
      dateFilter: date || 'all'
    });
    
  } catch (error) {
    console.error('❌ Error listing legacy files:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      files: []
    });
  }
});

// Helper function for legacy image processing
async function processLegacyImageFiles(files, dirPath, camera, date) {
  const imageFiles = [];
  
  for (const file of files) {
    if (file.isFile() && /\.(jpg|jpeg|png|gif|bmp)$/i.test(file.name)) {
      try {
        const filePath = path.join(dirPath, file.name);
        const stats = await fs.stat(filePath);
        
        imageFiles.push({
          filename: file.name,
          modified: stats.mtime.toISOString(),
          size: stats.size,
          date: date,
          url: `/api/ftp-images/camera001/${camera}/${date}/Common/${file.name}`,
          timestamp: stats.mtime.toISOString()
        });
      } catch (statError) {
        console.warn(`⚠️ Could not get stats for ${file.name}:`, statError.message);
      }
    }
  }
  
  return imageFiles;
}

// Legacy image serving endpoint
app.get('/api/ftp-images/camera001/:camera/:date/Common/:filename', async (req, res) => {
  try {
    const { camera, date, filename } = req.params;
    
    console.log(`🖼️ Serving legacy image: ${filename} for camera ${camera} on ${date}`);
    
    const localPath = path.join(LOCAL_BASE_PATH, date, 'Common', filename);
    
    const hasAccess = await checkPathAccess(localPath);
    if (!hasAccess) {
      throw new Error(`File not found or not accessible: ${filename}`);
    }
    
    const imageBuffer = await fs.readFile(localPath);
    
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    
    switch (ext) {
      case '.png': contentType = 'image/png'; break;
      case '.gif': contentType = 'image/gif'; break;
      case '.bmp': contentType = 'image/bmp'; break;
    }
    
    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'X-Source': 'legacy'
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error(`❌ Error serving legacy file ${req.params.filename}:`, error.message);
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
    message: 'Multi-Camera Image Server is running',
    timestamp: new Date().toISOString(),
    source: 'multi-camera',
    config: {
      processingInboxPath: PROCESSING_INBOX_PATH,
      cameraBasePath: CAMERA_BASE_PATH,
      legacyPath: LOCAL_BASE_PATH,
      port: PORT
    },
    endpoints: {
      cameras: '/api/ftp-images/cameras',
      dates: '/api/ftp-images/dates?camera=camera001',
      cases: '/api/ftp-images/cases/camera001/2025-10-06',
      violationPhoto: '/api/violations/camera001/2025-10-06/[eventId]/[filename]',
      // Legacy endpoints
      legacyDates: '/api/ftp-images/dates',
      legacyList: '/api/ftp-images/list?camera=192.168.1.54&date=2025-09-28',
      legacyImage: '/api/ftp-images/camera001/192.168.1.54/2025-09-28/Common/[filename]'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    source: 'multi-camera'
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Multi-Camera Image Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Processing inbox: ${PROCESSING_INBOX_PATH}`);
  console.log(`📁 Camera uploads: ${CAMERA_BASE_PATH}`);
  console.log('');
  console.log('🔍 Testing path access...');
  
  // Test path access on startup
  Promise.all([
    checkPathAccess(PROCESSING_INBOX_PATH),
    checkPathAccess(CAMERA_BASE_PATH),
    checkPathAccess(LOCAL_BASE_PATH)
  ]).then(([processingAccess, cameraAccess, legacyAccess]) => {
    console.log(`✅ Processing inbox accessible: ${processingAccess}`);
    console.log(`✅ Camera uploads accessible: ${cameraAccess}`);
    console.log(`✅ Legacy path accessible: ${legacyAccess}`);
    
    if (processingAccess) {
      fs.readdir(PROCESSING_INBOX_PATH, { withFileTypes: true })
        .then(dirs => {
          const cameraDirs = dirs.filter(d => d.isDirectory() && d.name.startsWith('camera'));
          console.log(`✅ Found ${cameraDirs.length} camera directories: ${cameraDirs.map(d => d.name).join(', ')}`);
        })
        .catch(err => console.warn('⚠️ Could not list camera directories:', err.message));
    }
  }).catch(err => console.error('❌ Path access test failed:', err.message));
});
