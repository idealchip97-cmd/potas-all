#!/usr/bin/env node
/**
 * AI-Enhanced FTP Server
 * Serves processed AI data from /srv/processing_inbox with CORS support
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const app = express();
const PORT = 3003;
const BASE_PATH = '/srv/processing_inbox';

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI-Enhanced FTP Server',
    timestamp: new Date().toISOString(),
    basePath: BASE_PATH
  });
});

// Get all available cameras
app.get('/api/cameras', async (req, res) => {
  try {
    const cameras = await fs.readdir(BASE_PATH);
    const cameraList = cameras.filter(item => item.startsWith('camera'));
    
    res.json({
      success: true,
      cameras: cameraList,
      count: cameraList.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get dates for a specific camera
app.get('/api/cameras/:camera/dates', async (req, res) => {
  try {
    const { camera } = req.params;
    const cameraPath = path.join(BASE_PATH, camera);
    
    if (!fsSync.existsSync(cameraPath)) {
      return res.status(404).json({
        success: false,
        error: 'Camera not found'
      });
    }
    
    const dates = await fs.readdir(cameraPath);
    const dateList = dates.filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item));
    
    res.json({
      success: true,
      camera,
      dates: dateList.sort(),
      count: dateList.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cases for a specific camera and date
app.get('/api/cameras/:camera/dates/:date/cases', async (req, res) => {
  try {
    const { camera, date } = req.params;
    const datePath = path.join(BASE_PATH, camera, date);
    
    if (!fsSync.existsSync(datePath)) {
      return res.status(404).json({
        success: false,
        error: 'Date not found'
      });
    }
    
    const cases = await fs.readdir(datePath);
    const caseList = cases.filter(item => item.startsWith('case'));
    
    // Get case details with AI processing status
    const caseDetails = await Promise.all(caseList.map(async (caseName) => {
      const casePath = path.join(datePath, caseName);
      const aiPath = path.join(casePath, 'ai');
      const resultsPath = path.join(aiPath, 'results');
      
      const hasAI = fsSync.existsSync(aiPath);
      let processed = false;
      let imageCount = 0;
      let platesDetected = 0;
      let processingMethod = null;
      
      if (hasAI && fsSync.existsSync(resultsPath)) {
        // Check for result files
        const resultFiles = ['simple_alpr_results.json', 'alpr_results.json'];
        
        for (const resultFile of resultFiles) {
          const resultPath = path.join(resultsPath, resultFile);
          if (fsSync.existsSync(resultPath)) {
            try {
              const data = await fs.readFile(resultPath, 'utf8');
              const results = JSON.parse(data);
              
              processed = true;
              imageCount = results.length;
              platesDetected = results.reduce((sum, r) => sum + (r.plates_detected || 0), 0);
              processingMethod = results[0]?.method || 'unknown';
              break;
            } catch (e) {
              console.error(`Error reading ${resultPath}:`, e.message);
            }
          }
        }
      }
      
      // Get image files count
      try {
        const files = await fs.readdir(casePath);
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|bmp|tiff)$/i.test(f));
        if (imageCount === 0) imageCount = imageFiles.length;
      } catch (e) {
        // Ignore error
      }
      
      return {
        name: caseName,
        path: casePath,
        hasAI,
        processed,
        imageCount,
        platesDetected,
        processingMethod
      };
    }));
    
    res.json({
      success: true,
      camera,
      date,
      cases: caseDetails,
      count: caseDetails.length,
      summary: {
        totalCases: caseDetails.length,
        aiEnabled: caseDetails.filter(c => c.hasAI).length,
        processed: caseDetails.filter(c => c.processed).length,
        totalImages: caseDetails.reduce((sum, c) => sum + c.imageCount, 0),
        totalPlates: caseDetails.reduce((sum, c) => sum + c.platesDetected, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get AI results for a specific case
app.get('/api/cameras/:camera/dates/:date/cases/:case/results', async (req, res) => {
  try {
    const { camera, date, case: caseName } = req.params;
    const casePath = path.join(BASE_PATH, camera, date, caseName);
    const resultsPath = path.join(casePath, 'ai', 'results');
    
    if (!fsSync.existsSync(resultsPath)) {
      return res.status(404).json({
        success: false,
        error: 'AI results not found'
      });
    }
    
    // Try to find result files
    const resultFiles = ['simple_alpr_results.json', 'alpr_results.json'];
    let results = null;
    let resultFile = null;
    
    for (const file of resultFiles) {
      const filePath = path.join(resultsPath, file);
      if (fsSync.existsSync(filePath)) {
        try {
          const data = await fs.readFile(filePath, 'utf8');
          results = JSON.parse(data);
          resultFile = file;
          break;
        } catch (e) {
          console.error(`Error reading ${filePath}:`, e.message);
        }
      }
    }
    
    if (!results) {
      return res.status(404).json({
        success: false,
        error: 'No valid AI results found'
      });
    }
    
    // Get summary file if exists
    let summary = null;
    const summaryPath = path.join(resultsPath, 'processing_summary.json');
    if (fsSync.existsSync(summaryPath)) {
      try {
        const summaryData = await fs.readFile(summaryPath, 'utf8');
        summary = JSON.parse(summaryData);
      } catch (e) {
        // Ignore summary errors
      }
    }
    
    res.json({
      success: true,
      camera,
      date,
      case: caseName,
      resultFile,
      results,
      summary,
      statistics: {
        totalImages: results.length,
        platesDetected: results.reduce((sum, r) => sum + (r.plates_detected || 0), 0),
        successfulDetections: results.filter(r => r.status === 'success').length,
        failedDetections: results.filter(r => r.status === 'error').length,
        noPlatesDetected: results.filter(r => r.status === 'no_plates_detected').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve processed images
app.get('/api/cameras/:camera/dates/:date/cases/:case/images/:image', async (req, res) => {
  try {
    const { camera, date, case: caseName, image } = req.params;
    
    // Try processed image first
    const processedPath = path.join(BASE_PATH, camera, date, caseName, 'ai', 'processed', image);
    if (fsSync.existsSync(processedPath)) {
      return res.sendFile(processedPath);
    }
    
    // Fall back to original image
    const originalPath = path.join(BASE_PATH, camera, date, caseName, image);
    if (fsSync.existsSync(originalPath)) {
      return res.sendFile(originalPath);
    }
    
    res.status(404).json({
      success: false,
      error: 'Image not found'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all violation cycles (processed cases with plates)
app.get('/api/ftp-images/violations-cycle', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const violations = [];
    
    // Scan all cameras
    const cameras = await fs.readdir(BASE_PATH);
    
    for (const camera of cameras.filter(c => c.startsWith('camera'))) {
      const cameraPath = path.join(BASE_PATH, camera);
      const dates = await fs.readdir(cameraPath);
      
      for (const date of dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
        const datePath = path.join(cameraPath, date);
        const cases = await fs.readdir(datePath);
        
        for (const caseName of cases.filter(c => c.startsWith('case'))) {
          const casePath = path.join(datePath, caseName);
          const resultsPath = path.join(casePath, 'ai', 'results', 'simple_alpr_results.json');
          
          if (fsSync.existsSync(resultsPath)) {
            try {
              const data = await fs.readFile(resultsPath, 'utf8');
              const results = JSON.parse(data);
              
              // Filter results with detected plates
              const platesFound = results.filter(r => r.plates_detected > 0);
              
              for (const result of platesFound) {
                violations.push({
                  id: `${camera}_${date}_${caseName}_${path.basename(result.image_path, path.extname(result.image_path))}`,
                  camera,
                  date,
                  case: caseName,
                  imagePath: result.image_path,
                  imageUrl: `/api/cameras/${camera}/dates/${date}/cases/${caseName}/images/${path.basename(result.image_path)}`,
                  platesDetected: result.plates_detected,
                  plates: result.plates,
                  confidence: result.confidence_scores || [],
                  processingMethod: result.method,
                  processedAt: result.processed_at,
                  status: result.status
                });
              }
            } catch (e) {
              console.error(`Error processing ${resultsPath}:`, e.message);
            }
          }
        }
      }
    }
    
    // Sort by processed date and limit
    violations.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
    const limitedViolations = violations.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      violations: limitedViolations,
      total: violations.length,
      limit: parseInt(limit),
      summary: {
        totalViolations: violations.length,
        totalPlates: violations.reduce((sum, v) => sum + v.platesDetected, 0),
        cameras: [...new Set(violations.map(v => v.camera))],
        dates: [...new Set(violations.map(v => v.date))]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Frontend compatibility endpoints
// Get images list (compatible with frontend expectations)
app.get('/api/ftp-images/list', async (req, res) => {
  try {
    const { camera = '192.168.1.54', date = 'all', limit = 50 } = req.query;
    const files = [];
    
    // Get all cameras
    const cameras = await fs.readdir(BASE_PATH);
    
    for (const cameraDir of cameras.filter(c => c.startsWith('camera'))) {
      const cameraPath = path.join(BASE_PATH, cameraDir);
      const dates = await fs.readdir(cameraPath);
      
      for (const dateDir of dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
        // Skip if specific date requested and doesn't match
        if (date !== 'all' && dateDir !== date) continue;
        
        const datePath = path.join(cameraPath, dateDir);
        const cases = await fs.readdir(datePath);
        
        for (const caseName of cases.filter(c => c.startsWith('case'))) {
          const casePath = path.join(datePath, caseName);
          
          // Get images from case directory
          const caseFiles = await fs.readdir(casePath);
          const imageFiles = caseFiles.filter(f => /\.(jpg|jpeg|png|bmp|tiff)$/i.test(f));
          
          for (const imageFile of imageFiles) {
            const imagePath = path.join(casePath, imageFile);
            const stats = await fs.stat(imagePath);
            
            files.push({
              filename: imageFile,
              modified: stats.mtime.toISOString(),
              size: stats.size,
              url: `/api/cameras/${cameraDir}/dates/${dateDir}/cases/${caseName}/images/${imageFile}`,
              camera: cameraDir,
              date: dateDir,
              case: caseName,
              timestamp: stats.mtime.toISOString()
            });
          }
        }
      }
    }
    
    // Sort by modification time, newest first
    files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    // Apply limit
    const limitedFiles = files.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      files: limitedFiles,
      total: limitedFiles.length,
      source: 'ai-ftp-server',
      debug: {
        totalFiles: files.length,
        imageFiles: limitedFiles.length,
        accessGranted: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      files: [],
      source: 'ai-ftp-server'
    });
  }
});

// Get available dates (compatible with frontend expectations)
app.get('/api/ftp-images/dates', async (req, res) => {
  try {
    const allDates = new Set();
    
    // Get all cameras
    const cameras = await fs.readdir(BASE_PATH);
    
    for (const cameraDir of cameras.filter(c => c.startsWith('camera'))) {
      const cameraPath = path.join(BASE_PATH, cameraDir);
      const dates = await fs.readdir(cameraPath);
      
      for (const dateDir of dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
        allDates.add(dateDir);
      }
    }
    
    const dateList = Array.from(allDates).map(date => ({
      date: date,
      modified: new Date().toISOString()
    })).sort((a, b) => b.date.localeCompare(a.date));
    
    res.json({
      success: true,
      dates: dateList,
      total: dateList.length,
      source: 'ai-ftp-server'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      dates: [],
      source: 'ai-ftp-server'
    });
  }
});

// Get summary of all AI processing
app.get('/api/ftp-images/summary', async (req, res) => {
  try {
    const summary = {
      cameras: 0,
      dates: 0,
      totalCases: 0,
      aiEnabledCases: 0,
      processedCases: 0,
      totalImages: 0,
      totalPlates: 0,
      processingMethods: {}
    };
    
    const cameras = await fs.readdir(BASE_PATH);
    const cameraList = cameras.filter(c => c.startsWith('camera'));
    summary.cameras = cameraList.length;
    
    const allDates = new Set();
    
    for (const camera of cameraList) {
      const cameraPath = path.join(BASE_PATH, camera);
      const dates = await fs.readdir(cameraPath);
      
      for (const date of dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
        allDates.add(date);
        const datePath = path.join(cameraPath, date);
        const cases = await fs.readdir(datePath);
        
        for (const caseName of cases.filter(c => c.startsWith('case'))) {
          summary.totalCases++;
          
          const casePath = path.join(datePath, caseName);
          const aiPath = path.join(casePath, 'ai');
          
          if (fsSync.existsSync(aiPath)) {
            summary.aiEnabledCases++;
            
            const resultsPath = path.join(aiPath, 'results', 'simple_alpr_results.json');
            if (fsSync.existsSync(resultsPath)) {
              try {
                const data = await fs.readFile(resultsPath, 'utf8');
                const results = JSON.parse(data);
                
                summary.processedCases++;
                summary.totalImages += results.length;
                summary.totalPlates += results.reduce((sum, r) => sum + (r.plates_detected || 0), 0);
                
                const method = results[0]?.method || 'unknown';
                summary.processingMethods[method] = (summary.processingMethods[method] || 0) + 1;
              } catch (e) {
                // Ignore errors
              }
            }
          }
        }
      }
    }
    
    summary.dates = allDates.size;
    
    res.json({
      success: true,
      summary,
      averagePlatesPerImage: summary.totalImages > 0 ? (summary.totalPlates / summary.totalImages).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 AI-Enhanced FTP Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Serving AI data from: ${BASE_PATH}`);
  console.log(`🔗 API endpoints:`);
  console.log(`   • GET /api/cameras - List all cameras`);
  console.log(`   • GET /api/cameras/:camera/dates - List dates for camera`);
  console.log(`   • GET /api/cameras/:camera/dates/:date/cases - List cases`);
  console.log(`   • GET /api/ftp-images/violations-cycle - Get violations with plates`);
  console.log(`   • GET /api/ftp-images/summary - Get processing summary`);
});
