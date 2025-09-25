const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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

const app = express();
const PORT = process.env.PORT || 3000;
const IMAGE_BASE_DIR = process.env.IMAGE_BASE_DIR || '/srv/camera_uploads';

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Static file serving for FTP images (read-only)
// Example URL:
//   /static/plate-images/camera001/192.168.1.54/2025-09-25/Common/<filename>.jpg
app.use(
  '/static/plate-images',
  express.static(IMAGE_BASE_DIR, {
    fallthrough: true,
    dotfiles: 'ignore',
    etag: true,
    maxAge: '1h',
    extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp']
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Radar Speed Detection API is running',
    timestamp: new Date().toISOString()
  });
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
