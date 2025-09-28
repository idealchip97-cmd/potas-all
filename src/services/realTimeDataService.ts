import udpClient from './udpClient';
import ftpClient from './ftpClient';
import { Radar, Fine } from '../types';
import { PlateRecognitionImage } from './ftpClient';

interface ConnectionStatus {
  udp: boolean;
  ftp: boolean;
  overall: boolean;
}

interface DataSyncStatus {
  lastRadarUpdate: string | null;
  lastFineUpdate: string | null;
  lastImageUpdate: string | null;
  totalRadars: number;
  totalFines: number;
  totalImages: number;
}

class RealTimeDataService {
  private connectionStatus: ConnectionStatus = {
    udp: false,
    ftp: false,
    overall: false
  };

  private dataSyncStatus: DataSyncStatus = {
    lastRadarUpdate: null,
    lastFineUpdate: null,
    lastImageUpdate: null,
    totalRadars: 0,
    totalFines: 0,
    totalImages: 0
  };

  // Event listeners
  private connectionListeners: ((status: ConnectionStatus) => void)[] = [];
  private syncStatusListeners: ((status: DataSyncStatus) => void)[] = [];
  private errorListeners: ((error: string, source: 'udp' | 'ftp' | 'sync') => void)[] = [];

  // Unsubscribe functions
  private unsubscribeFunctions: (() => void)[] = [];

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Subscribe to UDP client events
    const unsubscribeUdpConnection = udpClient.onConnectionChange((connected) => {
      this.connectionStatus.udp = connected;
      this.updateOverallConnectionStatus();
      this.notifyConnectionListeners();
    });

    const unsubscribeUdpRadars = udpClient.onRadarUpdate((radars) => {
      this.dataSyncStatus.lastRadarUpdate = new Date().toISOString();
      this.dataSyncStatus.totalRadars = radars.length;
      this.notifySyncStatusListeners();
    });

    const unsubscribeUdpFines = udpClient.onFineUpdate((fines) => {
      this.dataSyncStatus.lastFineUpdate = new Date().toISOString();
      this.dataSyncStatus.totalFines = fines.length;
      this.notifySyncStatusListeners();
    });

    const unsubscribeUdpErrors = udpClient.onError((error) => {
      this.notifyErrorListeners(error, 'udp');
    });

    // Subscribe to FTP client events
    const unsubscribeFtpConnection = ftpClient.onConnectionChange((connected) => {
      this.connectionStatus.ftp = connected;
      this.updateOverallConnectionStatus();
      this.notifyConnectionListeners();
    });

    const unsubscribeFtpImages = ftpClient.onImageUpdate((images) => {
      this.dataSyncStatus.lastImageUpdate = new Date().toISOString();
      this.dataSyncStatus.totalImages = images.length;
      this.notifySyncStatusListeners();
    });

    const unsubscribeFtpErrors = ftpClient.onError((error) => {
      this.notifyErrorListeners(error, 'ftp');
    });

    // Store unsubscribe functions
    this.unsubscribeFunctions = [
      unsubscribeUdpConnection,
      unsubscribeUdpRadars,
      unsubscribeUdpFines,
      unsubscribeUdpErrors,
      unsubscribeFtpConnection,
      unsubscribeFtpImages,
      unsubscribeFtpErrors
    ];

    // Start periodic sync status updates
    this.startPeriodicUpdates();
  }

  private updateOverallConnectionStatus(): void {
    this.connectionStatus.overall = this.connectionStatus.udp && this.connectionStatus.ftp;
  }

  private startPeriodicUpdates(): void {
    // Request data updates every 30 seconds
    setInterval(() => {
      if (this.connectionStatus.udp) {
        udpClient.requestRadarData();
        udpClient.requestFineData();
      }

      if (this.connectionStatus.ftp) {
        ftpClient.requestFileList();
      }
    }, 30000);

    // Initial data request after a short delay
    setTimeout(() => {
      if (this.connectionStatus.udp) {
        udpClient.requestRadarData();
        udpClient.requestFineData();
      }

      if (this.connectionStatus.ftp) {
        ftpClient.requestFileList();
      }
    }, 2000);
  }

  // Public methods for subscribing to events
  public onConnectionChange(callback: (status: ConnectionStatus) => void): () => void {
    this.connectionListeners.push(callback);
    
    // Send current status immediately
    callback(this.connectionStatus);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionListeners.indexOf(callback);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  public onSyncStatusChange(callback: (status: DataSyncStatus) => void): () => void {
    this.syncStatusListeners.push(callback);
    
    // Send current status immediately
    callback(this.dataSyncStatus);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncStatusListeners.indexOf(callback);
      if (index > -1) {
        this.syncStatusListeners.splice(index, 1);
      }
    };
  }

  public onError(callback: (error: string, source: 'udp' | 'ftp' | 'sync') => void): () => void {
    this.errorListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  // Notification methods
  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback(this.connectionStatus);
      } catch (error) {
        console.error('Error in connection listener callback:', error);
      }
    });
  }

  private notifySyncStatusListeners(): void {
    this.syncStatusListeners.forEach(callback => {
      try {
        callback(this.dataSyncStatus);
      } catch (error) {
        console.error('Error in sync status listener callback:', error);
      }
    });
  }

  private notifyErrorListeners(error: string, source: 'udp' | 'ftp' | 'sync'): void {
    this.errorListeners.forEach(callback => {
      try {
        callback(error, source);
      } catch (error) {
        console.error('Error in error listener callback:', error);
      }
    });
  }

  // Utility methods
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  public getSyncStatus(): DataSyncStatus {
    return { ...this.dataSyncStatus };
  }

  public isFullyConnected(): boolean {
    return this.connectionStatus.overall;
  }

  public reconnectAll(): void {
    try {
      udpClient.reconnect();
      ftpClient.reconnect();
    } catch (error) {
      this.notifyErrorListeners('Failed to reconnect services', 'sync');
    }
  }

  public disconnect(): void {
    try {
      udpClient.disconnect();
      ftpClient.disconnect();
      
      // Clean up subscriptions
      this.unsubscribeFunctions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
      
      this.unsubscribeFunctions = [];
    } catch (error) {
      this.notifyErrorListeners('Failed to disconnect services', 'sync');
    }
  }

  // Data access methods (proxy to individual clients)
  public getRadars(): Radar[] {
    return udpClient.getCachedRadars();
  }

  public getFines(): Fine[] {
    return udpClient.getCachedFines();
  }

  public getImages(): PlateRecognitionImage[] {
    return ftpClient.getCachedImages();
  }

  // Subscribe to data updates (proxy methods)
  public onRadarUpdate(callback: (radars: Radar[]) => void): () => void {
    return udpClient.onRadarUpdate(callback);
  }

  public onFineUpdate(callback: (fines: Fine[]) => void): () => void {
    return udpClient.onFineUpdate(callback);
  }

  public onImageUpdate(callback: (images: PlateRecognitionImage[]) => void): () => void {
    return ftpClient.onImageUpdate(callback);
  }

  public onNewImage(callback: (image: PlateRecognitionImage) => void): () => void {
    return ftpClient.onNewImage(callback);
  }

  public onImageProcessed(callback: (imageId: string, result: any) => void): () => void {
    return ftpClient.onImageProcessed(callback);
  }

  // Data manipulation methods (proxy methods)
  public requestRadarData(): void {
    if (this.connectionStatus.udp) {
      udpClient.requestRadarData();
    }
  }

  public requestFineData(filters?: { radarId?: number; startDate?: string; endDate?: string }): void {
    if (this.connectionStatus.udp) {
      udpClient.requestFineData(filters);
    }
  }

  public requestImageList(): void {
    // Always forward the request to ftpClient. It will decide whether to
    // request via WebSocket or use the HTTP fallback to /api/plate-images.
    ftpClient.requestFileList();
  }

  public uploadImage(file: File): Promise<PlateRecognitionImage> {
    if (!this.connectionStatus.ftp) {
      return Promise.reject(new Error('FTP connection not available'));
    }
    return ftpClient.uploadImage(file);
  }

  public deleteImage(imageId: string): void {
    if (this.connectionStatus.ftp) {
      ftpClient.deleteImage(imageId);
    }
  }

  public reprocessImage(imageId: string): void {
    if (this.connectionStatus.ftp) {
      ftpClient.reprocessImage(imageId);
    }
  }

  public clearFTPCacheAndRefresh(): void {
    console.log('🧹 Clearing FTP cache and refreshing data...');
    ftpClient.clearCacheAndRefresh();
  }

  // Health check method
  public async performHealthCheck(): Promise<{
    udp: { connected: boolean; lastUpdate: string | null };
    ftp: { connected: boolean; lastUpdate: string | null };
    overall: boolean;
  }> {
    return {
      udp: {
        connected: this.connectionStatus.udp,
        lastUpdate: this.dataSyncStatus.lastRadarUpdate || this.dataSyncStatus.lastFineUpdate
      },
      ftp: {
        connected: this.connectionStatus.ftp,
        lastUpdate: this.dataSyncStatus.lastImageUpdate
      },
      overall: this.connectionStatus.overall
    };
  }

  // Configuration methods
  public updateServerConfig(config: {
    serverIP?: string;
    udpPort?: number;
    ftpPort?: number;
  }): void {
    // This would update the configuration and reconnect
    // For now, we'll just trigger a reconnect
    if (config.serverIP || config.udpPort || config.ftpPort) {
      this.reconnectAll();
    }
  }
}

// Export singleton instance
const realTimeDataService = new RealTimeDataService();
export default realTimeDataService;

// Export types
export type { ConnectionStatus, DataSyncStatus };
