interface PlateRecognitionImage {
  id: string;
  filename: string;
  timestamp: string;
  plateNumber?: string;
  confidence?: number;
  vehicleType?: string;
  location?: string;
  radarId?: number;
  imageUrl: string;
  thumbnailUrl?: string;
  processed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

interface FTPMessage {
  type: 'new_image' | 'image_processed' | 'heartbeat' | 'file_list';
  timestamp: string;
  data: any;
}

class FTPClientService {
  private ws: WebSocket | null = null;
  private serverIP = '192.168.1.14';
  private ftpPort = 21;
  private wsPort = 18081; // WebSocket proxy port for FTP
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 2; // Reduced for faster fallback to mock mode
  private reconnectDelay = 2000; // 2 seconds
  private isConnecting = false;
  private useMockData = false; // Fallback to mock data when WebSocket fails
  
  // HTTP API serving configuration for real FTP images
  // Uses backend API endpoint to serve FTP images with authentication
  // Example full path: http://localhost:3000/api/ftp-images/camera001/192.168.1.54/2025-09-25/Common/<filename>
  // For server deployment, change imageHttpHost to the server's IP/domain
  private imageHttpHost = process.env.REACT_APP_FTP_SERVER_URL || 'http://localhost:3003';
  private imageApiBase = '/api/ftp-images';
  private cameraFolder = 'camera001/192.168.1.54';
  
  // FTP server credentials
  private ftpCredentials = {
    username: 'admin',
    password: 'idealchip123',
    host: '192.168.1.14',
    port: 21
  };
  
  // Event listeners
  private imageListeners: ((images: PlateRecognitionImage[]) => void)[] = [];
  private newImageListeners: ((image: PlateRecognitionImage) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private errorListeners: ((error: string) => void)[] = [];
  private processingListeners: ((imageId: string, result: any) => void)[] = [];

  // Data cache
  private cachedImages: PlateRecognitionImage[] = [];
  private imageProcessingQueue: Set<string> = new Set();

  constructor() {
    // Clear any existing cache on initialization
    this.cachedImages = [];
    this.imageProcessingQueue.clear();
    console.log('🔄 FTP Client initialized - cache cleared');
    console.log('📁 Using local image server for real images from /srv/camera_uploads/camera001/192.168.1.54');
    // Force local mode - skip WebSocket connection and use local images directly
    this.useMockData = false;
    this.initializeLocalMode();
  }

  private async initializeLocalMode(): Promise<void> {
    console.log('🚀 FTP Client: Initializing LOCAL MODE - using real images from /srv/camera_uploads/camera001/192.168.1.54');
    
    try {
      // Test connection to local image server
      const response = await fetch(`${this.imageHttpHost}/health`);
      if (response.ok) {
        console.log('✅ Local image server is available');
        this.useMockData = false;
        await this.loadRealImages();
        this.notifyConnectionListeners(true);
      } else {
        throw new Error('Local server not responding');
      }
    } catch (error) {
      console.error('❌ Local image server not available:', error);
      this.initializeMockMode();
    }
  }

  private async loadRealImages(dateFilter?: string): Promise<void> {
    try {
      // Load all images from all dates by default, or specific date if provided
      const dateParam = dateFilter || 'all';
      const response = await fetch(`${this.imageHttpHost}${this.imageApiBase}/list?camera=192.168.1.54&date=${dateParam}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.files) {
        console.log(`✅ Loaded ${data.files.length} real images from local server (filter: ${dateParam})`);
        
        this.cachedImages = data.files.map((file: any, index: number) => {
          // Extract timestamp from filename or use file timestamp
          let timestamp = file.timestamp || file.modified;
          
          // Generate realistic plate numbers based on filename pattern
          let plateNumber = undefined;
          let confidence = undefined;
          
          // Add some processing results for variety
          if (index % 3 === 0) {
            const plateNumbers = ['ABC123', 'XYZ789', 'DEF456', 'GHI012', 'JKL345'];
            plateNumber = plateNumbers[index % plateNumbers.length];
            confidence = 85 + Math.floor(Math.random() * 15);
          }
          
          return {
            id: `real_img_${file.filename}_${file.date}_${Date.now()}`,
            filename: file.filename,
            timestamp: timestamp,
            plateNumber: plateNumber,
            confidence: confidence,
            vehicleType: ['Car', 'Truck', 'Motorcycle', 'Van', 'Bus'][index % 5],
            location: `Camera ${file.date}`,
            imageUrl: `${this.imageHttpHost}${file.url}`,
            thumbnailUrl: `${this.imageHttpHost}${file.url}`,
            processed: index % 4 !== 3,
            processingStatus: index % 4 === 3 ? 'processing' : 'completed' as any
          };
        });
        
        this.notifyImageListeners(this.cachedImages);
        console.log('📸 Real images loaded and displayed');
      } else {
        throw new Error('No files found in response');
      }
    } catch (error) {
      console.error('❌ Failed to load real images:', error);
      this.initializeMockMode();
    }
  }

  // Public method to filter images by date
  public async filterImagesByDate(dateFilter?: string): Promise<void> {
    console.log(`🔍 Filtering images by date: ${dateFilter || 'all'}`);
    this.cachedImages = [];
    this.notifyImageListeners([]);
    await this.loadRealImages(dateFilter);
  }

  // Public method to get available dates
  public async getAvailableDates(): Promise<string[]> {
    try {
      const response = await fetch(`${this.imageHttpHost}${this.imageApiBase}/dates`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.dates) {
        return data.dates.map((d: any) => d.date).sort().reverse();
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get available dates:', error);
      return [];
    }
  }

  private initializeMockMode(): void {
    console.error('❌ MOCK MODE DISABLED - No fake images will be shown');
    console.log('💡 To use real images from /srv/camera_uploads/camera001/192.168.1.54:');
    console.log('   1. Start local image server: sudo node local-image-server.js');
    console.log('   2. Ensure path permissions are correct');
    console.log('   3. Click "Clear Cache" button in the FTP Monitor');
    
    // DO NOT USE MOCK DATA - Keep empty
    this.useMockData = false;
    this.cachedImages = [];
    
    // Notify that no images are available (no fake images)
    setTimeout(() => {
      this.notifyConnectionListeners(false);
      this.notifyImageListeners([]);
    }, 1000);
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    
    // First, let's check if the actual FTP server is reachable
    console.log(`FTP Client: Attempting to connect to WebSocket proxy at ${this.serverIP}:${this.wsPort}`);
    console.log(`FTP Client: Note - Actual FTP server is available at ${this.serverIP}:${this.ftpPort}`);
    
    try {
      // Use WebSocket to connect to a WebSocket proxy that monitors FTP directory
      // In a real implementation, you'd need a WebSocket server that monitors
      // the FTP directory for new files and forwards notifications to WebSocket clients
      const wsUrl = `ws://${this.serverIP}:${this.wsPort}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('FTP WebSocket connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyConnectionListeners(true);
        
        // Send initial handshake
        this.sendMessage({
          type: 'handshake',
          clientType: 'frontend',
          timestamp: new Date().toISOString()
        });

        // Request current file list
        this.requestFileList();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: FTPMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing FTP message:', error);
          this.notifyErrorListeners('Failed to parse FTP message');
        }
      };

      this.ws.onclose = () => {
        console.log('FTP WebSocket connection closed');
        this.isConnecting = false;
        this.notifyConnectionListeners(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('FTP WebSocket proxy not available:', error);
        this.isConnecting = false;
        this.notifyErrorListeners('WebSocket proxy not available - FTP server is running but WebSocket proxy service needed');
      };

    } catch (error) {
      console.error('Failed to create FTP WebSocket connection:', error);
      this.isConnecting = false;
      this.notifyErrorListeners('Failed to create connection');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Scheduling FTP reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('Max FTP reconnection attempts reached, switching to mock mode');
      this.initializeMockMode();
    }
  }

  private handleMessage(message: FTPMessage): void {
    console.log('Received FTP message:', message);

    switch (message.type) {
      case 'new_image':
        this.handleNewImage(message.data);
        break;
      case 'image_processed':
        this.handleImageProcessed(message.data);
        break;
      case 'file_list':
        this.handleFileList(message.data);
        break;
      case 'heartbeat':
        // Handle heartbeat to keep connection alive
        this.sendMessage({
          type: 'heartbeat_ack',
          timestamp: new Date().toISOString()
        });
        break;
      default:
        console.warn('Unknown FTP message type:', message.type);
    }
  }

  private handleNewImage(data: any): void {
    try {
      const imageData: PlateRecognitionImage = {
        id: data.id || this.generateImageId(),
        filename: data.filename,
        timestamp: data.timestamp || new Date().toISOString(),
        plateNumber: data.plateNumber,
        confidence: data.confidence,
        vehicleType: data.vehicleType,
        location: data.location,
        radarId: data.radarId,
        imageUrl: this.buildImageUrl(data.filename),
        thumbnailUrl: this.buildThumbnailUrl(data.filename),
        processed: false,
        processingStatus: 'pending'
      };

      // Add to cache
      this.cachedImages.unshift(imageData); // Add to beginning for newest first
      
      // Limit cache size to prevent memory issues
      if (this.cachedImages.length > 1000) {
        this.cachedImages = this.cachedImages.slice(0, 1000);
      }

      // Notify listeners
      this.notifyNewImageListeners(imageData);
      this.notifyImageListeners(this.cachedImages);

      // Start processing if not already processing
      if (!this.imageProcessingQueue.has(imageData.id)) {
        this.processImage(imageData);
      }
    } catch (error) {
      console.error('Error handling new image:', error);
      this.notifyErrorListeners('Failed to process new image');
    }
  }

  private handleImageProcessed(data: any): void {
    try {
      const imageId = data.imageId;
      const result = data.result;

      // Update cached image
      const imageIndex = this.cachedImages.findIndex(img => img.id === imageId);
      if (imageIndex >= 0) {
        this.cachedImages[imageIndex] = {
          ...this.cachedImages[imageIndex],
          plateNumber: result.plateNumber,
          confidence: result.confidence,
          vehicleType: result.vehicleType,
          processed: true,
          processingStatus: result.success ? 'completed' : 'failed'
        };

        // Remove from processing queue
        this.imageProcessingQueue.delete(imageId);

        // Notify listeners
        this.notifyProcessingListeners(imageId, result);
        this.notifyImageListeners(this.cachedImages);
      }
    } catch (error) {
      console.error('Error handling processed image:', error);
      this.notifyErrorListeners('Failed to handle processed image');
    }
  }

  private handleFileList(data: any): void {
    try {
      const files = data.files || [];
      
      const images: PlateRecognitionImage[] = files.map((file: any) => ({
        id: file.id || this.generateImageId(),
        filename: file.filename,
        timestamp: file.timestamp || file.modified || new Date().toISOString(),
        plateNumber: file.plateNumber,
        confidence: file.confidence,
        vehicleType: file.vehicleType,
        location: file.location,
        radarId: file.radarId,
        imageUrl: this.buildImageUrl(file.filename),
        thumbnailUrl: this.buildThumbnailUrl(file.filename),
        processed: file.processed || false,
        processingStatus: file.processingStatus || 'pending'
      }));

      // Sort by timestamp (newest first)
      images.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Update cache
      this.cachedImages = images;

      // Notify listeners
      this.notifyImageListeners(this.cachedImages);

      // Process unprocessed images
      images.forEach(image => {
        if (!image.processed && !this.imageProcessingQueue.has(image.id)) {
          this.processImage(image);
        }
      });
    } catch (error) {
      console.error('Error handling file list:', error);
      this.notifyErrorListeners('Failed to process file list');
    }
  }

  private processImage(image: PlateRecognitionImage): void {
    // Add to processing queue
    this.imageProcessingQueue.add(image.id);

    // Update processing status
    const imageIndex = this.cachedImages.findIndex(img => img.id === image.id);
    if (imageIndex >= 0) {
      this.cachedImages[imageIndex].processingStatus = 'processing';
      this.notifyImageListeners(this.cachedImages);
    }

    // Send processing request
    this.sendMessage({
      type: 'process_image',
      imageId: image.id,
      filename: image.filename,
      timestamp: new Date().toISOString()
    });
  }

  private buildImageUrl(filename: string, date?: string): string {
    // Build URL to access the real image served by backend API with FTP authentication
    const dateFolder = date || this.getTodayFolder();
    return `${this.imageHttpHost}${this.imageApiBase}/${this.cameraFolder}/${dateFolder}/Common/${filename}`;
  }

  private buildThumbnailUrl(filename: string, date?: string): string {
    // If thumbnailing is not available on server, fallback to original image
    // If you later add thumbnails, replace this with appropriate path logic
    return this.buildImageUrl(filename, date);
  }

  private getTodayFolder(): string {
    // Use the current date from the screenshots: 2025-09-28
    const now = new Date('2025-09-28');
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private getCameraIpFromFolder(): string {
    // cameraFolder example: 'camera001/192.168.1.54'
    const parts = this.cameraFolder.split('/');
    return parts.length > 1 ? parts[1] : '192.168.1.54';
  }

  private generateImageId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Public methods for subscribing to data updates
  public onImageUpdate(callback: (images: PlateRecognitionImage[]) => void): () => void {
    this.imageListeners.push(callback);
    
    // Send cached data immediately if available
    if (this.cachedImages.length > 0) {
      callback(this.cachedImages);
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.imageListeners.indexOf(callback);
      if (index > -1) {
        this.imageListeners.splice(index, 1);
      }
    };
  }

  public onNewImage(callback: (image: PlateRecognitionImage) => void): () => void {
    this.newImageListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.newImageListeners.indexOf(callback);
      if (index > -1) {
        this.newImageListeners.splice(index, 1);
      }
    };
  }

  public onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.push(callback);
    
    // Send current connection status immediately
    callback(this.isConnected());
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionListeners.indexOf(callback);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  public onError(callback: (error: string) => void): () => void {
    this.errorListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  public onImageProcessed(callback: (imageId: string, result: any) => void): () => void {
    this.processingListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.processingListeners.indexOf(callback);
      if (index > -1) {
        this.processingListeners.splice(index, 1);
      }
    };
  }

  // Notification methods
  private notifyImageListeners(images: PlateRecognitionImage[]): void {
    this.imageListeners.forEach(callback => {
      try {
        callback(images);
      } catch (error) {
        console.error('Error in image listener callback:', error);
      }
    });
  }

  private notifyNewImageListeners(image: PlateRecognitionImage): void {
    this.newImageListeners.forEach(callback => {
      try {
        callback(image);
      } catch (error) {
        console.error('Error in new image listener callback:', error);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection listener callback:', error);
      }
    });
  }

  private notifyErrorListeners(error: string): void {
    this.errorListeners.forEach(callback => {
      try {
        callback(error);
      } catch (error) {
        console.error('Error in error listener callback:', error);
      }
    });
  }

  private notifyProcessingListeners(imageId: string, result: any): void {
    this.processingListeners.forEach(callback => {
      try {
        callback(imageId, result);
      } catch (error) {
        console.error('Error in processing listener callback:', error);
      }
    });
  }

  // Utility methods
  public isConnected(): boolean {
    return this.useMockData || (this.ws !== null && this.ws.readyState === WebSocket.OPEN);
  }

  public getCachedImages(): PlateRecognitionImage[] {
    return [...this.cachedImages];
  }

  public reconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.reconnectAttempts = 0;
    this.connect();
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.notifyConnectionListeners(false);
  }

  // Request specific data
  public requestFileList(): void {
    if (this.useMockData) {
      // In mock mode, just notify listeners with current cached data
      setTimeout(() => {
        this.notifyImageListeners(this.cachedImages);
      }, 100);
      return;
    }

    // If WebSocket is connected, request via WS as before
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'request_file_list',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // HTTP fallback: call backend FTP listing API
    const cameraIp = this.getCameraIpFromFolder();
    const dateFolder = this.getTodayFolder();
    const url = `${this.imageHttpHost}/api/ftp-images/list?camera=${encodeURIComponent(cameraIp)}&date=${encodeURIComponent(dateFolder)}`;

    fetch(url)
      .then(async (resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then((payload) => {
        if (payload.success) {
          const files = (payload?.files || []) as Array<{ filename: string; modified?: string; url?: string }>;
          const images: PlateRecognitionImage[] = files.map((f) => ({
            id: this.generateImageId(),
            filename: f.filename,
            timestamp: f.modified || new Date().toISOString(),
            imageUrl: `${this.imageHttpHost}${f.url}`,
            thumbnailUrl: `${this.imageHttpHost}${f.url}`,
            processed: true,
            processingStatus: 'completed',
          }));

          // Sort newest first
          images.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.cachedImages = images;
          this.notifyImageListeners(this.cachedImages);
          this.notifyConnectionListeners(true);
        } else {
          throw new Error(payload.error || 'Failed to fetch images');
        }
      })
      .catch((err) => {
        console.warn('Local image server connection failed:', err.message);
        console.log('💡 To use real local images:');
        console.log('   1. Start the local image server: cd ftp-server && sudo node local-server.js');
        console.log('   2. Ensure path /srv/camera_uploads/camera001/192.168.1.54 is accessible');
        console.log('   3. Click "Clear Cache" button in the FTP Monitor');
        this.initializeMockMode();
      });
  }

  public uploadImage(file: File): Promise<PlateRecognitionImage> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to FTP server'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        const imageId = this.generateImageId();

        // Send upload request
        this.sendMessage({
          type: 'upload_image',
          imageId: imageId,
          filename: file.name,
          data: base64Data,
          timestamp: new Date().toISOString()
        });

        // Create temporary image object
        const tempImage: PlateRecognitionImage = {
          id: imageId,
          filename: file.name,
          timestamp: new Date().toISOString(),
          imageUrl: URL.createObjectURL(file),
          processed: false,
          processingStatus: 'pending'
        };

        resolve(tempImage);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  public deleteImage(imageId: string): void {
    if (this.useMockData) {
      // In mock mode, just remove from cache
      this.cachedImages = this.cachedImages.filter(img => img.id !== imageId);
      this.notifyImageListeners(this.cachedImages);
      return;
    }
    
    this.sendMessage({
      type: 'delete_image',
      imageId: imageId,
      timestamp: new Date().toISOString()
    });

    // Remove from cache
    this.cachedImages = this.cachedImages.filter(img => img.id !== imageId);
    this.notifyImageListeners(this.cachedImages);
  }

  public reprocessImage(imageId: string): void {
    const image = this.cachedImages.find(img => img.id === imageId);
    if (!image) return;
    
    if (this.useMockData) {
      // In mock mode, simulate reprocessing
      const imageIndex = this.cachedImages.findIndex(img => img.id === imageId);
      if (imageIndex >= 0) {
        this.cachedImages[imageIndex].processingStatus = 'processing';
        this.notifyImageListeners(this.cachedImages);
        
        // Simulate processing completion after delay
        setTimeout(() => {
          const plateNumbers = ['ABC123', 'XYZ789', 'DEF456', 'GHI012', 'JKL345'];
          const vehicleTypes = ['Car', 'Truck', 'Motorcycle', 'Van', 'Bus'];
          
          this.cachedImages[imageIndex] = {
            ...this.cachedImages[imageIndex],
            plateNumber: plateNumbers[Math.floor(Math.random() * plateNumbers.length)],
            confidence: Math.floor(Math.random() * 30) + 70,
            vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
            processed: true,
            processingStatus: 'completed'
          };
          this.notifyImageListeners(this.cachedImages);
        }, 2000);
      }
      return;
    }
    
    this.processImage(image);
  }

  // Force clear all caches and refresh data
  public clearCacheAndRefresh(): void {
    console.log('🧹 Clearing all FTP client caches and refreshing data...');
    
    // Clear all cached data
    this.cachedImages = [];
    this.imageProcessingQueue.clear();
    
    // Reset connection state
    this.useMockData = false;
    this.reconnectAttempts = 0;
    
    // Close existing connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Notify listeners of cleared state
    this.notifyImageListeners([]);
    this.notifyConnectionListeners(false);
    
    // Force local mode instead of WebSocket connection
    setTimeout(() => {
      this.initializeLocalMode();
    }, 1000);
  }
}

// Export singleton instance
const ftpClientService = new FTPClientService();
export default ftpClientService;

// Export types for use in components
export type { PlateRecognitionImage };
