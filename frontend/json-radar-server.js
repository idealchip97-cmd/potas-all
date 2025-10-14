const WebSocket = require('ws');
const path = require('path');
const JsonCaseProcessor = require('./json-case-processor');

// Import backend models (optional - for database compatibility)
const backendPath = path.join(__dirname, '..', 'potassium-backend-');
let Fine, Radar, RadarReading, sequelize;

try {
  const models = require(path.join(backendPath, 'models'));
  Fine = models.Fine;
  Radar = models.Radar;
  RadarReading = models.RadarReading;
  sequelize = require(path.join(backendPath, 'config', 'database'));
} catch (error) {
  console.log('⚠️ Backend models not available - running in standalone mode');
}

// Configuration
const WS_PORT = 18082; // Different port to avoid conflicts
const SPEED_LIMIT = 30; // Always 30 km/h

class JsonRadarServer {
  constructor() {
    this.wsServer = new WebSocket.Server({ port: WS_PORT });
    this.connectedClients = new Set();
    this.jsonProcessor = new JsonCaseProcessor();
    this.mysqlConnection = null;
    
    this.setupWebSocketServer();
    if (sequelize) {
      this.setupDatabaseConnection();
    }
  }

  async setupDatabaseConnection() {
    try {
      await sequelize.authenticate();
      console.log('✅ Connected to MySQL database via Sequelize');
      
      // Sync models to ensure tables exist
      await sequelize.sync();
      console.log('✅ Database models synchronized');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('💡 Running without database - violations will only be stored in file system');
    }
  }

  setupWebSocketServer() {
    this.wsServer.on('connection', (ws) => {
      console.log('🔌 WebSocket client connected');
      this.connectedClients.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          console.log('📩 WebSocket message:', data);
          
          if (data.type === 'handshake') {
            ws.send(JSON.stringify({
              type: 'handshake_ack',
              status: 'connected',
              mode: 'json_case_processing',
              timestamp: new Date().toISOString()
            }));
          } else if (data.type === 'get_stats') {
            const stats = this.getServerStats();
            ws.send(JSON.stringify({
              type: 'stats',
              data: stats,
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('❌ WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.connectedClients.delete(ws);
      });
    });

    console.log(`🌐 WebSocket server listening on port ${WS_PORT}`);
  }

  /**
   * Starts the JSON case processing system
   */
  async startJsonProcessing() {
    console.log('🚀 Starting JSON Case Processing System');
    
    try {
      // Override the processor's violation processing to broadcast to WebSocket clients
      const originalProcessViolation = this.jsonProcessor.threePhotoProcessor.processViolation.bind(this.jsonProcessor.threePhotoProcessor);
      
      this.jsonProcessor.threePhotoProcessor.processViolation = async (violationData, sourceIP) => {
        const result = await originalProcessViolation(violationData, sourceIP);
        
        if (result.success) {
          // Broadcast violation to WebSocket clients
          this.broadcastToClients({
            type: 'violation_created',
            data: {
              eventId: result.eventId,
              cameraId: result.violationData.camera_id,
              speed: result.violationData.speed,
              limit: result.violationData.limit,
              decision: result.violationData.decision,
              folderPath: result.folderPath,
              photoCount: result.photoCount,
              carFilter: this.jsonProcessor.threePhotoProcessor.generateCarFilter(violationData.speed, SPEED_LIMIT),
              source: 'json_case_file'
            },
            timestamp: new Date().toISOString()
          });

          // Also save to database if available
          if (Fine && violationData.speed > SPEED_LIMIT) {
            await this.saveFineToDatabase(violationData, result);
          }
        }
        
        return result;
      };
      
      // Start monitoring JSON case files
      await this.jsonProcessor.startMonitoring();
      
      console.log('✅ JSON Case Processing System started');
      
    } catch (error) {
      console.error('❌ Error starting JSON processing:', error);
      throw error;
    }
  }

  /**
   * Saves fine to database for compatibility
   */
  async saveFineToDatabase(violationData, violationResult) {
    try {
      if (!Fine) return;
      
      const speedExcess = violationData.speed - SPEED_LIMIT;
      const fineAmount = this.calculateFineAmount(speedExcess);
      
      const fine = await Fine.create({
        radarId: violationData.cameraId.replace('camera', ''),
        vehiclePlate: null,
        speedDetected: violationData.speed,
        speedLimit: SPEED_LIMIT,
        violationAmount: speedExcess,
        fineAmount: fineAmount,
        violationDateTime: violationData.detectionTime,
        status: 'pending',
        imageUrl: null,
        notes: `JSON case processing: ${violationData.speed} km/h in ${SPEED_LIMIT} km/h zone. Event: ${violationResult.eventId}`,
        eventId: violationResult.eventId,
        violationFolderPath: violationResult.folderPath
      });
      
      console.log(`💾 Saved fine to database: ID ${fine.id}, Event ${violationResult.eventId}`);
      
    } catch (error) {
      console.error('❌ Error saving fine to database:', error);
    }
  }

  calculateFineAmount(speedExcess) {
    // Fine calculation based on speed excess
    if (speedExcess <= 10) return 50;
    if (speedExcess <= 20) return 100;
    if (speedExcess <= 30) return 200;
    return 300; // 30+ km/h over limit
  }

  broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Gets server statistics
   */
  getServerStats() {
    const processorStats = this.jsonProcessor.getStats();
    
    return {
      mode: 'json_case_processing',
      isRunning: processorStats.isRunning,
      processedCases: processorStats.processedCases,
      connectedClients: this.connectedClients.size,
      watchedDirectory: processorStats.watchedDirectory,
      speedLimit: SPEED_LIMIT,
      databaseConnected: !!sequelize,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * API methods for external access
   */
  async getViolations(cameraId, date) {
    try {
      return await this.jsonProcessor.threePhotoProcessor.listViolations(cameraId, date);
    } catch (error) {
      console.error('❌ Error fetching violations:', error);
      return [];
    }
  }

  async getViolationDetails(cameraId, date, eventId) {
    try {
      return await this.jsonProcessor.threePhotoProcessor.getViolationDetails(cameraId, date, eventId);
    } catch (error) {
      console.error('❌ Error fetching violation details:', error);
      throw error;
    }
  }

  /**
   * Creates sample case files for testing
   */
  async createSampleCases() {
    return await this.jsonProcessor.createSampleCaseFiles();
  }

  /**
   * Stops the server
   */
  async stop() {
    console.log('\n🛑 Shutting down JSON Radar Server...');
    
    try {
      await this.jsonProcessor.stop();
      
      if (sequelize) {
        await sequelize.close();
        console.log('🗄️ Database connection closed');
      }
      
      this.wsServer.close();
      console.log('🌐 WebSocket server closed');
      
      console.log('👋 JSON Radar Server shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

// Start the server
const server = new JsonRadarServer();

console.log('🚀 JSON Radar Server Started');
console.log('📄 Processing JSON case files instead of UDP');
console.log('🌐 WebSocket server on port 18082 for frontend communication');
console.log('🗄️ Database integration for fines storage (if available)');
console.log('📁 Monitoring FTP case files for radar data');
console.log('');
console.log('💡 Place JSON case files in FTP directory to trigger processing');
console.log('⚡ Speed limit is set to 30 km/h - violations will create 3-photo folders');
console.log('🔄 Automatic monitoring of new and modified JSON case files');

// Start JSON processing
server.startJsonProcessing().then(() => {
  console.log('');
  console.log('✅ System ready - monitoring for JSON case files');
  console.log('📋 Use createSampleCases() method to generate test files');
}).catch((error) => {
  console.error('❌ Failed to start JSON processing:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

// Export for testing
module.exports = { JsonRadarServer, server };
