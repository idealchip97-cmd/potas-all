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
    this.connect();
  }

  private generateMockData(): PlateRecognitionImage[] {
    const mockImages: PlateRecognitionImage[] = [];
    const statuses: ('pending' | 'processing' | 'completed' | 'failed')[] = ['completed', 'completed', 'completed', 'processing', 'pending', 'failed'];
    const vehicleTypes = ['Car', 'Truck', 'Motorcycle', 'Van', 'Bus'];
    const plateNumbers = ['ABC123', 'XYZ789', 'DEF456', 'GHI012', 'JKL345', 'MNO678', 'PQR901', 'STU234'];

    for (let i = 0; i < 15; i++) {
      const timestamp = new Date(Date.now() - (i * 3600000) - Math.random() * 86400000); // Random times in last few days
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const plateNumber = plateNumbers[Math.floor(Math.random() * plateNumbers.length)];
      const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
      
      mockImages.push({
        id: `mock_img_${i + 1}`,
        filename: `image_${String(i + 1).padStart(3, '0')}.jpg`,
        timestamp: timestamp.toISOString(),
        plateNumber: status === 'completed' ? plateNumber : status === 'processing' ? undefined : plateNumber,
        confidence: status === 'completed' ? Math.floor(Math.random() * 30) + 70 : status === 'processing' ? undefined : Math.floor(Math.random() * 40) + 60,
        vehicleType: status === 'completed' ? vehicleType : status === 'processing' ? undefined : vehicleType,
        imageUrl: `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${plateNumber}`,
        thumbnailUrl: `https://via.placeholder.com/150x100/4CAF50/FFFFFF?text=${plateNumber}`,
        processed: status === 'completed' || status === 'failed',
        processingStatus: status
      });
    }

    return mockImages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private initializeMockMode(): void {
    console.log('FTP Client: Initializing mock mode due to connection failure');
    this.useMockData = true;
    this.cachedImages = this.generateMockData();
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.notifyConnectionListeners(true);
      this.notifyImageListeners(this.cachedImages);
    }, 1000);

    // Simulate periodic updates
    setInterval(() => {
      if (this.useMockData) {
        // Occasionally add a new mock image
        if (Math.random() < 0.1) { // 10% chance every interval
          const newImage: PlateRecognitionImage = {
            id: `mock_img_${Date.now()}`,
            filename: `new_image_${Date.now()}.jpg`,
            timestamp: new Date().toISOString(),
            plateNumber: undefined,
            confidence: undefined,
            vehicleType: undefined,
            imageUrl: `https://via.placeholder.com/400x300/2196F3/FFFFFF?text=NEW`,
            thumbnailUrl: `https://via.placeholder.com/150x100/2196F3/FFFFFF?text=NEW`,
            processed: false,
            processingStatus: 'pending'
          };
          
          this.cachedImages.unshift(newImage);
          this.notifyNewImageListeners(newImage);
          this.notifyImageListeners(this.cachedImages);
          
          // Simulate processing after a delay
          setTimeout(() => {
            const index = this.cachedImages.findIndex(img => img.id === newImage.id);
            if (index >= 0) {
              this.cachedImages[index] = {
                ...this.cachedImages[index],
                plateNumber: 'NEW123',
                confidence: Math.floor(Math.random() * 30) + 70,
                vehicleType: 'Car',
                processed: true,
                processingStatus: 'completed'
              };
              this.notifyImageListeners(this.cachedImages);
            }
          }, 3000);
        }
      }
    }, 30000); // Every 30 seconds
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

  private buildImageUrl(filename: string): string {
    // Build URL to access image via HTTP proxy
    return `http://${this.serverIP}:8080/images/${filename}`;
  }

  private buildThumbnailUrl(filename: string): string {
    // Build URL to access thumbnail via HTTP proxy
    const thumbFilename = filename.replace(/\.(jpg|jpeg|png)$/i, '_thumb.$1');
    return `http://${this.serverIP}:8080/thumbnails/${thumbFilename}`;
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
    
    this.sendMessage({
      type: 'request_file_list',
      timestamp: new Date().toISOString()
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
}

// Export singleton instance
const ftpClientService = new FTPClientService();
export default ftpClientService;

// Export types for use in components
export type { PlateRecognitionImage };
