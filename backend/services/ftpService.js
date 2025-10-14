const FTP = require('ftp');
const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

class FTPService extends EventEmitter {
    constructor() {
        super();
        this.client = new FTP();
        this.isConnected = false;
        this.config = {
            host: process.env.FTP_HOST || '192.168.1.55',
            port: parseInt(process.env.FTP_PORT || '21', 10),
            user: process.env.FTP_USER || 'anonymous',
            password: process.env.FTP_PASSWORD || 'anonymous@',
            connTimeout: 60000,
            pasvTimeout: 60000,
            keepalive: 60000
        };
        // Use IMAGE_BASE_DIR from environment or default to /srv/camera_uploads
        const imageBaseDir = process.env.IMAGE_BASE_DIR || '/srv/camera_uploads';
        this.downloadDir = imageBaseDir;
        this.setupEventHandlers();
        this.ensureDownloadDirectory();
        try {
            console.log(`🔧 FTP config -> host: ${this.config.host}, port: ${this.config.port}, user: ${this.config.user}`);
            console.log(`📁 FTP download dir: ${this.downloadDir}`);
        } catch (_) {}
    }

    setupEventHandlers() {
        this.client.on('ready', () => {
            console.log('✅ FTP Client connected successfully');
            this.isConnected = true;
            this.emit('connected');
        });

        this.client.on('close', () => {
            console.log('⚠️ FTP Connection closed');
            this.isConnected = false;
            this.emit('disconnected');
        });

        this.client.on('error', (err) => {
            console.error('❌ FTP Connection error:', err.message);
            this.isConnected = false;
            this.emit('error', err);
        });
    }

    async ensureDownloadDirectory() {
        try {
            await fs.ensureDir(this.downloadDir);
            console.log(`📁 FTP download directory ready: ${this.downloadDir}`);
        } catch (error) {
            console.error('❌ Failed to create FTP download directory:', error);
        }
    }

    async connect() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve();
                return;
            }

            console.log(`🔗 Connecting to FTP server: ${this.config.host}:${this.config.port}`);
            
            this.client.connect(this.config);
            
            this.client.once('ready', () => {
                resolve();
            });
            
            this.client.once('error', (err) => {
                reject(err);
            });
        });
    }

    async disconnect() {
        if (this.isConnected) {
            this.client.end();
            this.isConnected = false;
        }
    }

    async listFiles(remotePath = '/') {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('FTP client not connected'));
                return;
            }

            this.client.list(remotePath, (err, list) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Filter for image files
                const imageFiles = list.filter(file => {
                    const ext = path.extname(file.name).toLowerCase();
                    return ['.jpg', '.jpeg', '.png', '.bmp', '.gif'].includes(ext);
                });
                
                resolve(imageFiles);
            });
        });
    }

    async downloadFile(remoteFile, localFile = null) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('FTP client not connected'));
                return;
            }

            const localPath = localFile || path.join(this.downloadDir, path.basename(remoteFile));
            
            console.log(`📥 Downloading: ${remoteFile} -> ${localPath}`);
            
            this.client.get(remoteFile, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                const writeStream = fs.createWriteStream(localPath);
                
                stream.pipe(writeStream);
                
                stream.on('end', () => {
                    console.log(`✅ Downloaded: ${path.basename(remoteFile)}`);
                    resolve(localPath);
                });
                
                stream.on('error', (err) => {
                    reject(err);
                });
                
                writeStream.on('error', (err) => {
                    reject(err);
                });
            });
        });
    }

    async downloadAllImages(remotePath = '/') {
        try {
            const files = await this.listFiles(remotePath);
            const downloadPromises = files.map(file => {
                const remoteFilePath = path.posix.join(remotePath, file.name);
                return this.downloadFile(remoteFilePath);
            });
            
            const downloadedFiles = await Promise.allSettled(downloadPromises);
            
            const successful = downloadedFiles
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
                
            const failed = downloadedFiles
                .filter(result => result.status === 'rejected')
                .map(result => result.reason);
                
            if (failed.length > 0) {
                console.warn(`⚠️ Failed to download ${failed.length} files:`, failed);
            }
            
            console.log(`✅ Successfully downloaded ${successful.length} images`);
            return successful;
            
        } catch (error) {
            console.error('❌ Error downloading images:', error);
            throw error;
        }
    }

    async deleteRemoteFile(remoteFile) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('FTP client not connected'));
                return;
            }

            this.client.delete(remoteFile, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log(`🗑️ Deleted remote file: ${remoteFile}`);
                resolve();
            });
        });
    }

    async processNewImages() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            const downloadedFiles = await this.downloadAllImages();
            
            // Emit event for each downloaded file to trigger plate recognition
            for (const filePath of downloadedFiles) {
                this.emit('imageDownloaded', filePath);
            }
            
            return downloadedFiles;
            
        } catch (error) {
            console.error('❌ Error processing new images:', error);
            throw error;
        }
    }

    // Health check method
    async healthCheck() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            await this.listFiles('/');
            return {
                status: 'healthy',
                connected: this.isConnected,
                server: `${this.config.host}:${this.config.port}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message,
                server: `${this.config.host}:${this.config.port}`,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = FTPService;
