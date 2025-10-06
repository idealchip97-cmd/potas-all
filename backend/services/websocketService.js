const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketService extends EventEmitter {
    constructor() {
        super();
        this.wss = null;
        this.clients = new Set();
        this.isRunning = false;
        this.port = process.env.WS_PORT || 18081;
        this.stats = {
            connectedClients: 0,
            messagesSent: 0,
            messagesReceived: 0,
            startTime: null
        };
    }

    start(server = null) {
        try {
            if (this.isRunning) {
                console.log('⚠️ WebSocket service is already running');
                return;
            }

            // Create WebSocket server
            if (server) {
                // Attach to existing HTTP server
                this.wss = new WebSocket.Server({ server });
                console.log(`🔗 WebSocket server attached to HTTP server`);
            } else {
                // Create standalone WebSocket server
                this.wss = new WebSocket.Server({ port: this.port });
                console.log(`🚀 WebSocket server started on port ${this.port}`);
            }

            this.isRunning = true;
            this.stats.startTime = new Date();

            // Handle new connections
            this.wss.on('connection', (ws, req) => {
                console.log(`📱 New WebSocket client connected from ${req.socket.remoteAddress}`);
                
                this.clients.add(ws);
                this.stats.connectedClients = this.clients.size;
                
                // Send welcome message
                this.sendToClient(ws, {
                    type: 'connection',
                    message: 'Connected to Radar Speed Detection System',
                    timestamp: new Date().toISOString()
                });

                // Handle messages from client
                ws.on('message', (message) => {
                    try {
                        const data = JSON.parse(message.toString());
                        console.log('📨 WebSocket message received:', data.type);
                        this.stats.messagesReceived++;
                        this.handleClientMessage(ws, data);
                    } catch (error) {
                        console.error('❌ Error parsing WebSocket message:', error);
                        this.sendToClient(ws, {
                            type: 'error',
                            message: 'Invalid message format',
                            timestamp: new Date().toISOString()
                        });
                    }
                });

                // Handle client disconnect
                ws.on('close', () => {
                    console.log('📱 WebSocket client disconnected');
                    this.clients.delete(ws);
                    this.stats.connectedClients = this.clients.size;
                });

                // Handle errors
                ws.on('error', (error) => {
                    console.error('❌ WebSocket client error:', error);
                    this.clients.delete(ws);
                    this.stats.connectedClients = this.clients.size;
                });
            });

            this.wss.on('error', (error) => {
                console.error('❌ WebSocket server error:', error);
                this.emit('error', error);
            });

            console.log('✅ WebSocket service started successfully');
            this.emit('started');

        } catch (error) {
            console.error('❌ Failed to start WebSocket service:', error);
            this.emit('error', error);
            throw error;
        }
    }

    stop() {
        return new Promise((resolve) => {
            if (!this.isRunning) {
                resolve();
                return;
            }

            console.log('🛑 Stopping WebSocket service...');

            // Close all client connections
            this.clients.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(1000, 'Server shutting down');
                }
            });

            this.clients.clear();
            this.stats.connectedClients = 0;

            // Close server
            if (this.wss) {
                this.wss.close(() => {
                    this.isRunning = false;
                    console.log('✅ WebSocket service stopped');
                    this.emit('stopped');
                    resolve();
                });
            } else {
                this.isRunning = false;
                resolve();
            }
        });
    }

    handleClientMessage(ws, data) {
        switch (data.type) {
            case 'ping':
                this.sendToClient(ws, {
                    type: 'pong',
                    timestamp: new Date().toISOString()
                });
                break;

            case 'subscribe':
                // Handle subscription to specific data types
                ws.subscriptions = ws.subscriptions || new Set();
                if (data.channels && Array.isArray(data.channels)) {
                    data.channels.forEach(channel => {
                        ws.subscriptions.add(channel);
                        console.log(`📡 Client subscribed to: ${channel}`);
                    });
                }
                this.sendToClient(ws, {
                    type: 'subscribed',
                    channels: Array.from(ws.subscriptions || []),
                    timestamp: new Date().toISOString()
                });
                break;

            case 'unsubscribe':
                if (ws.subscriptions && data.channels && Array.isArray(data.channels)) {
                    data.channels.forEach(channel => {
                        ws.subscriptions.delete(channel);
                        console.log(`📡 Client unsubscribed from: ${channel}`);
                    });
                }
                break;

            case 'request_data':
                // Handle data requests
                this.emit('dataRequest', data.dataType, ws);
                break;

            default:
                console.warn(`❓ Unknown WebSocket message type: ${data.type}`);
        }
    }

    sendToClient(ws, data) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(data));
                this.stats.messagesSent++;
            } catch (error) {
                console.error('❌ Error sending WebSocket message:', error);
            }
        }
    }

    // Broadcast to all connected clients
    broadcast(data, channel = null) {
        const message = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString()
        };

        let sentCount = 0;
        this.clients.forEach(ws => {
            // Check if client is subscribed to this channel
            if (channel && ws.subscriptions && !ws.subscriptions.has(channel)) {
                return;
            }

            this.sendToClient(ws, message);
            sentCount++;
        });

        if (sentCount > 0) {
            console.log(`📡 Broadcasted ${data.type} to ${sentCount} clients${channel ? ` (channel: ${channel})` : ''}`);
        }

        return sentCount;
    }

    // Send radar data updates
    broadcastRadarData(radarData) {
        return this.broadcast({
            type: 'radar_data',
            data: radarData
        }, 'radar');
    }

    // Send fine/violation updates
    broadcastFineData(fineData) {
        return this.broadcast({
            type: 'fine_data',
            data: fineData
        }, 'fines');
    }

    // Send image correlation updates
    broadcastImageCorrelation(correlationData) {
        return this.broadcast({
            type: 'image_correlation',
            data: correlationData
        }, 'images');
    }

    // Send plate recognition results
    broadcastPlateRecognition(plateData) {
        return this.broadcast({
            type: 'plate_recognition',
            data: plateData
        }, 'plates');
    }

    // Send system status updates
    broadcastSystemStatus(statusData) {
        return this.broadcast({
            type: 'system_status',
            data: statusData
        }, 'system');
    }

    // Send correlation cycle completion
    broadcastCorrelationCycle(cycleData) {
        return this.broadcast({
            type: 'correlation_cycle',
            data: cycleData
        }, 'cycle');
    }

    // Get service statistics
    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            port: this.port,
            uptime: this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0
        };
    }

    // Health check
    getHealthStatus() {
        return {
            status: this.isRunning ? 'healthy' : 'stopped',
            connectedClients: this.stats.connectedClients,
            port: this.port,
            uptime: this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0,
            stats: this.stats,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new WebSocketService();
