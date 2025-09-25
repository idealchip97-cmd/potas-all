const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Radar Speed Detection API is running',
    timestamp: new Date().toISOString()
  });
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
