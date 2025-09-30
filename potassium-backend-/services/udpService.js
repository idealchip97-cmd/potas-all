const dgram = require('dgram');
const EventEmitter = require('events');

class UDPService extends EventEmitter {
    constructor() {
        super();
        this.server = dgram.createSocket('udp4');
        this.config = {
            host: '192.186.1.14',
            port: 17081,
            localPort: process.env.UDP_LOCAL_PORT || 17081
        };
        this.isListening = false;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.server.on('listening', () => {
            const address = this.server.address();
            console.log(`✅ UDP Server listening on ${address.address}:${address.port}`);
            console.log(`📡 Waiting for binary radar packets...`);
            console.log(`📄 Expected format: FE AF 05 01 0A [SPEED] 16 EF`);
            console.log(`📍 Example: FE AF 05 01 0A 42 16 EF (Speed: 66 km/h)`);
            this.isListening = true;
        });

        this.server.on('message', (msg, rinfo) => {
            try {
                console.log(`📨 UDP Message received from ${rinfo.address}:${rinfo.port}`);
                console.log(`📄 Raw Message: ${msg.toString()}`);
                console.log(`📦 Binary Hex: ${msg.toString('hex').toUpperCase()}`);
                console.log(`📏 Message Length: ${msg.length} bytes`);
                
                // Parse the message
                const data = this.parseMessage(msg);
                
                if (data) {
                    console.log(`✅ Parsed Data:`, JSON.stringify(data, null, 2));
                    
                    // Emit different events based on data type
                    if (data.type === 'radar') {
                        console.log('📡 Emitting radarData event');
                        this.emit('radarData', data);
                    } else if (data.type === 'radar_violation') {
                        console.log('🚨 Emitting radarViolation event');
                        this.emit('radarViolation', data);
                    } else if (data.type === 'fine') {
                        console.log('💰 Emitting fineData event');
                        this.emit('fineData', data);
                    } else if (data.type === 'violation') {
                        console.log('⚠️ Emitting violationData event');
                        this.emit('violationData', data);
                    } else {
                        console.log('❓ Emitting unknownData event');
                        this.emit('unknownData', data);
                    }
                } else {
                    console.warn('⚠️ Failed to parse UDP message');
                }
            } catch (error) {
                console.error('❌ Error processing UDP message:', error);
                this.emit('error', error);
            }
        });

        this.server.on('error', (err) => {
            console.error('❌ UDP Server error:', err);
            this.isListening = false;
            this.emit('error', err);
        });

        this.server.on('close', () => {
            console.log('⚠️ UDP Server closed');
            this.isListening = false;
            this.emit('closed');
        });
    }

    parseMessage(message) {
        try {
            // Check if message is a Buffer (binary data)
            if (Buffer.isBuffer(message)) {
                return this.parseBinaryMessage(message);
            }
            
            // Convert to string if it's not already
            const messageStr = message.toString();
            
            // Try to parse as JSON first
            try {
                const jsonData = JSON.parse(messageStr);
                return this.normalizeJsonData(jsonData);
            } catch (jsonError) {
                // If JSON parsing fails, try to parse as delimited string
                return this.parseDelimitedMessage(messageStr);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
            return {
                type: 'unknown',
                rawMessage: message.toString(),
                error: error.message
            };
        }
    }

    normalizeJsonData(data) {
        // Normalize JSON data structure
        if (data.radarId || data.radar_id) {
            return {
                type: 'radar',
                radarId: data.radarId || data.radar_id,
                location: data.location,
                status: data.status,
                lastPing: data.lastPing || data.last_ping || new Date().toISOString(),
                ...data
            };
        } else if (data.plateNumber || data.plate_number || data.licensePlate) {
            return {
                type: 'fine',
                plateNumber: data.plateNumber || data.plate_number || data.licensePlate,
                speed: data.speed,
                speedLimit: data.speedLimit || data.speed_limit,
                radarId: data.radarId || data.radar_id,
                timestamp: data.timestamp || new Date().toISOString(),
                location: data.location,
                ...data
            };
        } else if (data.violationType || data.violation_type) {
            return {
                type: 'violation',
                violationType: data.violationType || data.violation_type,
                plateNumber: data.plateNumber || data.plate_number,
                radarId: data.radarId || data.radar_id,
                timestamp: data.timestamp || new Date().toISOString(),
                ...data
            };
        }
        
        return {
            type: 'unknown',
            rawData: data
        };
    }

    // Parse binary radar packets (e.g., FE AF 05 01 0A 42 16 EF)
    parseBinaryMessage(buffer) {
        try {
            console.log('📦 Parsing binary message:', buffer.toString('hex').toUpperCase());
            
            // Check if this matches your radar packet format
            // Format: FE AF 05 01 0A [SPEED] [CHECKSUM] EF
            if (buffer.length >= 8 && buffer[0] === 0xFE && buffer[1] === 0xAF && buffer[7] === 0xEF) {
                const speed = buffer[5]; // Speed is at index 5
                const radarId = buffer[4] || 1; // Radar ID at index 4, default to 1
                
                console.log(`🎯 Radar packet decoded: Speed=${speed} km/h, RadarId=${radarId}`);
                
                return {
                    type: 'radar_violation',
                    radarId: radarId,
                    speed: speed,
                    speedLimit: 50, // Default speed limit
                    timestamp: new Date().toISOString(),
                    rawMessage: buffer.toString('hex').toUpperCase(),
                    needsImageCorrelation: true,
                    binaryPacket: true
                };
            }
            
            // If not recognized format, return as unknown
            return {
                type: 'unknown',
                rawMessage: buffer.toString('hex'),
                error: 'Unrecognized binary format'
            };
        } catch (error) {
            console.error('Error parsing binary message:', error);
            return {
                type: 'unknown',
                rawMessage: buffer.toString('hex'),
                error: error.message
            };
        }
    }

    parseDelimitedMessage(message) {
        // Handle radar data format: "ID: 1,Speed: 55, Time: 15:49:09."
        const radarPattern = /ID:\s*(\d+),\s*Speed:\s*(\d+),\s*Time:\s*([\d:]+)/i;
        const match = message.match(radarPattern);
        
        if (match) {
            const [, radarId, speed, timeStr] = match;
            
            // Parse time and create full timestamp
            let timestamp;
            try {
                const today = new Date();
                const [hours, minutes, seconds] = timeStr.split(':').map(Number);
                timestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
            } catch (error) {
                timestamp = new Date();
            }
            
            return {
                type: 'radar_violation',
                radarId: parseInt(radarId),
                speed: parseInt(speed),
                timestamp: timestamp.toISOString(),
                timeString: timeStr,
                rawMessage: message.trim(),
                needsImageCorrelation: true
            };
        }
        
        // Fallback to original parsing for other formats
        const parts = message.split(/[,|;]/);
        
        if (parts.length < 3) {
            return {
                type: 'unknown',
                rawMessage: message
            };
        }

        // Try to identify message type based on content patterns
        const firstPart = parts[0].toLowerCase();
        
        if (firstPart.includes('radar') || firstPart.includes('device')) {
            return {
                type: 'radar',
                radarId: parts[1],
                location: parts[2],
                status: parts[3] || 'active',
                lastPing: new Date().toISOString(),
                rawMessage: message
            };
        } else if (firstPart.includes('fine') || firstPart.includes('violation') || parts.some(p => p.match(/^\d{2,3}$/))) {
            // Likely a fine/violation if contains speed-like numbers
            return {
                type: 'fine',
                plateNumber: parts[1],
                speed: parseInt(parts[2]) || 0,
                speedLimit: parseInt(parts[3]) || 50,
                radarId: parts[4] || 'unknown',
                timestamp: new Date().toISOString(),
                rawMessage: message
            };
        }
        
        return {
            type: 'unknown',
            parts: parts,
            rawMessage: message
        };
    }

    async start() {
        return new Promise((resolve, reject) => {
            if (this.isListening) {
                console.log('✅ UDP server already listening');
                resolve();
                return;
            }

            console.log(`🚀 Starting UDP server on port ${this.config.localPort}`);
            console.log(`📡 Binding to address: 0.0.0.0:${this.config.localPort}`);
            
            // Set up one-time listeners for this start attempt
            const onListening = () => {
                console.log('✅ UDP server successfully started and listening');
                this.server.removeListener('error', onError);
                resolve();
            };
            
            const onError = (err) => {
                console.error('❌ UDP server failed to start:', err.message);
                this.server.removeListener('listening', onListening);
                reject(err);
            };
            
            this.server.once('listening', onListening);
            this.server.once('error', onError);
            
            try {
                this.server.bind(this.config.localPort, '0.0.0.0');
            } catch (bindError) {
                console.error('❌ UDP bind error:', bindError.message);
                reject(bindError);
            }
        });
    }

    async stop() {
        return new Promise((resolve) => {
            if (!this.isListening) {
                resolve();
                return;
            }

            console.log('🛑 Stopping UDP server...');
            this.server.close(() => {
                console.log('✅ UDP server stopped');
                resolve();
            });
        });
    }

    // Send a message to the UDP server (for testing or acknowledgments)
    async sendMessage(message, host = null, port = null) {
        return new Promise((resolve, reject) => {
            const targetHost = host || this.config.host;
            const targetPort = port || this.config.port;
            
            const buffer = Buffer.from(message);
            
            this.server.send(buffer, 0, buffer.length, targetPort, targetHost, (err) => {
                if (err) {
                    console.error(`❌ Failed to send UDP message to ${targetHost}:${targetPort}:`, err);
                    reject(err);
                } else {
                    console.log(`✅ UDP message sent to ${targetHost}:${targetPort}`);
                    resolve();
                }
            });
        });
    }

    // Health check method
    async healthCheck() {
        try {
            const address = this.isListening ? this.server.address() : null;
            
            return {
                status: this.isListening ? 'healthy' : 'stopped',
                listening: this.isListening,
                address: address,
                remoteServer: `${this.config.host}:${this.config.port}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                listening: false,
                error: error.message,
                remoteServer: `${this.config.host}:${this.config.port}`,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get statistics
    getStats() {
        return {
            isListening: this.isListening,
            config: this.config,
            address: this.isListening ? this.server.address() : null
        };
    }
}

module.exports = UDPService;
