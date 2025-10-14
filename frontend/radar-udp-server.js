const dgram = require('dgram');
const WebSocket = require('ws');
const path = require('path');

// Import backend models
const backendPath = path.join(__dirname, '..', 'backend');
const { Fine, Radar, RadarReading } = require(path.join(backendPath, 'models'));
const sequelize = require(path.join(backendPath, 'config', 'database'));

// Import the new three photo processor
const ThreePhotoProcessor = require('./three-photo-processor');

// Configuration
const UDP_PORT = 17081;
const WS_PORT = 18081;
const SPEED_LIMIT = 30; // Always 30 km/h

class RadarUDPServer {
  constructor() {
    this.udpServer = dgram.createSocket('udp4');
    this.wsServer = new WebSocket.Server({ port: WS_PORT });
    this.mysqlConnection = null;
    this.connectedClients = new Set();
    this.processedFines = new Map(); // To prevent duplicates
    this.threePhotoProcessor = new ThreePhotoProcessor(); // New 3-photo system
    
    this.setupUDPServer();
    this.setupWebSocketServer();
    this.setupDatabaseConnection();
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
      console.log('💡 Make sure MySQL is running and credentials are correct');
      console.log('💡 Check potassium-backend-/config/database.js for connection settings');
    }
  }

  setupUDPServer() {
    this.udpServer.on('listening', () => {
      const address = this.udpServer.address();
      console.log(`🎯 UDP Radar Server listening on ${address.address}:${address.port}`);
      console.log(`📡 Ready to receive radar data in format: "ID: 1,Speed: 55, Time: 14:08:45."`);
    });

    this.udpServer.on('message', async (msg, rinfo) => {
      const message = msg.toString().trim();
      console.log(`📨 Received UDP data: "${message}" from ${rinfo.address}:${rinfo.port}`);
      
      await this.processRadarData(message, rinfo);
    });

    this.udpServer.on('error', (err) => {
      console.error('❌ UDP Server error:', err);
    });

    this.udpServer.bind(UDP_PORT);
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

  async processRadarData(message, rinfo) {
    try {
      // Parse radar data: "ID: 1,Speed: 55, Time: 14:08:45."
      const radarData = this.parseRadarMessage(message);
      
      if (!radarData) {
        console.log('⚠️ Invalid radar data format');
        return;
      }

      console.log('🎯 Parsed radar data:', radarData);

      // Step 1: Save ALL radar readings to database (persistent storage)
      const radarReading = await this.saveRadarReading(radarData, message, rinfo);
      
      // Step 2: Check if speed exceeds limit and process with new 3-photo system
      let fine = null;
      let violationResult = null;
      
      if (radarData.speed > SPEED_LIMIT) {
        console.log(`🚨 SPEED VIOLATION: ${radarData.speed} km/h (limit: ${SPEED_LIMIT} km/h)`);
        
        // Process violation with new 3-photo system
        const violationData = {
          cameraId: `camera${String(radarData.id).padStart(3, '0')}`, // camera001, camera002, etc.
          speed: radarData.speed,
          detectionTime: radarData.violationTime
        };
        
        violationResult = await this.threePhotoProcessor.processViolation(violationData, rinfo.address);
        
        if (violationResult.success) {
          console.log(`📁 Created violation folder: ${violationResult.folderPath}`);
          console.log(`📄 Event ID: ${violationResult.eventId}`);
        }
        
        // Also create traditional fine for database compatibility
        fine = await this.createSpeedingFine(radarData, rinfo, []);
        
        // Link the fine to the radar reading
        if (fine) {
          await radarReading.update({ 
            fineId: fine.id, 
            isViolation: true,
            processed: true,
            violationFolderPath: violationResult?.folderPath,
            eventId: violationResult?.eventId
          });
        }
      } else {
        console.log(`✅ Vehicle within speed limit: ${radarData.speed} km/h (limit: ${SPEED_LIMIT} km/h)`);
        await radarReading.update({ processed: true });
      }

      // Step 3: Broadcast to WebSocket clients with new violation data
      this.broadcastToClients({
        type: 'radar_reading',
        data: {
          id: radarReading.id,
          radarId: radarData.id,
          speed: radarData.speed,
          time: radarData.time,
          detectionTime: radarData.violationTime.toISOString(),
          speedLimit: SPEED_LIMIT,
          violation: radarData.speed > SPEED_LIMIT,
          fineId: fine ? fine.id : null,
          eventId: violationResult?.eventId,
          violationFolderPath: violationResult?.folderPath,
          photoCount: violationResult?.photoCount || 0,
          sourceIP: rinfo.address
        },
        timestamp: new Date().toISOString()
      });

      // Broadcast violation-specific data if it's a violation
      if (violationResult && violationResult.success) {
        this.broadcastToClients({
          type: 'violation_created',
          data: {
            eventId: violationResult.eventId,
            cameraId: violationResult.violationData.camera_id,
            speed: violationResult.violationData.speed,
            limit: violationResult.violationData.limit,
            decision: violationResult.violationData.decision,
            folderPath: violationResult.folderPath,
            photoCount: violationResult.photoCount,
            carFilter: this.threePhotoProcessor.generateCarFilter(radarData.speed, SPEED_LIMIT)
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error processing radar data:', error);
    }
  }

  parseRadarMessage(message) {
    // Parse: "ID: 1,Speed: 55, Time: 14:08:45."
    const regex = /ID:\s*(\d+),\s*Speed:\s*(\d+),\s*Time:\s*(\d{2}:\d{2}:\d{2})/i;
    const match = message.match(regex);

    if (!match) {
      return null;
    }

    const [, id, speed, time] = match;
    
    // Create full datetime for today
    const today = new Date();
    const [hours, minutes, seconds] = time.split(':');
    const violationTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                                  parseInt(hours), parseInt(minutes), parseInt(seconds));

    return {
      id: parseInt(id),
      speed: parseInt(speed),
      time: time,
      violationTime: violationTime
    };
  }

  async saveRadarReading(radarData, originalMessage, rinfo) {
    try {
      const radarReading = await RadarReading.create({
        radarId: radarData.id,
        speedDetected: radarData.speed,
        speedLimit: SPEED_LIMIT,
        detectionTime: radarData.violationTime,
        isViolation: radarData.speed > SPEED_LIMIT,
        sourceIP: rinfo.address,
        rawData: originalMessage,
        processed: false
      });

      console.log(`💾 Saved radar reading ID ${radarReading.id}: Radar ${radarData.id}, Speed ${radarData.speed} km/h`);
      return radarReading;
    } catch (error) {
      console.error('❌ Error saving radar reading:', error);
      throw error;
    }
  }

  async findCorrelatedImages(detectionTime) {
    try {
      // Look for images within ±2 seconds of radar detection
      const timeWindow = 2000; // 2 seconds in milliseconds
      const startTime = new Date(detectionTime.getTime() - timeWindow);
      const endTime = new Date(detectionTime.getTime() + timeWindow);

      console.log(`🔍 Looking for images between ${startTime.toISOString()} and ${endTime.toISOString()}`);

      // Get images from local image server API
      const correlatedImages = [];
      
      try {
        const fetch = require('node-fetch');
        const response = await fetch('http://localhost:3003/api/ftp-images/list');
        
        if (response.ok) {
          const images = await response.json();
          
          // Filter images by timestamp within 2-second window
          const matchingImages = images.filter(image => {
            if (!image.timestamp) return false;
            
            const imageTime = new Date(image.timestamp);
            return imageTime >= startTime && imageTime <= endTime;
          });

          matchingImages.forEach(image => {
            correlatedImages.push({
              url: image.imageUrl || image.url,
              thumbnailUrl: image.thumbnailUrl,
              timestamp: image.timestamp,
              filename: image.filename,
              timeDiff: Math.abs(new Date(image.timestamp).getTime() - detectionTime.getTime())
            });
          });

          if (correlatedImages.length > 0) {
            console.log(`📷 Found ${correlatedImages.length} correlated images:`);
            correlatedImages.forEach(img => {
              console.log(`  - ${img.filename} (${img.timeDiff}ms difference)`);
            });
          }
        }
      } catch (fetchError) {
        console.log('⚠️ Could not fetch images from local server:', fetchError.message);
      }

      return correlatedImages;
    } catch (error) {
      console.error('❌ Error finding correlated images:', error);
      return [];
    }
  }

  async createSpeedingFine(radarData, rinfo, correlatedImages = []) {
    // Create unique key to prevent duplicates
    const duplicateKey = `${radarData.id}-${radarData.violationTime.getTime()}-${radarData.speed}`;
    
    if (this.processedFines.has(duplicateKey)) {
      console.log('⚠️ Duplicate fine prevented for same radar, time, and speed');
      return;
    }

    try {
      // Calculate fine amount based on speed excess
      const speedExcess = radarData.speed - SPEED_LIMIT;
      const fineAmount = this.calculateFineAmount(speedExcess);

      // Use the best correlated image (closest timestamp) as primary image
      const primaryImageUrl = correlatedImages.length > 0 ? 
        correlatedImages.sort((a, b) => a.timeDiff - b.timeDiff)[0].url : null;

      const processingNotes = `Speed violation: ${radarData.speed} km/h in ${SPEED_LIMIT} km/h zone. Excess: ${speedExcess} km/h. Source: ${rinfo.address}:${rinfo.port}. ${correlatedImages.length > 0 ? `Correlated with ${correlatedImages.length} camera images.` : 'No camera images found.'}`;

      // Create fine using Sequelize model
      const fine = await Fine.create({
        radarId: radarData.id,
        vehiclePlate: null, // Will be populated later via image recognition
        speedDetected: radarData.speed,
        speedLimit: SPEED_LIMIT,
        violationAmount: speedExcess,
        fineAmount: fineAmount,
        violationDateTime: radarData.violationTime,
        status: 'pending',
        imageUrl: primaryImageUrl,
        notes: processingNotes
      });

      // Mark as processed to prevent duplicates
      this.processedFines.set(duplicateKey, true);
      
      // Clean up old entries (keep last 1000)
      if (this.processedFines.size > 1000) {
        const entries = Array.from(this.processedFines.keys());
        entries.slice(0, 500).forEach(key => this.processedFines.delete(key));
      }

      console.log(`🚨 FINE CREATED: ID ${fine.id}, Radar ${radarData.id}, Speed: ${radarData.speed} km/h, Fine: $${fineAmount}`);

      // Broadcast fine to WebSocket clients
      this.broadcastToClients({
        type: 'fine',
        data: {
          id: fine.id,
          radarId: radarData.id,
          vehicleSpeed: radarData.speed,
          speedLimit: SPEED_LIMIT,
          fineAmount: fineAmount,
          violationTime: radarData.violationTime.toISOString(),
          imageUrl: imageUrl,
          status: 'pending'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log('⚠️ Duplicate fine prevented by database constraint');
      } else {
        console.error('❌ Error creating fine:', error.message);
      }
    }
  }

  calculateFineAmount(speedExcess) {
    // Fine calculation based on speed excess
    if (speedExcess <= 10) return 50;
    if (speedExcess <= 20) return 100;
    if (speedExcess <= 30) return 200;
    return 300; // 30+ km/h over limit
  }

  async findCorrelatedImage(radarData) {
    try {
      // Look for images within ±30 seconds of violation time
      const imagePath = '/home/rnd2/Desktop/radar_sys/potassium-frontend/local-images/camera001/192.168.1.54';
      const timeWindow = 30000; // 30 seconds in milliseconds
      
      // This is a simplified correlation - in reality you'd have more sophisticated matching
      const correlatedImage = `http://localhost:3003/api/ftp-images/radar_${radarData.id}_${radarData.time.replace(/:/g, '')}.jpg`;
      
      return correlatedImage;
    } catch (error) {
      console.log('⚠️ Could not correlate image:', error.message);
      return null;
    }
  }

  broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  async getFines(limit = 100) {
    try {
      const fines = await Fine.findAll({
        limit: limit,
        order: [['violationDateTime', 'DESC']],
        include: [{
          model: Radar,
          as: 'radar',
          attributes: ['name', 'location']
        }]
      });
      return fines;
    } catch (error) {
      console.error('❌ Error fetching fines:', error);
      return [];
    }
  }

  async getRadarStats() {
    try {
      const totalFines = await Fine.count();
      const pendingFines = await Fine.count({ where: { status: 'pending' } });
      const totalReadings = await RadarReading.count();
      const violationReadings = await RadarReading.count({ where: { isViolation: true } });
      
      return {
        totalFines: totalFines,
        pendingFines: pendingFines,
        totalReadings: totalReadings,
        violationReadings: violationReadings,
        complianceRate: totalReadings > 0 ? ((totalReadings - violationReadings) / totalReadings * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('❌ Error fetching radar stats:', error);
      return { totalFines: 0, pendingFines: 0, totalReadings: 0, violationReadings: 0, complianceRate: 0 };
    }
  }

  async getRadarReadings(limit = 100) {
    try {
      const readings = await RadarReading.findAll({
        limit: limit,
        order: [['detectionTime', 'DESC']],
        include: [{
          model: Radar,
          as: 'radar',
          attributes: ['name', 'location']
        }, {
          model: Fine,
          as: 'fine',
          attributes: ['id', 'fineAmount', 'status'],
          required: false
        }]
      });
      return readings;
    } catch (error) {
      console.error('❌ Error fetching radar readings:', error);
      return [];
    }
  }

  // New methods for 3-photo violation system
  async getViolations(cameraId, date) {
    try {
      return await this.threePhotoProcessor.listViolations(cameraId, date);
    } catch (error) {
      console.error('❌ Error fetching violations:', error);
      return [];
    }
  }

  async getViolationDetails(cameraId, date, eventId) {
    try {
      return await this.threePhotoProcessor.getViolationDetails(cameraId, date, eventId);
    } catch (error) {
      console.error('❌ Error fetching violation details:', error);
      throw error;
    }
  }

  async getViolationStats() {
    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Get violations for all cameras today
      const cameras = ['camera001', 'camera002', 'camera003']; // Add more as needed
      let totalViolations = 0;
      let totalCompliant = 0;
      
      for (const cameraId of cameras) {
        const violations = await this.getViolations(cameraId, today);
        totalViolations += violations.length;
      }
      
      // Get total readings from database
      const totalReadings = await RadarReading.count({
        where: {
          detectionTime: {
            [require('sequelize').Op.gte]: new Date(today + 'T00:00:00')
          }
        }
      });
      
      totalCompliant = totalReadings - totalViolations;
      
      return {
        totalViolations,
        totalCompliant,
        totalReadings,
        complianceRate: totalReadings > 0 ? ((totalCompliant / totalReadings) * 100).toFixed(1) : 100,
        date: today
      };
    } catch (error) {
      console.error('❌ Error fetching violation stats:', error);
      return {
        totalViolations: 0,
        totalCompliant: 0,
        totalReadings: 0,
        complianceRate: 100,
        date: new Date().toISOString().split('T')[0]
      };
    }
  }
}

// Start the server
const server = new RadarUDPServer();

console.log('🚀 Radar UDP Server Started');
console.log('📡 Listening for UDP radar data on port 17081');
console.log('🌐 WebSocket server on port 18081 for frontend communication');
console.log('🗄️ MySQL integration for fines storage');
console.log('📷 FTP image correlation enabled');
console.log('');
console.log('💡 Send radar data like: "ID: 1,Speed: 55, Time: 14:08:45."');
console.log('⚡ Speed limit is set to 30 km/h - violations will create fines');
console.log('🔄 Duplicate prevention enabled based on radar ID, time, and speed');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Radar UDP Server...');
  
  try {
    await sequelize.close();
    console.log('🗄️ Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
  
  server.udpServer.close();
  server.wsServer.close();
  console.log('👋 Server shutdown complete');
  process.exit(0);
});
