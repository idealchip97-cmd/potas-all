const FTPService = require('./ftpService');
const UDPService = require('./udpService');
const CorrelationService = require('./correlationService');
const dataProcessor = require('./dataProcessorService');
const websocketService = require('./websocketService');
const cron = require('node-cron');
const EventEmitter = require('events');

class ExternalDataService extends EventEmitter {
    constructor() {
        super();
        this.ftpService = new FTPService();
        this.udpService = new UDPService();
        this.correlationService = new CorrelationService();
        this.isRunning = false;
        this.cronJobs = [];
        this.stats = {
            startTime: null,
            imagesProcessed: 0,
            radarUpdates: 0,
            finesReceived: 0,
            violationsReceived: 0,
            errors: 0
        };
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // FTP Service Events
        this.ftpService.on('connected', () => {
            console.log('🔗 FTP Service connected');
            this.emit('ftpConnected');
        });

        this.ftpService.on('disconnected', () => {
            console.log('⚠️ FTP Service disconnected');
            this.emit('ftpDisconnected');
        });

        this.ftpService.on('error', (error) => {
            console.error('❌ FTP Service error:', error);
            this.stats.errors++;
            this.emit('ftpError', error);
        });

        this.ftpService.on('imageDownloaded', async (imagePath) => {
            try {
                console.log(`📸 New image downloaded: ${imagePath}`);
                
                // Extract timestamp from image filename or use current time
                const imageTimestamp = this.extractImageTimestamp(imagePath);
                
                // Send to correlation service
                this.correlationService.processNewImage(imagePath, imageTimestamp);
                
                // Also process normally
                const result = await dataProcessor.processImage(imagePath);
                if (result) {
                    this.stats.imagesProcessed++;
                    this.emit('imageProcessed', result);
                    
                    // Broadcast image correlation update
                    websocketService.broadcastImageCorrelation({
                        imagePath,
                        timestamp: imageTimestamp,
                        result
                    });
                }
            } catch (error) {
                console.error('❌ Error processing downloaded image:', error);
                this.stats.errors++;
            }
        });

        // UDP Service Events
        this.udpService.on('listening', (address) => {
            console.log(`📡 UDP Service listening on ${address.address}:${address.port}`);
            this.emit('udpListening', address);
        });

        this.udpService.on('closed', () => {
            console.log('⚠️ UDP Service closed');
            this.emit('udpClosed');
        });

        this.udpService.on('error', (error) => {
            console.error('❌ UDP Service error:', error);
            this.stats.errors++;
            this.emit('udpError', error);
        });

        this.udpService.on('radarData', async (data) => {
            try {
                console.log('📡 Radar data received:', data);
                const result = await dataProcessor.processRadarData(data);
                if (result) {
                    this.stats.radarUpdates++;
                    this.emit('radarProcessed', result);
                    
                    // Broadcast to WebSocket clients
                    websocketService.broadcastRadarData(result);
                }
            } catch (error) {
                console.error('❌ Error processing radar data:', error);
                this.stats.errors++;
            }
        });

        this.udpService.on('fineData', async (data) => {
            try {
                console.log('🚨 Fine data received:', data);
                const result = await dataProcessor.processFineData(data);
                if (result) {
                    this.stats.finesReceived++;
                    this.emit('fineProcessed', result);
                    
                    // Broadcast to WebSocket clients
                    websocketService.broadcastFineData(result);
                }
            } catch (error) {
                console.error('❌ Error processing fine data:', error);
                this.stats.errors++;
            }
        });

        this.udpService.on('violationData', async (data) => {
            try {
                console.log('⚖️ Violation data received:', data);
                const result = await dataProcessor.processViolationData(data);
                if (result) {
                    this.stats.violationsReceived++;
                    this.emit('violationProcessed', result);
                }
            } catch (error) {
                console.error('❌ Error processing violation data:', error);
                this.stats.errors++;
            }
        });

        // Handle radar violations for correlation
        this.udpService.on('radarViolation', async (data) => {
            try {
                console.log('🚨 Radar violation received for correlation:', data);
                this.correlationService.processRadarViolation(data);
                this.stats.violationsReceived++;
            } catch (error) {
                console.error('❌ Error processing radar violation:', error);
                this.stats.errors++;
            }
        });

        // Handle correlated violations
        this.correlationService.on('correlatedViolation', async (violation) => {
            try {
                console.log('🎯 Correlated violation created:', violation.id);
                const result = await dataProcessor.processCorrelatedViolation(violation);
                if (result) {
                    this.emit('correlatedViolationProcessed', result);
                    
                    // Broadcast correlation cycle completion
                    websocketService.broadcastCorrelationCycle({
                        violation: result,
                        correlationId: violation.id,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('❌ Error processing correlated violation:', error);
                this.stats.errors++;
            }
        });

        this.udpService.on('unknownData', (data) => {
            console.warn('❓ Unknown UDP data received:', data);
            this.emit('unknownData', data);
        });
    }

    async start() {
        try {
            console.log('🚀 Starting External Data Service...');
            this.isRunning = true;
            this.stats.startTime = new Date();

            // Start UDP service first
            console.log('📡 Starting UDP service...');
            await this.udpService.start();

            // Connect to FTP service
            console.log('🔗 Connecting to FTP service...');
            await this.ftpService.connect();

            // Setup periodic tasks
            this.setupCronJobs();

            console.log('✅ External Data Service started successfully');
            this.emit('started');

        } catch (error) {
            console.error('❌ Failed to start External Data Service:', error);
            this.stats.errors++;
            this.emit('error', error);
            throw error;
        }
    }

    async stop() {
        try {
            console.log('🛑 Stopping External Data Service...');
            this.isRunning = false;

            // Stop cron jobs
            this.cronJobs.forEach(job => job.destroy());
            this.cronJobs = [];

            // Stop services
            await this.udpService.stop();
            await this.ftpService.disconnect();

            console.log('✅ External Data Service stopped');
            this.emit('stopped');

        } catch (error) {
            console.error('❌ Error stopping External Data Service:', error);
            this.stats.errors++;
            throw error;
        }
    }

    setupCronJobs() {
        // Check for new images every 5 minutes
        const imageCheckJob = cron.schedule('*/5 * * * *', async () => {
            if (this.isRunning) {
                try {
                    console.log('⏰ Scheduled FTP image check...');
                    await this.ftpService.processNewImages();
                } catch (error) {
                    console.error('❌ Scheduled FTP check failed:', error);
                    this.stats.errors++;
                }
            }
        }, {
            scheduled: false
        });

        // Clean up processed messages every hour
        const cleanupJob = cron.schedule('0 * * * *', () => {
            if (this.isRunning) {
                console.log('⏰ Scheduled cleanup...');
                dataProcessor.cleanupProcessedMessages();
            }
        }, {
            scheduled: false
        });

        // Health check every 10 minutes
        const healthCheckJob = cron.schedule('*/10 * * * *', async () => {
            if (this.isRunning) {
                try {
                    console.log('⏰ Scheduled health check...');
                    const health = await this.getHealthStatus();
                    this.emit('healthCheck', health);
                } catch (error) {
                    console.error('❌ Health check failed:', error);
                    this.stats.errors++;
                }
            }
        }, {
            scheduled: false
        });

        // Start all cron jobs
        imageCheckJob.start();
        cleanupJob.start();
        healthCheckJob.start();

        this.cronJobs = [imageCheckJob, cleanupJob, healthCheckJob];
        console.log('⏰ Cron jobs scheduled');
    }

    async getHealthStatus() {
        try {
            const ftpHealth = await this.ftpService.healthCheck();
            const udpHealth = await this.udpService.healthCheck();
            const processorStats = dataProcessor.getStats();

            return {
                status: (ftpHealth.status === 'healthy' && udpHealth.status === 'healthy') ? 'healthy' : 'degraded',
                services: {
                    ftp: ftpHealth,
                    udp: udpHealth,
                    processor: processorStats
                },
                stats: this.stats,
                uptime: this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async manualImageCheck() {
        try {
            console.log('🔍 Manual FTP image check initiated...');
            return await this.ftpService.processNewImages();
        } catch (error) {
            console.error('❌ Manual FTP check failed:', error);
            this.stats.errors++;
            throw error;
        }
    }

    async sendTestUDPMessage(message) {
        try {
            console.log('📤 Sending test UDP message...');
            return await this.udpService.sendMessage(message);
        } catch (error) {
            console.error('❌ Failed to send test UDP message:', error);
            throw error;
        }
    }

    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            uptime: this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0,
            services: {
                ftp: this.ftpService.isConnected,
                udp: this.udpService.isListening
            }
        };
    }

    // Reset all statistics (for testing)
    resetStats() {
        this.stats = {
            startTime: this.stats.startTime,
            imagesProcessed: 0,
            radarUpdates: 0,
            finesReceived: 0,
            violationsReceived: 0,
            errors: 0
        };
        dataProcessor.reset();
        console.log('📊 Statistics reset');
    }

    // Extract timestamp from image filename
    extractImageTimestamp(imagePath) {
        const filename = require('path').basename(imagePath);
        
        // Try to extract timestamp from filename (format: YYYYMMDDHHMMSS.jpg)
        const timestampMatch = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
        if (timestampMatch) {
            const [, year, month, day, hour, minute, second] = timestampMatch;
            return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
        }
        
        // Fallback to current time
        return new Date().toISOString();
    }

    // Get correlation statistics
    getCorrelationStats() {
        return this.correlationService.getStats();
    }

    // Trigger manual correlation
    async triggerManualCorrelation() {
        return await this.correlationService.triggerManualCorrelation();
    }
}

module.exports = new ExternalDataService();
