const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const nodemailer = require('nodemailer');

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
const PROCESSING_INBOX_PATH = process.env.NODE_ENV === 'test' ? 
  require('path').join(__dirname, 'processing_inbox_test') : 
  '/srv/processing_inbox'; // New 3-photo violation folders
const BACKEND_API_URL = 'http://localhost:3000/api';

// Email Configuration
const ADMIN_EMAIL = 'ahmedalhloul@idealchip.com'; // Receiver email
const EMAIL_CONFIG = {
  host: 'mail.idealchip.com', // A2 Hosting SMTP server
  port: 465, // SSL port as shown in cPanel
  secure: true, // true for 465 SSL
  auth: {
    user: process.env.EMAIL_USER || 'fines@idealchip.com', // Sender email account
    pass: process.env.EMAIL_PASS || 'idealchip123'  // Sender email password
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates if needed
  }
};

// Create email transporter
let emailTransporter = null;
try {
  emailTransporter = nodemailer.createTransport(EMAIL_CONFIG);
  console.log('📧 Email service initialized');
} catch (error) {
  console.warn('⚠️ Email service not available:', error.message);
}

// Track processed cases to avoid duplicate notifications
const processedCases = new Set();
const PROCESSED_CASES_FILE = path.join(__dirname, 'processed_cases.json');

// Load previously processed cases from file
async function loadProcessedCases() {
  try {
    const data = await fs.readFile(PROCESSED_CASES_FILE, 'utf8');
    const cases = JSON.parse(data);
    cases.forEach(caseKey => processedCases.add(caseKey));
    console.log(`📋 Loaded ${processedCases.size} previously processed cases`);
  } catch (error) {
    console.log('📋 No previous processed cases file found - starting fresh');
  }
}

// Save processed cases to file
async function saveProcessedCases() {
  try {
    const cases = Array.from(processedCases);
    await fs.writeFile(PROCESSED_CASES_FILE, JSON.stringify(cases, null, 2));
  } catch (error) {
    console.warn('⚠️ Could not save processed cases:', error.message);
  }
}

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

// EMAIL NOTIFICATION SYSTEM

// Send email notification for new violation case
async function sendViolationNotification(cameraId, date, caseData) {
  if (!emailTransporter) {
    console.warn('⚠️ Email service not available - skipping notification');
    return false;
  }

  try {
    const { eventId, verdict, photos, folderPath } = caseData;
    
    // Create unique case identifier
    const caseKey = `${cameraId}_${date}_${eventId}`;
    
    // Check if we already sent notification for this case
    if (processedCases.has(caseKey)) {
      console.log(`📧 Notification already sent for ${caseKey}`);
      return false;
    }
    
    // Format timestamp
    const eventTime = new Date(verdict.event_ts * 1000);
    const formattedTime = eventTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    // Determine violation severity
    const speedOver = verdict.speed - verdict.limit;
    let severity = 'Minor';
    if (speedOver >= 20) severity = 'Severe';
    else if (speedOver >= 10) severity = 'Major';
    
    // Create email content
    const subject = `🚨 NEW VIOLATION DETECTED - ${cameraId.toUpperCase()} - ${severity} (${verdict.speed} km/h)`;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ff4444, #cc0000); color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .alert-badge { display: inline-block; background-color: #ff4444; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; margin-bottom: 15px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .info-item { background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
            .info-label { font-weight: bold; color: #495057; font-size: 12px; text-transform: uppercase; }
            .info-value { font-size: 16px; color: #212529; margin-top: 5px; }
            .speed-alert { background: linear-gradient(135deg, #ff6b6b, #ee5a52); color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .photos-section { margin-top: 20px; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; color: #6c757d; font-size: 12px; }
            .timestamp { background-color: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 SPEED VIOLATION DETECTED</h1>
                <p>Radar Speed Detection System Alert</p>
            </div>
            
            <div class="content">
                <div class="alert-badge">${severity} Violation</div>
                
                <div class="speed-alert">
                    <h2>⚡ ${verdict.speed} km/h in ${verdict.limit} km/h zone</h2>
                    <p>Speed exceeded by ${speedOver} km/h</p>
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">📹 Camera</div>
                        <div class="info-value">${cameraId.toUpperCase()}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">📅 Date</div>
                        <div class="info-value">${date}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">🆔 Case ID</div>
                        <div class="info-value">${eventId}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">🌐 Source IP</div>
                        <div class="info-value">${verdict.src_ip}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">⚡ Speed Detected</div>
                        <div class="info-value">${verdict.speed} km/h</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">🚦 Speed Limit</div>
                        <div class="info-value">${verdict.limit} km/h</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">📊 Violation Level</div>
                        <div class="info-value">${severity}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">📸 Photos Captured</div>
                        <div class="info-value">${photos.length} photos</div>
                    </div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">⏰ Event Timestamp</div>
                    <div class="timestamp">${formattedTime}</div>
                </div>
                
                <div class="photos-section">
                    <h3>📸 Evidence Photos (${photos.length} attached)</h3>
                    <p><strong>📎 Attached Files:</strong></p>
                    <ul style="list-style-type: none; padding: 0;">
                        ${photos.map((photo, index) => `
                            <li style="background-color: #f8f9fa; margin: 5px 0; padding: 8px; border-radius: 4px; border-left: 3px solid #28a745;">
                                📷 <strong>${photo.filename}</strong> 
                                <span style="color: #6c757d; font-size: 12px;">(${(photo.size / 1024).toFixed(1)} KB)</span>
                            </li>
                        `).join('')}
                    </ul>
                    <p style="background-color: #d4edda; padding: 10px; border-radius: 5px; border-left: 4px solid #28a745;">
                        <strong>📎 All violation photos are attached to this email for immediate review.</strong>
                    </p>
                    <p><strong>Folder Location:</strong> ${folderPath}</p>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background-color: #d1ecf1; border-radius: 5px; border-left: 4px solid #bee5eb;">
                    <strong>📋 Next Steps:</strong>
                    <ul>
                        <li>Review violation evidence in the monitoring system</li>
                        <li>Verify vehicle identification and speed measurement</li>
                        <li>Process violation according to traffic regulations</li>
                        <li>Archive case data for record keeping</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>🤖 This is an automated notification from the Radar Speed Detection System</p>
                <p>Generated on ${new Date().toLocaleString()}</p>
                <p>System: Potassium Radar Monitoring Platform</p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    // Prepare photo attachments
    const attachments = [];
    let totalAttachmentSize = 0;
    const maxAttachmentSize = 25 * 1024 * 1024; // 25MB limit for most email providers
    
    for (const photo of photos) {
      if (photo.exists && photo.path) {
        // Check if adding this photo would exceed size limit
        if (totalAttachmentSize + photo.size < maxAttachmentSize) {
          attachments.push({
            filename: photo.filename,
            path: photo.path,
            cid: photo.filename.replace('.jpg', '') // Content ID for inline images
          });
          totalAttachmentSize += photo.size;
        } else {
          console.warn(`⚠️ Skipping photo ${photo.filename} - would exceed email size limit`);
          break;
        }
      }
    }
    
    console.log(`📎 Attaching ${attachments.length} photos (${(totalAttachmentSize / 1024 / 1024).toFixed(2)} MB)`);
    
    // Send email with attachments
    const mailOptions = {
      from: `"Radar Speed System" <${EMAIL_CONFIG.auth.user}>`,
      to: ADMIN_EMAIL,
      subject: subject,
      html: htmlContent,
      attachments: attachments,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };
    
    const info = await emailTransporter.sendMail(mailOptions);
    
    // Mark case as processed
    processedCases.add(caseKey);
    
    // Save to persistent storage
    await saveProcessedCases();
    
    console.log(`📧 ✅ Violation notification sent for ${caseKey}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    
    return true;
    
  } catch (error) {
    console.error('📧 ❌ Failed to send violation notification:', error);
    return false;
  }
}

// Check for new violation cases and send notifications
async function checkForNewViolations() {
  try {
    console.log('🔍 Checking for new violations...');
    
    // Get all cameras
    const cameraEntries = await fs.readdir(PROCESSING_INBOX_PATH, { withFileTypes: true });
    const cameraFolders = cameraEntries.filter(entry => 
      entry.isDirectory() && entry.name.startsWith('camera')
    );
    
    for (const cameraFolder of cameraFolders) {
      const cameraId = cameraFolder.name;
      const cameraPath = path.join(PROCESSING_INBOX_PATH, cameraId);
      
      try {
        const dateEntries = await fs.readdir(cameraPath, { withFileTypes: true });
        const dateFolders = dateEntries.filter(entry => 
          entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
        );
        
        for (const dateFolder of dateFolders) {
          const date = dateFolder.name;
          const datePath = path.join(cameraPath, date);
          
          try {
            const caseEntries = await fs.readdir(datePath, { withFileTypes: true });
            const caseFolders = caseEntries.filter(entry => entry.isDirectory());
            
            for (const caseFolder of caseFolders) {
              const eventId = caseFolder.name;
              const casePath = path.join(datePath, eventId);
              const verdictPath = path.join(casePath, 'verdict.json');
              
              // Check if case has verdict.json and we haven't processed it yet
              const caseKey = `${cameraId}_${date}_${eventId}`;
              
              try {
                await fs.access(verdictPath);
                
                if (!processedCases.has(caseKey)) {
                  // Read verdict data
                  const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
                  
                  // Only send notification for violations (not compliant cases)
                  if (verdictData.decision === 'violation') {
                    // Get photos list with full paths
                    const photoFiles = await fs.readdir(casePath);
                    const photos = [];
                    
                    for (const filename of photoFiles) {
                      if (filename.toLowerCase().endsWith('.jpg')) {
                        const photoPath = path.join(casePath, filename);
                        try {
                          const photoStats = await fs.stat(photoPath);
                          photos.push({
                            filename,
                            path: photoPath,
                            size: photoStats.size,
                            exists: true
                          });
                        } catch (err) {
                          console.warn(`⚠️ Could not access photo ${filename}:`, err.message);
                        }
                      }
                    }
                    
                    const caseData = {
                      eventId,
                      verdict: verdictData,
                      photos,
                      folderPath: casePath
                    };
                    
                    // Send notification
                    await sendViolationNotification(cameraId, date, caseData);
                  } else {
                    // Mark compliant cases as processed without sending email
                    processedCases.add(caseKey);
                    await saveProcessedCases();
                  }
                }
              } catch (err) {
                // Case doesn't have verdict.json or other error - skip
              }
            }
          } catch (err) {
            console.warn(`⚠️ Could not read date folder ${date}:`, err.message);
          }
        }
      } catch (err) {
        console.warn(`⚠️ Could not read camera folder ${cameraId}:`, err.message);
      }
    }
  } catch (error) {
    console.error('❌ Error checking for new violations:', error);
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

// NEW API ENDPOINTS FOR 3-PHOTO VIOLATION SYSTEM

// API endpoint to list violation folders for a camera and date
app.get('/api/violations/:cameraId/:date', async (req, res) => {
  try {
    const { cameraId, date } = req.params;
    console.log(`📁 Listing violations for ${cameraId} on ${date}`);
    
    const violationPath = path.join(PROCESSING_INBOX_PATH, cameraId, date);
    
    const hasAccess = await checkPathAccess(violationPath);
    if (!hasAccess) {
      return res.json({
        success: true,
        violations: [],
        total: 0,
        message: `No violations found for ${cameraId} on ${date}`
      });
    }
    
    const folders = await fs.readdir(violationPath, { withFileTypes: true });
    const violations = [];
    
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const eventPath = path.join(violationPath, folder.name);
        const verdictPath = path.join(eventPath, 'verdict.json');
        
        try {
          const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
          
          // Check for photos - scan all available photos in the folder
          const photos = [];
          
          try {
            // Get all files in the event folder
            const files = await fs.readdir(eventPath);
            
            // Filter for image files (excluding verdict.json and metadata files)
            const imageFiles = files.filter(f => 
              /\.(jpg|jpeg|png|gif|bmp)$/i.test(f) && 
              f !== 'metadata.json' && 
              !f.startsWith('.')
            );
            
            // Sort image files naturally (1.jpg, 2.jpg, etc.)
            imageFiles.sort((a, b) => {
              const aNum = parseInt(a.match(/(\d+)/)?.[1] || '0');
              const bNum = parseInt(b.match(/(\d+)/)?.[1] || '0');
              return aNum - bNum;
            });
            
            console.log(`📸 Found ${imageFiles.length} photos in ${folder.name}: ${imageFiles.join(', ')}`);
            
            // Process all found image files
            for (const filename of imageFiles) {
              try {
                const photoPath = path.join(eventPath, filename);
                const photoStats = await fs.stat(photoPath);
                
                photos.push({
                  filename: filename,
                  size: photoStats.size,
                  exists: true,
                  url: `/api/violations/${cameraId}/${date}/${folder.name}/${filename}`
                });
              } catch (photoError) {
                console.warn(`⚠️ Could not stat photo ${filename}:`, photoError.message);
              }
            }
            
            // If no photos found, add placeholder entries for backward compatibility
            if (photos.length === 0) {
              for (let i = 1; i <= 3; i++) {
                photos.push({
                  filename: `photo_${i}.jpg`,
                  size: 0,
                  exists: false,
                  url: null
                });
              }
            }
            
          } catch (dirError) {
            console.warn(`⚠️ Could not read directory ${eventPath}:`, dirError.message);
            // Fallback to placeholder photos
            for (let i = 1; i <= 3; i++) {
              photos.push({
                filename: `photo_${i}.jpg`,
                size: 0,
                exists: false,
                url: null
              });
            }
          }
          
          violations.push({
            eventId: folder.name,
            verdict: verdictData,
            photos: photos,
            folderPath: eventPath
          });
        } catch (verdictError) {
          console.warn(`⚠️ Could not read verdict for ${folder.name}:`, verdictError.message);
        }
      }
    }
    
    // Sort by event timestamp
    violations.sort((a, b) => b.verdict.event_ts - a.verdict.event_ts);
    
    console.log(`✅ Found ${violations.length} violations for ${cameraId} on ${date}`);
    
    res.json({
      success: true,
      violations: violations,
      total: violations.length,
      cameraId: cameraId,
      date: date
    });
    
  } catch (error) {
    console.error('❌ Error listing violations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      violations: []
    });
  }
});

// API endpoint to get specific violation details
app.get('/api/violations/:cameraId/:date/:eventId', async (req, res) => {
  try {
    const { cameraId, date, eventId } = req.params;
    console.log(`📄 Getting violation details: ${eventId}`);
    
    const eventPath = path.join(PROCESSING_INBOX_PATH, cameraId, date, eventId);
    const verdictPath = path.join(eventPath, 'verdict.json');
    
    const hasAccess = await checkPathAccess(verdictPath);
    if (!hasAccess) {
      return res.status(404).json({
        success: false,
        error: 'Violation not found'
      });
    }
    
    const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
    
    // Get photo details - scan all available photos in the folder
    const photos = [];
    
    try {
      // Get all files in the event folder
      const files = await fs.readdir(eventPath);
      
      // Filter for image files (excluding verdict.json and metadata files)
      const imageFiles = files.filter(f => 
        /\.(jpg|jpeg|png|gif|bmp)$/i.test(f) && 
        f !== 'metadata.json' && 
        !f.startsWith('.')
      );
      
      // Sort image files naturally (1.jpg, 2.jpg, etc.)
      imageFiles.sort((a, b) => {
        const aNum = parseInt(a.match(/(\d+)/)?.[1] || '0');
        const bNum = parseInt(b.match(/(\d+)/)?.[1] || '0');
        return aNum - bNum;
      });
      
      console.log(`📸 Found ${imageFiles.length} photos in ${eventId}: ${imageFiles.join(', ')}`);
      
      // Process all found image files
      for (const filename of imageFiles) {
        try {
          const photoPath = path.join(eventPath, filename);
          const photoStats = await fs.stat(photoPath);
          
          photos.push({
            filename: filename,
            size: photoStats.size,
            exists: true,
            url: `/api/violations/${cameraId}/${date}/${eventId}/${filename}`,
            path: photoPath
          });
        } catch (photoError) {
          console.warn(`⚠️ Could not stat photo ${filename}:`, photoError.message);
        }
      }
      
      // If no photos found, add placeholder entries for backward compatibility
      if (photos.length === 0) {
        for (let i = 1; i <= 3; i++) {
          photos.push({
            filename: `photo_${i}.jpg`,
            size: 0,
            exists: false,
            url: null,
            path: path.join(eventPath, `photo_${i}.jpg`)
          });
        }
      }
      
    } catch (dirError) {
      console.warn(`⚠️ Could not read directory ${eventPath}:`, dirError.message);
      // Fallback to placeholder photos
      for (let i = 1; i <= 3; i++) {
        photos.push({
          filename: `photo_${i}.jpg`,
          size: 0,
          exists: false,
          url: null,
          path: path.join(eventPath, `photo_${i}.jpg`)
        });
      }
    }
    
    res.json({
      success: true,
      eventId: eventId,
      verdict: verdictData,
      photos: photos,
      folderPath: eventPath
    });
    
  } catch (error) {
    console.error('❌ Error getting violation details:', error);
    res.status(500).json({
      success: false,
      error: error.message
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

// API endpoint to get violation statistics (with date)
app.get('/api/violations/stats/:date', async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`📊 Getting violation stats for ${date}`);
    
    const cameras = ['camera001', 'camera002', 'camera003'];
    let totalViolations = 0;
    let cameraStats = {};
    
    for (const cameraId of cameras) {
      const cameraPath = path.join(PROCESSING_INBOX_PATH, cameraId, date);
      
      try {
        const hasAccess = await checkPathAccess(cameraPath);
        if (hasAccess) {
          const folders = await fs.readdir(cameraPath, { withFileTypes: true });
          const violationCount = folders.filter(f => f.isDirectory()).length;
          
          cameraStats[cameraId] = violationCount;
          totalViolations += violationCount;
        } else {
          cameraStats[cameraId] = 0;
        }
      } catch (error) {
        cameraStats[cameraId] = 0;
      }
    }
    
    res.json({
      success: true,
      date: date,
      totalViolations: totalViolations,
      cameraStats: cameraStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting violation stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to get violation statistics (today by default)
app.get('/api/violations/stats', async (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    console.log(`📊 Getting violation stats for today: ${date}`);
    
    const cameras = ['camera001', 'camera002', 'camera003'];
    let totalViolations = 0;
    let cameraStats = {};
    
    for (const cameraId of cameras) {
      const cameraPath = path.join(PROCESSING_INBOX_PATH, cameraId, date);
      
      try {
        const hasAccess = await checkPathAccess(cameraPath);
        if (hasAccess) {
          const folders = await fs.readdir(cameraPath, { withFileTypes: true });
          const violationCount = folders.filter(f => f.isDirectory()).length;
          
          cameraStats[cameraId] = violationCount;
          totalViolations += violationCount;
        } else {
          cameraStats[cameraId] = 0;
        }
      } catch (error) {
        cameraStats[cameraId] = 0;
      }
    }
    
    res.json({
      success: true,
      date: date,
      totalViolations: totalViolations,
      cameraStats: cameraStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting violation stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DYNAMIC DISCOVERY ENDPOINTS

// API endpoint to discover available cameras
app.get('/api/discover/cameras', async (req, res) => {
  try {
    console.log('🔍 Discovering available cameras...');
    
    const cameras = [];
    
    try {
      const entries = await fs.readdir(PROCESSING_INBOX_PATH, { withFileTypes: true });
      const cameraFolders = entries.filter(entry => 
        entry.isDirectory() && entry.name.startsWith('camera')
      );
      
      for (const folder of cameraFolders) {
        cameras.push(folder.name);
      }
      
      console.log(`✅ Found ${cameras.length} cameras: ${cameras.join(', ')}`);
    } catch (error) {
      console.warn('⚠️ Could not read processing inbox:', error.message);
    }
    
    // Sort cameras naturally (camera001, camera002, etc.)
    cameras.sort((a, b) => {
      const numA = parseInt(a.replace('camera', ''));
      const numB = parseInt(b.replace('camera', ''));
      return numA - numB;
    });
    
    res.json({
      success: true,
      cameras: cameras,
      count: cameras.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error discovering cameras:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to discover cameras',
      message: error.message
    });
  }
});

// API endpoint to discover available dates for a camera
app.get('/api/discover/dates/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;
    console.log(`🔍 Discovering available dates for ${cameraId}...`);
    
    const dates = [];
    const cameraPath = path.join(PROCESSING_INBOX_PATH, cameraId);
    
    try {
      const entries = await fs.readdir(cameraPath, { withFileTypes: true });
      const dateFolders = entries.filter(entry => 
        entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
      );
      
      for (const folder of dateFolders) {
        // Check if the date folder has any violation cases
        const datePath = path.join(cameraPath, folder.name);
        try {
          const caseEntries = await fs.readdir(datePath, { withFileTypes: true });
          const caseFolders = caseEntries.filter(entry => entry.isDirectory());
          
          if (caseFolders.length > 0) {
            dates.push({
              date: folder.name,
              caseCount: caseFolders.length
            });
          }
        } catch (err) {
          console.warn(`⚠️ Could not read date folder ${folder.name}:`, err.message);
        }
      }
      
      console.log(`✅ Found ${dates.length} dates with data for ${cameraId}`);
    } catch (error) {
      console.warn(`⚠️ Could not read camera folder ${cameraId}:`, error.message);
    }
    
    // Sort dates (newest first)
    dates.sort((a, b) => b.date.localeCompare(a.date));
    
    res.json({
      success: true,
      cameraId: cameraId,
      dates: dates,
      count: dates.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error discovering dates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to discover dates',
      message: error.message
    });
  }
});

// API endpoint to discover all available dates across all cameras
app.get('/api/discover/dates', async (req, res) => {
  try {
    console.log('🔍 Discovering all available dates across cameras...');
    
    const allDates = new Set();
    const cameraDateMap = {};
    
    try {
      const cameraEntries = await fs.readdir(PROCESSING_INBOX_PATH, { withFileTypes: true });
      const cameraFolders = cameraEntries.filter(entry => 
        entry.isDirectory() && entry.name.startsWith('camera')
      );
      
      for (const cameraFolder of cameraFolders) {
        const cameraId = cameraFolder.name;
        const cameraPath = path.join(PROCESSING_INBOX_PATH, cameraId);
        cameraDateMap[cameraId] = [];
        
        try {
          const dateEntries = await fs.readdir(cameraPath, { withFileTypes: true });
          const dateFolders = dateEntries.filter(entry => 
            entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
          );
          
          for (const dateFolder of dateFolders) {
            const datePath = path.join(cameraPath, dateFolder.name);
            try {
              const caseEntries = await fs.readdir(datePath, { withFileTypes: true });
              const caseFolders = caseEntries.filter(entry => entry.isDirectory());
              
              if (caseFolders.length > 0) {
                allDates.add(dateFolder.name);
                cameraDateMap[cameraId].push({
                  date: dateFolder.name,
                  caseCount: caseFolders.length
                });
              }
            } catch (err) {
              console.warn(`⚠️ Could not read date folder ${dateFolder.name}:`, err.message);
            }
          }
        } catch (err) {
          console.warn(`⚠️ Could not read camera folder ${cameraId}:`, err.message);
        }
      }
      
      console.log(`✅ Found ${allDates.size} unique dates across ${cameraFolders.length} cameras`);
    } catch (error) {
      console.warn('⚠️ Could not read processing inbox:', error.message);
    }
    
    // Convert Set to sorted array (newest first)
    const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));
    
    res.json({
      success: true,
      dates: sortedDates,
      count: sortedDates.length,
      cameraDateMap: cameraDateMap,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error discovering all dates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to discover dates',
      message: error.message
    });
  }
});

// API endpoint to discover available case IDs for a camera and date
app.get('/api/discover/cases/:cameraId/:date', async (req, res) => {
  try {
    const { cameraId, date } = req.params;
    console.log(`🔍 Discovering case IDs for ${cameraId} on ${date}...`);
    
    const cases = [];
    const cameraDatePath = path.join(PROCESSING_INBOX_PATH, cameraId, date);
    
    try {
      const entries = await fs.readdir(cameraDatePath, { withFileTypes: true });
      const caseFolders = entries.filter(entry => entry.isDirectory());
      
      for (const folder of caseFolders) {
        // Check if folder has verdict.json
        const verdictPath = path.join(cameraDatePath, folder.name, 'verdict.json');
        try {
          await fs.access(verdictPath);
          cases.push(folder.name);
        } catch (err) {
          console.warn(`⚠️ Case ${folder.name} missing verdict.json`);
        }
      }
      
      console.log(`✅ Found ${cases.length} valid cases for ${cameraId} on ${date}`);
    } catch (error) {
      console.warn(`⚠️ Could not read camera/date folder:`, error.message);
    }
    
    // Sort cases naturally (case001, case002, etc.)
    cases.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''));
      const numB = parseInt(b.replace(/\D/g, ''));
      return numA - numB;
    });
    
    res.json({
      success: true,
      cameraId: cameraId,
      date: date,
      cases: cases,
      count: cases.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error discovering cases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to discover cases',
      message: error.message
    });
  }
});

// VIOLATION API ENDPOINTS (3-PHOTO SYSTEM)

// API endpoint to list violation folders for a camera and date
app.get('/api/violations/:cameraId/:date', async (req, res) => {
  try {
    const { cameraId, date } = req.params;
    console.log(`📁 Listing violations for ${cameraId} on ${date}`);
    
    const violationPath = path.join(PROCESSING_INBOX_PATH, cameraId, date);
    
    const hasAccess = await checkPathAccess(violationPath);
    if (!hasAccess) {
      return res.json({
        success: true,
        violations: [],
        total: 0,
        message: `No violations found for ${cameraId} on ${date}`
      });
    }
    
    const folders = await fs.readdir(violationPath, { withFileTypes: true });
    const violations = [];
    
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const eventPath = path.join(violationPath, folder.name);
        const verdictPath = path.join(eventPath, 'verdict.json');
        
        try {
          const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
          
          // Check for photos - scan all available photos in the folder
          const photos = [];
          
          try {
            // Get all files in the event folder
            const files = await fs.readdir(eventPath);
            
            // Filter for image files (excluding verdict.json and metadata files)
            const imageFiles = files.filter(f => 
              /\.(jpg|jpeg|png|gif|bmp)$/i.test(f) && 
              f !== 'metadata.json' && 
              !f.startsWith('.')
            );
            
            // Sort image files naturally (1.jpg, 2.jpg, etc.)
            imageFiles.sort((a, b) => {
              const aNum = parseInt(a.match(/(\d+)/)?.[1] || '0');
              const bNum = parseInt(b.match(/(\d+)/)?.[1] || '0');
              return aNum - bNum;
            });
            
            console.log(`📸 Found ${imageFiles.length} photos in ${folder.name}: ${imageFiles.join(', ')}`);
            
            // Process all found image files
            for (const filename of imageFiles) {
              try {
                const photoPath = path.join(eventPath, filename);
                const photoStats = await fs.stat(photoPath);
                
                photos.push({
                  filename: filename,
                  size: photoStats.size,
                  exists: true,
                  url: `/api/violations/${cameraId}/${date}/${folder.name}/${filename}`
                });
              } catch (photoError) {
                console.warn(`⚠️ Could not stat photo ${filename}:`, photoError.message);
              }
            }
            
            // If no photos found, add placeholder entries for backward compatibility
            if (photos.length === 0) {
              for (let i = 1; i <= 3; i++) {
                photos.push({
                  filename: `photo_${i}.jpg`,
                  size: 0,
                  exists: false,
                  url: null
                });
              }
            }
            
          } catch (dirError) {
            console.warn(`⚠️ Could not read directory ${eventPath}:`, dirError.message);
            // Fallback to placeholder photos
            for (let i = 1; i <= 3; i++) {
              photos.push({
                filename: `photo_${i}.jpg`,
                size: 0,
                exists: false,
                url: null
              });
            }
          }
          
          violations.push({
            eventId: folder.name,
            verdict: verdictData,
            photos: photos,
            folderPath: eventPath
          });
        } catch (verdictError) {
          console.warn(`⚠️ Could not read verdict for ${folder.name}:`, verdictError.message);
        }
      }
    }
    
    // Sort by event timestamp
    violations.sort((a, b) => b.verdict.event_ts - a.verdict.event_ts);
    
    console.log(`✅ Found ${violations.length} violations for ${cameraId} on ${date}`);
    
    res.json({
      success: true,
      violations: violations,
      total: violations.length,
      cameraId: cameraId,
      date: date
    });
    
  } catch (error) {
    console.error('❌ Error listing violations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      violations: []
    });
  }
});

// API endpoint to get specific violation details
app.get('/api/violations/:cameraId/:date/:eventId', async (req, res) => {
  try {
    const { cameraId, date, eventId } = req.params;
    console.log(`📄 Getting violation details: ${eventId}`);
    
    const eventPath = path.join(PROCESSING_INBOX_PATH, cameraId, date, eventId);
    const verdictPath = path.join(eventPath, 'verdict.json');
    
    const hasAccess = await checkPathAccess(verdictPath);
    if (!hasAccess) {
      return res.status(404).json({
        success: false,
        error: 'Violation not found'
      });
    }
    
    const verdictData = JSON.parse(await fs.readFile(verdictPath, 'utf8'));
    
    // Get photo details - scan all available photos in the folder
    const photos = [];
    
    try {
      // Get all files in the event folder
      const files = await fs.readdir(eventPath);
      
      // Filter for image files (excluding verdict.json and metadata files)
      const imageFiles = files.filter(f => 
        /\.(jpg|jpeg|png|gif|bmp)$/i.test(f) && 
        f !== 'metadata.json' && 
        !f.startsWith('.')
      );
      
      // Sort image files naturally (1.jpg, 2.jpg, etc.)
      imageFiles.sort((a, b) => {
        const aNum = parseInt(a.match(/(\d+)/)?.[1] || '0');
        const bNum = parseInt(b.match(/(\d+)/)?.[1] || '0');
        return aNum - bNum;
      });
      
      console.log(`📸 Found ${imageFiles.length} photos in ${eventId}: ${imageFiles.join(', ')}`);
      
      // Process all found image files
      for (const filename of imageFiles) {
        try {
          const photoPath = path.join(eventPath, filename);
          const photoStats = await fs.stat(photoPath);
          
          photos.push({
            filename: filename,
            size: photoStats.size,
            exists: true,
            url: `/api/violations/${cameraId}/${date}/${eventId}/${filename}`,
            path: photoPath
          });
        } catch (photoError) {
          console.warn(`⚠️ Could not stat photo ${filename}:`, photoError.message);
        }
      }
      
      // If no photos found, add placeholder entries for backward compatibility
      if (photos.length === 0) {
        for (let i = 1; i <= 3; i++) {
          photos.push({
            filename: `photo_${i}.jpg`,
            size: 0,
            exists: false,
            url: null,
            path: path.join(eventPath, `photo_${i}.jpg`)
          });
        }
      }
      
    } catch (dirError) {
      console.warn(`⚠️ Could not read directory ${eventPath}:`, dirError.message);
      // Fallback to placeholder photos
      for (let i = 1; i <= 3; i++) {
        photos.push({
          filename: `photo_${i}.jpg`,
          size: 0,
          exists: false,
          url: null,
          path: path.join(eventPath, `photo_${i}.jpg`)
        });
      }
    }
    
    res.json({
      success: true,
      eventId: eventId,
      verdict: verdictData,
      photos: photos,
      folderPath: eventPath
    });
    
  } catch (error) {
    console.error('❌ Error getting violation details:', error);
    res.status(500).json({
      success: false,
      error: error.message
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

// API endpoint to get violation statistics (with date)
app.get('/api/violations/stats/:date', async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`📊 Getting violation stats for ${date}`);
    
    const cameras = ['camera001', 'camera002', 'camera003'];
    let totalViolations = 0;
    let cameraStats = {};
    
    for (const cameraId of cameras) {
      const cameraPath = path.join(PROCESSING_INBOX_PATH, cameraId, date);
      
      try {
        const hasAccess = await checkPathAccess(cameraPath);
        if (hasAccess) {
          const folders = await fs.readdir(cameraPath, { withFileTypes: true });
          const violationCount = folders.filter(f => f.isDirectory()).length;
          
          cameraStats[cameraId] = violationCount;
          totalViolations += violationCount;
        } else {
          cameraStats[cameraId] = 0;
        }
      } catch (error) {
        cameraStats[cameraId] = 0;
      }
    }
    
    res.json({
      success: true,
      date: date,
      totalViolations: totalViolations,
      cameraStats: cameraStats
    });
    
  } catch (error) {
    console.error('❌ Error getting violation stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to get violation statistics (today by default)
app.get('/api/violations/stats', async (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    console.log(`📊 Getting violation stats for today: ${date}`);
    
    const cameras = ['camera001', 'camera002', 'camera003'];
    let totalViolations = 0;
    let cameraStats = {};
    
    for (const cameraId of cameras) {
      const cameraPath = path.join(PROCESSING_INBOX_PATH, cameraId, date);
      
      try {
        const hasAccess = await checkPathAccess(cameraPath);
        if (hasAccess) {
          const folders = await fs.readdir(cameraPath, { withFileTypes: true });
          const violationCount = folders.filter(f => f.isDirectory()).length;
          
          cameraStats[cameraId] = violationCount;
          totalViolations += violationCount;
        } else {
          cameraStats[cameraId] = 0;
        }
      } catch (error) {
        cameraStats[cameraId] = 0;
      }
    }
    
    res.json({
      success: true,
      date: date,
      totalViolations: totalViolations,
      cameraStats: cameraStats
    });
    
  } catch (error) {
    console.error('❌ Error getting violation stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// EMAIL NOTIFICATION API ENDPOINTS

// Manual trigger for checking new violations
app.post('/api/notifications/check', async (req, res) => {
  try {
    console.log('📧 Manual violation check triggered');
    await checkForNewViolations();
    res.json({
      success: true,
      message: 'Violation check completed',
      processedCases: processedCases.size
    });
  } catch (error) {
    console.error('❌ Manual violation check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check for violations',
      message: error.message
    });
  }
});

// Get notification status
app.get('/api/notifications/status', (req, res) => {
  res.json({
    success: true,
    emailService: {
      enabled: !!emailTransporter,
      adminEmail: ADMIN_EMAIL,
      smtpHost: EMAIL_CONFIG.host
    },
    processedCases: processedCases.size,
    lastCheck: new Date().toISOString(),
    duplicatePrevention: 'enabled',
    persistentStorage: 'enabled'
  });
});

// Test email notification
app.post('/api/notifications/test', async (req, res) => {
  try {
    if (!emailTransporter) {
      return res.status(400).json({
        success: false,
        error: 'Email service not configured'
      });
    }

    // Send test email
    const testMailOptions = {
      from: `"Radar Speed System" <${EMAIL_CONFIG.auth.user}>`,
      to: ADMIN_EMAIL,
      subject: '🧪 Test Email - Radar Speed Detection System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px;">
            <h2 style="color: #007bff;">📧 Email Test Successful!</h2>
            <p>This is a test email from the Radar Speed Detection System.</p>
            <p><strong>System Status:</strong> ✅ Email notifications are working correctly</p>
            <p><strong>Admin Email:</strong> ${ADMIN_EMAIL}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
            <div style="background-color: #d4edda; padding: 10px; border-radius: 5px; margin: 15px 0;">
              <strong>📎 Photo Attachment Feature:</strong> ✅ Ready<br>
              <small>When violations occur, all evidence photos will be automatically attached to notification emails.</small>
            </div>
            <hr style="margin: 20px 0;">
            <p style="color: #6c757d; font-size: 12px;">🤖 Automated test from Potassium Radar System</p>
          </div>
        </div>
      `
    };

    const info = await emailTransporter.sendMail(testMailOptions);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      recipient: ADMIN_EMAIL
    });
    
  } catch (error) {
    console.error('❌ Test email failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      message: error.message
    });
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
      processingInboxPath: PROCESSING_INBOX_PATH,
      port: PORT
    },
    endpoints: {
      // Legacy FTP endpoints
      dates: '/api/ftp-images/dates',
      list: '/api/ftp-images/list?camera=192.168.1.54&date=2025-09-28',
      image: '/api/ftp-images/camera001/192.168.1.54/2025-09-28/Common/[filename]',
      // Violation endpoints
      violations: '/api/violations/camera002/2025-10-05',
      violationDetails: '/api/violations/camera002/2025-10-05/[eventId]',
      violationPhoto: '/api/violations/camera002/2025-10-05/[eventId]/photo_1.jpg',
      violationStats: '/api/violations/stats/2025-10-05',
      // Dynamic discovery endpoints
      discoverCameras: '/api/discover/cameras',
      discoverDates: '/api/discover/dates',
      discoverDatesForCamera: '/api/discover/dates/[cameraId]',
      discoverCases: '/api/discover/cases/[cameraId]/[date]',
      // NEW: Email notification endpoints
      notificationCheck: '/api/notifications/check',
      notificationStatus: '/api/notifications/status',
      notificationTest: '/api/notifications/test'
    },
    emailService: {
      enabled: !!emailTransporter,
      adminEmail: ADMIN_EMAIL,
      processedCases: processedCases.size
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

// Start automatic violation checking (every 30 seconds)
setInterval(async () => {
  try {
    await checkForNewViolations();
  } catch (error) {
    console.error('❌ Automatic violation check failed:', error);
  }
}, 30000); // Check every 30 seconds

// Load processed cases and run initial check on startup
setTimeout(async () => {
  console.log('🚀 Loading processed cases and running initial violation check...');
  await loadProcessedCases();
  await checkForNewViolations();
}, 5000); // Wait 5 seconds after startup

// Start the server
app.listen(PORT, '0.0.0.0', () => {
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
