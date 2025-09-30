const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const dgram = require('dgram');

// Configuration
const SERIAL_PORT = '/dev/ttyUSB0';
const BAUD_RATE = 9600;
const UDP_HOST = 'localhost';
const UDP_PORT = 17081;
const RADAR_ID = 1; // Default radar ID

class SerialToUDPBridge {
  constructor() {
    this.udpClient = dgram.createSocket('udp4');
    this.serialPort = null;
    this.setupSerial();
  }

  async setupSerial() {
    try {
      // List available ports first
      const ports = await SerialPort.list();
      console.log('📡 Available serial ports:');
      ports.forEach(port => {
        console.log(`  - ${port.path}: ${port.manufacturer || 'Unknown'}`);
      });

      // Try to open the radar serial port
      this.serialPort = new SerialPort({
        path: SERIAL_PORT,
        baudRate: BAUD_RATE,
        autoOpen: false
      });

      this.serialPort.open((err) => {
        if (err) {
          console.error(`❌ Failed to open ${SERIAL_PORT}:`, err.message);
          console.log('💡 Make sure the radar simulator is connected and the port is correct');
          return;
        }

        console.log(`✅ Serial port ${SERIAL_PORT} opened at ${BAUD_RATE} baud`);
        console.log('🎯 Listening for radar speed packets...');
        console.log('📡 Will forward parsed data to UDP server at localhost:17081');
      });

      // Set up data parsing
      this.setupDataParsing();

    } catch (error) {
      console.error('❌ Serial setup error:', error.message);
      console.log('💡 Install serialport: npm install serialport');
    }
  }

  setupDataParsing() {
    // Listen for raw data
    this.serialPort.on('data', (data) => {
      this.parseRadarPacket(data);
    });

    this.serialPort.on('error', (err) => {
      console.error('❌ Serial port error:', err.message);
    });

    this.serialPort.on('close', () => {
      console.log('🔌 Serial port closed');
    });
  }

  parseRadarPacket(data) {
    try {
      // Convert buffer to hex string for analysis
      const hexString = data.toString('hex').toUpperCase();
      console.log(`📨 Raw packet: ${hexString}`);

      // Parse the packet format: FE AF 05 01 0A [SPEED] 16 EF
      // Expected format based on your simulator output
      if (data.length >= 8 && data[0] === 0xFE && data[1] === 0xAF) {
        // Extract speed from position 5 (0-indexed)
        const speedHex = data[5];
        const speed = speedHex; // Speed is already in decimal
        
        console.log(`🎯 Parsed speed: ${speed} km/h (0x${speedHex.toString(16).toUpperCase()})`);
        
        // Create timestamp
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS format
        
        // Create UDP message in expected format
        const udpMessage = `ID: ${RADAR_ID},Speed: ${speed}, Time: ${timeString}.`;
        
        // Send to UDP server
        this.sendToUDPServer(udpMessage, speed);
        
      } else {
        console.log('⚠️ Unknown packet format, ignoring');
      }
      
    } catch (error) {
      console.error('❌ Error parsing radar packet:', error);
    }
  }

  sendToUDPServer(message, speed) {
    const buffer = Buffer.from(message);
    
    this.udpClient.send(buffer, 0, buffer.length, UDP_PORT, UDP_HOST, (err) => {
      if (err) {
        console.error('❌ UDP send error:', err);
      } else {
        const violationStatus = speed > 30 ? '🚨 VIOLATION' : '✅ OK';
        console.log(`📡 Sent to UDP server: "${message}" - ${violationStatus}`);
      }
    });
  }

  close() {
    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.close();
    }
    this.udpClient.close();
  }
}

// Create and start the bridge
const bridge = new SerialToUDPBridge();

console.log('🌉 Serial-to-UDP Bridge Started');
console.log(`📡 Serial: ${SERIAL_PORT} @ ${BAUD_RATE} baud`);
console.log(`📤 UDP: ${UDP_HOST}:${UDP_PORT}`);
console.log('🎯 Radar ID: 1');
console.log('⚡ Speed limit: 30 km/h');
console.log('');
console.log('💡 Start your radar simulator to send speed data');
console.log('🎮 Run: python3 ~/Desktop/radar_simulator/radar_simulator.py');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Serial-to-UDP Bridge...');
  bridge.close();
  console.log('👋 Bridge shutdown complete');
  process.exit(0);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  bridge.close();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  bridge.close();
  process.exit(1);
});
