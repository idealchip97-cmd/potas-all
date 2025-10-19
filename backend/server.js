const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Environment validation and warnings
const validateEnvironment = () => {
  const warnings = [];
  const errors = [];

  // Check critical environment variables
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
    warnings.push('JWT_SECRET is not set. A random secret will be generated (not recommended for production).');
  }

  if (!process.env.DB_HOST) {
    warnings.push('DB_HOST is not set. Using default: localhost');
  }

  if (!process.env.DB_NAME) {
    warnings.push('DB_NAME is not set. Using default: radar_speed_detection');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Environment Configuration Warnings:');
    warnings.forEach(warning => console.log(`   • ${warning}`));
    console.log('   • Please check your .env file and compare with .env.example\n');
  }

  // Log errors (if any critical ones are added later)
  if (errors.length > 0) {
    console.error('\n❌ Environment Configuration Errors:');
    errors.forEach(error => console.error(`   • ${error}`));
    console.error('   • Server cannot start with these errors.\n');
    process.exit(1);
  }
};

// Validate environment on startup
validateEnvironment();

const { sequelize } = require('./models');
const externalDataService = require('./services/externalDataService');

// Import routes
const authRoutes = require('./routes/auth');
const radarRoutes = require('./routes/radars');
const fineRoutes = require('./routes/fines');
const reportRoutes = require('./routes/reports');
const plateRecognitionRoutes = require('./routes/plateRecognition');
const carRoutes = require('./routes/cars');
const violationRoutes = require('./routes/violations');
const externalDataRoutes = require('./routes/externalData');
const speedingCarProcessorRoutes = require('./routes/speedingCarProcessor');
const enhancedFtpRoutes = require('./routes/enhancedFtp');
const aiSyncRoutes = require('./routes/aiSync');
const aiFinesRoutes = require('./routes/aiFines');
const plateRecognitionSyncRoutes = require('./routes/plateRecognitionSync');
const aiCasesRoutes = require('./routes/aiCases');

const app = express();
const PORT = process.env.PORT || 3000;
const IMAGE_BASE_DIR = process.env.IMAGE_BASE_DIR || '/srv/camera_uploads';

// Security middleware
app.use(helmet());

// CORS configuration - Allow frontend origins
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:3004',
    'http://127.0.0.1:3004',
    'http://127.0.0.1:38185', // Plate recognition frontend
    'http://localhost:38185',
    'http://127.0.0.1:34777', // Browser preview proxy
    'http://localhost:34777',
    'http://127.0.0.1:42503', // Browser preview proxy
    'http://localhost:42503',
    'http://127.0.0.1:36555', // Current browser preview proxy
    'http://localhost:36555',
    'http://127.0.0.1:43341', // Browser preview proxy
    'http://localhost:43341',
    'http://127.0.0.1:38675', // Browser preview proxy
    'http://localhost:38675',
    'http://127.0.0.1:41453', // Current browser preview proxy
    'http://localhost:41453',
    'http://127.0.0.1:36891', // Dashboard browser preview proxy
    'http://localhost:36891',
    'http://127.0.0.1:42879', // Current browser preview proxy
    'http://localhost:42879',
    'http://127.0.0.1:38833', // Current browser preview proxy
    'http://localhost:38833'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting - Increased limits for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Proxy middleware for image server (port 3003) - FTP Images API
app.use('/api/ftp-images', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const imageServerUrl = `http://localhost:3003${req.originalUrl}`;
    console.log(`🔄 Proxying FTP Images to image server: ${imageServerUrl}`);
    
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      }
    };
    
    // Only add body for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    const response = await fetch(imageServerUrl, fetchOptions);
    
    if (response.headers.get('content-type')?.includes('image/')) {
      // Handle image responses
      const buffer = await response.buffer();
      res.setHeader('Content-Type', response.headers.get('content-type'));
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } else {
      // Handle JSON responses
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('❌ FTP Images proxy error:', error);
    res.status(500).json({ success: false, error: 'Proxy error', message: error.message });
  }
});

// Proxy middleware for image server (port 3003) - Violations API
app.use('/api/violations', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const imageServerUrl = `http://localhost:3003${req.originalUrl}`;
    console.log(`🔄 Proxying Violations to image server: ${imageServerUrl}`);
    
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      }
    };
    
    // Only add body for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    const response = await fetch(imageServerUrl, fetchOptions);
    
    if (response.headers.get('content-type')?.includes('image/')) {
      // Handle image responses
      const buffer = await response.buffer();
      res.setHeader('Content-Type', response.headers.get('content-type'));
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
    } else {
      // Handle JSON responses
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('❌ Violations proxy error:', error);
    res.status(500).json({ success: false, error: 'Proxy error', message: error.message });
  }
});

// Proxy middleware for health check to image server
app.use('/health', async (req, res, next) => {
  // First try to respond with backend health
  if (req.originalUrl === '/health') {
    try {
      const fetch = require('node-fetch');
      const imageServerResponse = await fetch('http://localhost:3003/health');
      const imageServerData = await imageServerResponse.json();
      
      res.json({
        success: true,
        message: 'Radar Speed Detection API is running',
        timestamp: new Date().toISOString(),
        imageBasePath: IMAGE_BASE_DIR,
        imageServer: imageServerData
      });
    } catch (error) {
      res.json({
        success: true,
        message: 'Radar Speed Detection API is running',
        timestamp: new Date().toISOString(),
        imageBasePath: IMAGE_BASE_DIR,
        imageServer: { error: 'Image server not available' }
      });
    }
  } else {
    next();
  }
});

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Static file serving for dashboard
app.use('/dashboard', express.static('public/dashboard'));

// Static file serving for FTP images (read-only)
// Example URL:
//   /static/plate-images/camera001/192.168.1.54/2025-09-25/Common/<filename>.jpg
console.log(`📁 Serving FTP images from: ${IMAGE_BASE_DIR} at /static/plate-images`);
app.use(
  '/static/plate-images',
  express.static(IMAGE_BASE_DIR, {
    fallthrough: true,
    dotfiles: 'ignore',
    etag: true,
    maxAge: '1h',
    extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'],
    setHeaders: (res, path) => {
      // Add CORS headers for image serving
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  })
);

// Debug endpoint to test image directory access
app.get('/debug/images', async (req, res) => {
  try {
    const testPath = path.join(IMAGE_BASE_DIR, 'camera001', '192.168.1.54', '2025-09-25', 'Common');
    console.log(`🔍 Checking directory: ${testPath}`);
    
    const fs = require('fs').promises;
    const exists = await fs.access(testPath).then(() => true).catch(() => false);
    
    if (!exists) {
      return res.json({
        success: false,
        message: 'Image directory not found',
        path: testPath,
        baseDir: IMAGE_BASE_DIR
      });
    }
    
    const files = await fs.readdir(testPath);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|bmp|gif|webp)$/i.test(f));
    
    res.json({
      success: true,
      message: 'Image directory accessible',
      path: testPath,
      totalFiles: files.length,
      imageFiles: imageFiles.slice(0, 5), // Show first 5 images
      sampleUrl: imageFiles.length > 0 ? `/static/plate-images/camera001/192.168.1.54/2025-09-25/Common/${imageFiles[0]}` : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking image directory',
      error: error.message,
      baseDir: IMAGE_BASE_DIR
    });
  }
});

// Image listing endpoint for FTP images
// GET /api/plate-images?camera=192.168.1.54&date=YYYY-MM-DD
app.get('/api/plate-images', async (req, res) => {
  try {
    const camera = (req.query.camera || '192.168.1.54').toString();
    const dateParam = (req.query.date || new Date().toISOString().slice(0, 10)).toString();

    // Build directory: /srv/camera_uploads/camera001/<camera>/<YYYY-MM-DD>/Common
    const dir = path.join(IMAGE_BASE_DIR, 'camera001', camera, dateParam, 'Common');

    // Ensure directory exists
    await fs.promises.access(dir, fs.constants.R_OK).catch(() => {
      return res.json({ files: [] });
    });

    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    const files = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .map(async (e) => {
          const full = path.join(dir, e.name);
          const stat = await fs.promises.stat(full);
          return {
            filename: e.name,
            modified: stat.mtime.toISOString(),
            url: `/static/plate-images/camera001/${camera}/${dateParam}/Common/${e.name}`,
          };
        })
    );

    files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    res.json({ files });
  } catch (error) {
    console.error('Error listing plate images:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/radars', radarRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/plate-recognition', plateRecognitionRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/external-data', externalDataRoutes);
app.use('/api/speeding-car-processor', speedingCarProcessorRoutes);
app.use('/api/enhanced-ftp', enhancedFtpRoutes);
app.use('/api/ai-sync', aiSyncRoutes);
app.use('/api/ai-fines', aiFinesRoutes);
app.use('/api/plate-recognition-sync', plateRecognitionSyncRoutes);
app.use('/api/ai-cases', aiCasesRoutes);

// Root route - redirect to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync database (create tables if they don't exist)
    await sequelize.sync({ force: false });
    console.log('Database synchronized successfully.');

    // Start server
    app.listen(PORT, async () => {
      console.log(`🚀 Radar Speed Detection API server running on port ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Environment: ${process.env.NODE_ENV}`);
      
      // Optionally auto-start external data service
      if (process.env.AUTO_START_EXTERNAL_DATA === 'true') {
        try {
          console.log('🔄 Auto-starting external data service...');
          await externalDataService.start();
          console.log('✅ External data service started automatically');
        } catch (error) {
          console.warn('⚠️ Failed to auto-start external data service:', error.message);
          console.log('💡 You can start it manually via API: POST /api/external-data/start');
        }
      } else {
        console.log('💡 External data service not auto-started. Start manually via API: POST /api/external-data/start');
      }
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  try {
    if (externalDataService.isRunning) {
      await externalDataService.stop();
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  try {
    if (externalDataService.isRunning) {
      await externalDataService.stop();
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});
