const dgram = require('dgram');
const EventEmitter = require('events');
const { RadarReading, Fine, Radar, UdpReading } = require('../models');
const sequelize = require('../config/database');

class PersistentUdpListener extends EventEmitter {
    constructor() {
        super();
        this.server = dgram.createSocket('udp4');
        this.config = {
            port: process.env.UDP_PORT || 17081,
            speedLimit: process.env.SPEED_LIMIT || 30
        };
        this.isListening = false;
        this.stats = {
            startTime: null,
            messagesReceived: 0,
            readingsSaved: 0,
            violationsDetected: 0,
            finesCreated: 0,
            errors: 0
        };
        this.processedMessages = new Map(); // Prevent duplicates
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.server.on('listening', () => {
            const address = this.server.address();
            console.log(`🎯 Persistent UDP Listener started on ${address.address}:${address.port}`);
            console.log(`📡 Ready to receive radar data and save to MySQL`);
            console.log(`⚡ Speed limit set to ${this.config.speedLimit} km/h`);
            console.log(`📄 Supported formats:`);
            console.log(`   • Text: "ID: 1,Speed: 55, Time: 14:08:45."`);
            console.log(`   • Binary: FE AF 05 01 0A [SPEED] 16 EF`);
            console.log(`   • JSON: {"radarId": 1, "speed": 55, "timestamp": "..."}`);
            this.isListening = true;
            this.stats.startTime = new Date();
            this.emit('listening', address);
        });

        this.server.on('message', async (msg, rinfo) => {
            try {
                this.stats.messagesReceived++;
                console.log(`📨 UDP Message from ${rinfo.address}:${rinfo.port}`);
                console.log(`📄 Raw: ${msg.toString()}`);
                console.log(`📦 Hex: ${msg.toString('hex').toUpperCase()}`);
                
                await this.processMessage(msg, rinfo);
            } catch (error) {
                console.error('❌ Error processing UDP message:', error);
                this.stats.errors++;
                this.emit('error', error);
            }
        });

        this.server.on('error', (err) => {
            console.error('❌ UDP Server error:', err);
            this.isListening = false;
            this.stats.errors++;
            this.emit('error', err);
        });

        this.server.on('close', () => {
            console.log('⚠️ UDP Server closed');
            this.isListening = false;
            this.emit('closed');
        });
    }

    async processMessage(message, rinfo) {
        try {
            // Parse the message
            const radarData = this.parseMessage(message, rinfo);
            
            if (!radarData) {
                console.log('⚠️ Could not parse radar data');
                return;
            }

            console.log('🎯 Parsed radar data:', JSON.stringify(radarData, null, 2));

            // Check for duplicates
            const duplicateKey = `${radarData.radarId}-${radarData.speed}-${radarData.timestamp}`;
            if (this.processedMessages.has(duplicateKey)) {
                console.log('⚠️ Duplicate message ignored');
                return;
            }

            // Save UDP reading to MySQL (new dedicated table)
            const udpReading = await this.saveUdpReading(radarData, rinfo);
            
            // Also save to original RadarReading table for compatibility
            const reading = await this.saveRadarReading(radarData, rinfo);
            let fine = null;
            
            if (reading) {
                this.stats.readingsSaved++;
                console.log(`💾 Saved radar reading ID: ${reading.id}`);
                
                // Check for speed violation
                if (radarData.speed > this.config.speedLimit) {
                    this.stats.violationsDetected++;
                    console.log(`🚨 Speed violation detected: ${radarData.speed} km/h > ${this.config.speedLimit} km/h`);
                    
                    // Create fine if needed
                    fine = await this.createFine(radarData, reading, rinfo);
                    if (fine) {
                        this.stats.finesCreated++;
                        console.log(`💰 Fine created ID: ${fine.id}, Amount: $${fine.fineAmount}`);
                        
                        // Update reading with fine ID
                        await reading.update({ fineId: fine.id });
                        
                        // Update UDP reading with fine info
                        if (udpReading) {
                            await udpReading.update({ 
                                fineId: fine.id, 
                                fineCreated: true,
                                processed: true,
                                processingNotes: `Fine created: $${fine.fineAmount}`
                            });
                        }
                    }
                }
                
                // Mark as processed
                this.processedMessages.set(duplicateKey, Date.now());
                
                // Clean up old processed messages (keep last 1000)
                if (this.processedMessages.size > 1000) {
                    const entries = Array.from(this.processedMessages.entries());
                    entries.slice(0, 500).forEach(([key]) => this.processedMessages.delete(key));
                }
                
                // Emit event for real-time updates
                this.emit('radarReading', {
                    reading: reading.toJSON(),
                    violation: radarData.speed > this.config.speedLimit,
                    fine: fine ? fine.toJSON() : null
                });
            }
        } catch (error) {
            console.error('❌ Error processing radar message:', error);
            this.stats.errors++;
        }
    }

    parseMessage(message, rinfo) {
        try {
            // Try binary format first
            if (Buffer.isBuffer(message)) {
                const binaryData = this.parseBinaryMessage(message);
                if (binaryData) return binaryData;
            }
            
            const messageStr = message.toString().trim();
            
            // Try JSON format
            try {
                const jsonData = JSON.parse(messageStr);
                return this.parseJsonMessage(jsonData);
            } catch (jsonError) {
                // Try text format: "ID: 1,Speed: 55, Time: 14:08:45."
                return this.parseTextMessage(messageStr);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
            return null;
        }
    }

    parseBinaryMessage(buffer) {
        try {
            // Format: FE AF 05 01 0A [SPEED] 16 EF
            if (buffer.length >= 8 && buffer[0] === 0xFE && buffer[1] === 0xAF && buffer[7] === 0xEF) {
                const speed = buffer[5];
                const radarId = buffer[4] || 1;
                
                return {
                    radarId: radarId,
                    speed: speed,
                    timestamp: new Date(),
                    format: 'binary',
                    rawData: buffer.toString('hex').toUpperCase()
                };
            }
            return null;
        } catch (error) {
            console.error('Error parsing binary message:', error);
            return null;
        }
    }

    parseJsonMessage(data) {
        try {
            return {
                radarId: data.radarId || data.radar_id || data.id || 1,
                speed: data.speed || data.speedDetected || 0,
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
                format: 'json',
                rawData: JSON.stringify(data)
            };
        } catch (error) {
            console.error('Error parsing JSON message:', error);
            return null;
        }
    }

    parseTextMessage(message) {
        try {
            // Format: "ID: 1,Speed: 55, Time: 14:08:45."
            const regex = /ID:\s*(\d+),\s*Speed:\s*(\d+),\s*Time:\s*(\d{2}:\d{2}:\d{2})/i;
            const match = message.match(regex);

            if (match) {
                const [, id, speed, time] = match;
                
                // Create timestamp for today with the given time
                const today = new Date();
                const [hours, minutes, seconds] = time.split(':').map(Number);
                const timestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);

                return {
                    radarId: parseInt(id),
                    speed: parseInt(speed),
                    timestamp: timestamp,
                    timeString: time,
                    format: 'text',
                    rawData: message
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error parsing text message:', error);
            return null;
        }
    }

    async saveUdpReading(radarData, rinfo) {
        try {
            // Ensure radar exists
            await this.ensureRadarExists(radarData.radarId);
            
            const udpReading = await UdpReading.create({
                radarId: radarData.radarId,
                speedDetected: radarData.speed,
                speedLimit: this.config.speedLimit,
                detectionTime: radarData.timestamp,
                isViolation: radarData.speed > this.config.speedLimit,
                sourceIP: rinfo.address,
                sourcePort: rinfo.port,
                rawMessage: radarData.rawData || JSON.stringify(radarData),
                messageFormat: radarData.format || 'unknown',
                hexData: radarData.format === 'binary' ? radarData.rawData : null,
                processed: false,
                fineCreated: false
            });

            console.log(`💾 Saved UDP reading ID: ${udpReading.id} (${radarData.format} format)`);
            return udpReading;
        } catch (error) {
            console.error('❌ Error saving UDP reading:', error);
            throw error;
        }
    }

    async saveRadarReading(radarData, rinfo) {
        try {
            // Ensure radar exists
            await this.ensureRadarExists(radarData.radarId);
            
            const reading = await RadarReading.create({
                radarId: radarData.radarId,
                speedDetected: radarData.speed,
                speedLimit: this.config.speedLimit,
                detectionTime: radarData.timestamp,
                isViolation: radarData.speed > this.config.speedLimit,
                sourceIP: rinfo.address,
                rawData: radarData.rawData || radarData.format,
                processed: false
            });

            return reading;
        } catch (error) {
            console.error('❌ Error saving radar reading:', error);
            throw error;
        }
    }

    async ensureRadarExists(radarId) {
        try {
            const [radar, created] = await Radar.findOrCreate({
                where: { id: radarId },
                defaults: {
                    name: `Radar ${radarId}`,
                    location: `Location ${radarId}`,
                    status: 'active',
                    speedLimit: this.config.speedLimit
                }
            });

            if (created) {
                console.log(`📡 Created new radar record: ID ${radarId}`);
            }

            return radar;
        } catch (error) {
            console.error('❌ Error ensuring radar exists:', error);
            throw error;
        }
    }

    async createFine(radarData, reading, rinfo) {
        try {
            const speedExcess = radarData.speed - this.config.speedLimit;
            const fineAmount = this.calculateFineAmount(speedExcess);

            const fine = await Fine.create({
                radarId: radarData.radarId,
                vehiclePlate: null, // Will be populated later via image recognition
                speedDetected: radarData.speed,
                speedLimit: this.config.speedLimit,
                violationAmount: speedExcess,
                fineAmount: fineAmount,
                violationDateTime: radarData.timestamp,
                status: 'pending',
                imageUrl: null, // Will be populated later via image correlation
                notes: `Speed violation: ${radarData.speed} km/h in ${this.config.speedLimit} km/h zone. Excess: ${speedExcess} km/h. Source: ${rinfo.address}:${rinfo.port}.`
            });

            return fine;
        } catch (error) {
            console.error('❌ Error creating fine:', error);
            return null;
        }
    }

    calculateFineAmount(speedExcess) {
        // Fine calculation based on speed excess
        if (speedExcess <= 10) return 50;
        if (speedExcess <= 20) return 100;
        if (speedExcess <= 30) return 200;
        return 300; // 30+ km/h over limit
    }

    async start() {
        return new Promise((resolve, reject) => {
            if (this.isListening) {
                console.log('⚠️ UDP Listener already running');
                resolve();
                return;
            }

            console.log(`🚀 Starting Persistent UDP Listener on port ${this.config.port}...`);
            
            this.server.bind(this.config.port, (err) => {
                if (err) {
                    console.error('❌ Failed to start UDP Listener:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async stop() {
        return new Promise((resolve) => {
            if (!this.isListening) {
                resolve();
                return;
            }

            console.log('🛑 Stopping Persistent UDP Listener...');
            this.server.close(() => {
                console.log('✅ UDP Listener stopped');
                resolve();
            });
        });
    }

    async healthCheck() {
        try {
            // Test database connection
            await sequelize.authenticate();
            
            const address = this.isListening ? this.server.address() : null;
            
            return {
                status: this.isListening ? 'healthy' : 'stopped',
                listening: this.isListening,
                address: address,
                stats: this.getStats(),
                database: 'connected',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                listening: this.isListening,
                error: error.message,
                database: 'disconnected',
                timestamp: new Date().toISOString()
            };
        }
    }

    getStats() {
        return {
            ...this.stats,
            isListening: this.isListening,
            uptime: this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0,
            config: this.config
        };
    }

    // Reset statistics (for testing)
    resetStats() {
        this.stats = {
            startTime: this.stats.startTime,
            messagesReceived: 0,
            readingsSaved: 0,
            violationsDetected: 0,
            finesCreated: 0,
            errors: 0
        };
        this.processedMessages.clear();
        console.log('📊 Statistics reset');
    }
}

module.exports = PersistentUdpListener;
