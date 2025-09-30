import { Radar, Fine } from '../types';

interface UDPMessage {
  type: 'radar' | 'radar_reading' | 'fine' | 'heartbeat';
  timestamp: string;
  data: any;
}

interface RadarData {
  id: number;
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  speedLimit: number;
  latitude: number;
  longitude: number;
  serialNumber?: string;
  ipAddress?: string;
  installationDate?: string;
  lastMaintenance?: string;
  statistics?: {
    pendingFines: number;
    totalFines: number;
    averageSpeed: number;
    uptime: number;
  };
}

interface FineData {
  id: number;
  radarId: number;
  vehicleSpeed: number;
  speedLimit: number;
  plateNumber: string;
  timestamp: string;
  location: string;
  status: 'pending' | 'processed' | 'paid' | 'disputed';
  amount: number;
  imageUrl?: string;
  vehicleType?: string;
  direction?: string;
}

class UDPClientService {
  private ws: WebSocket | null = null;
  private serverIP = '192.168.1.55';
  private serverPort = 17081;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 2; // Reduced for faster fallback to mock mode
  private reconnectDelay = 2000; // 2 seconds
  private isConnecting = false;
  private useMockData = false; // Fallback to mock data when WebSocket fails
  
  // Event listeners
  private radarListeners: ((radars: Radar[]) => void)[] = [];
  private fineListeners: ((fines: Fine[]) => void)[] = [];
  private radarReadingListeners: ((readings: any[]) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private errorListeners: ((error: string) => void)[] = [];

  // Data cache
  private cachedRadars: Radar[] = [];
  private cachedFines: Fine[] = [];
  private cachedRadarReadings: any[] = [];

  constructor() {
    // Enable UDP service - connect to real UDP server
    console.log('UDP Client: Connecting to real UDP server on port 18081');
    this.useMockData = false;
    this.cachedRadars = [];
    this.cachedFines = [];
    
    // Start connection after short delay
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  private generateMockRadars(): Radar[] {
    // Import mock radar data
    const { mockRadars } = require('../data/mockRadars');
    return mockRadars;
  }

  private generateMockFines(): Fine[] {
    // Mock data disabled - return empty array
    return [];
  }

  private generateMockData(): void {
    console.log('❌ MOCK DATA DISABLED - No fake radar/fine data will be generated');
    console.log('💡 To receive real radar data:');
    console.log('   1. Start backend UDP service on port 17081');
    console.log('   2. Send UDP messages in format: "ID: 1,Speed: 55, Time: 15:49:09."');
    console.log('   3. Backend will process and correlate with FTP images');
    
    // DO NOT USE MOCK DATA - Keep empty
    this.useMockData = false;
    this.cachedRadars = [];
    this.cachedFines = [];
    
    // Notify that no data is available (no fake data)
    setTimeout(() => {
      this.notifyConnectionListeners(false);
      this.notifyRadarListeners([]);
      this.notifyFineListeners([]);
    }, 1000);
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    
    const wsProxyPort = this.serverPort + 1000; // 18081
    console.log(`UDP Client: Connecting to WebSocket server at localhost:${wsProxyPort}`);
    
    try {
      const wsUrl = `ws://localhost:${wsProxyPort}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ UDP WebSocket connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyConnectionListeners(true);
        
        // Send initial handshake
        this.sendMessage({
          type: 'handshake',
          clientType: 'frontend',
          timestamp: new Date().toISOString()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: UDPMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing UDP message:', error);
          this.notifyErrorListeners('Failed to parse UDP message');
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 UDP WebSocket connection closed');
        this.isConnecting = false;
        this.notifyConnectionListeners(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ UDP WebSocket connection error:', error);
        this.isConnecting = false;
        this.notifyErrorListeners('WebSocket connection failed - make sure UDP server is running');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.notifyErrorListeners('Failed to create connection');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Scheduling UDP reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.log('❌ Max UDP reconnection attempts reached - loading mock radar data');
      // Load mock radar data when connection fails
      this.cachedRadars = this.generateMockRadars();
      this.notifyRadarListeners(this.cachedRadars);
      this.notifyConnectionListeners(false);
    }
  }

  private handleMessage(message: UDPMessage): void {
    console.log('Received UDP message:', message);
    if (this.useMockData) {
      console.log('UDP Client: Mock mode enabled - ignoring real UDP messages');
      return;
    }

    switch (message.type) {
      case 'radar':
        this.handleRadarData(message.data);
        break;
      case 'radar_reading':
        this.handleRadarReadingData(message.data);
        break;
      case 'fine':
        this.handleFineData(message.data);
        break;
      case 'heartbeat':
        // Handle heartbeat to keep connection alive
        this.sendMessage({
          type: 'heartbeat_ack',
          timestamp: new Date().toISOString()
        });
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private handleRadarData(data: RadarData | RadarData[]): void {
    try {
      const radars = Array.isArray(data) ? data : [data];
      
      // Convert to our Radar type format
      const processedRadars: Radar[] = radars.map(radar => ({
        id: radar.id,
        name: radar.name,
        location: radar.location,
        status: radar.status,
        speedLimit: radar.speedLimit,
        latitude: radar.latitude,
        longitude: radar.longitude,
        serialNumber: radar.serialNumber || '',
        ipAddress: radar.ipAddress || '',
        installationDate: radar.installationDate || new Date().toISOString(),
        lastMaintenance: radar.lastMaintenance || null,
        ftpPath: `/images/radar_${radar.id}`, // Default FTP path
        statistics: radar.statistics,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Update cache
      if (Array.isArray(data)) {
        // Full radar list update
        this.cachedRadars = processedRadars;
      } else {
        // Single radar update
        const index = this.cachedRadars.findIndex(r => r.id === processedRadars[0].id);
        if (index >= 0) {
          this.cachedRadars[index] = processedRadars[0];
        } else {
          this.cachedRadars.push(processedRadars[0]);
        }
      }

      // Notify listeners
      this.notifyRadarListeners(this.cachedRadars);
    } catch (error) {
      console.error('Error processing radar data:', error);
      this.notifyErrorListeners('Failed to process radar data');
    }
  }

  private handleFineData(data: FineData | FineData[]): void {
    try {
      const fines = Array.isArray(data) ? data : [data];
      
      // Convert to our Fine type format
      const processedFines: Fine[] = fines.map(fine => ({
        id: fine.id,
        radarId: fine.radarId,
        vehicleSpeed: fine.vehicleSpeed,
        speedLimit: fine.speedLimit,
        plateNumber: fine.plateNumber,
        fineAmount: fine.amount,
        status: fine.status as 'pending' | 'processed' | 'paid' | 'cancelled',
        violationTime: fine.timestamp,
        imageUrl: fine.imageUrl,
        processingNotes: `Vehicle: ${fine.vehicleType || 'Unknown'}, Direction: ${fine.direction || 'Unknown'}`,
        createdAt: fine.timestamp,
        updatedAt: fine.timestamp
      }));

      // Update cache
      if (Array.isArray(data)) {
        // Full fines list update
        this.cachedFines = processedFines;
      } else {
        // Single fine update
        const index = this.cachedFines.findIndex(f => f.id === processedFines[0].id);
        if (index >= 0) {
          this.cachedFines[index] = processedFines[0];
        } else {
          this.cachedFines.push(processedFines[0]);
        }
      }

      // Notify listeners
      this.notifyFineListeners(this.cachedFines);
    } catch (error) {
      console.error('Error processing fine data:', error);
      this.notifyErrorListeners('Failed to process fine data');
    }
  }

  private handleRadarReadingData(data: any): void {
    try {
      console.log('Processing radar reading data:', data);
      
      // Add or update radar reading in cache
      const existingIndex = this.cachedRadarReadings.findIndex(r => r.id === data.id);
      if (existingIndex >= 0) {
        this.cachedRadarReadings[existingIndex] = data;
      } else {
        this.cachedRadarReadings.unshift(data); // Add to beginning for newest first
      }

      // Keep only last 1000 readings to prevent memory issues
      if (this.cachedRadarReadings.length > 1000) {
        this.cachedRadarReadings = this.cachedRadarReadings.slice(0, 1000);
      }

      // Notify listeners
      this.notifyRadarReadingListeners(this.cachedRadarReadings);
    } catch (error) {
      console.error('Error processing radar reading data:', error);
      this.notifyErrorListeners('Failed to process radar reading data');
    }
  }

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Public methods for subscribing to data updates
  public onRadarUpdate(callback: (radars: Radar[]) => void): () => void {
    this.radarListeners.push(callback);
    
    // Send cached data immediately if available
    if (this.cachedRadars.length > 0) {
      callback(this.cachedRadars);
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.radarListeners.indexOf(callback);
      if (index > -1) {
        this.radarListeners.splice(index, 1);
      }
    };
  }

  public onFineUpdate(callback: (fines: Fine[]) => void): () => void {
    this.fineListeners.push(callback);
    
    // Send cached data immediately if available
    if (this.cachedFines.length > 0) {
      callback(this.cachedFines);
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.fineListeners.indexOf(callback);
      if (index > -1) {
        this.fineListeners.splice(index, 1);
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

  // Notification methods
  private notifyRadarListeners(radars: Radar[]): void {
    this.radarListeners.forEach(callback => {
      try {
        callback(radars);
      } catch (error) {
        console.error('Error in radar listener callback:', error);
      }
    });
  }

  private notifyFineListeners(fines: Fine[]): void {
    this.fineListeners.forEach(callback => {
      try {
        callback(fines);
      } catch (error) {
        console.error('Error in fine listener callback:', error);
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

  private notifyRadarReadingListeners(readings: any[]): void {
    this.radarReadingListeners.forEach(callback => {
      try {
        callback(readings);
      } catch (error) {
        console.error('Error in radar reading listener callback:', error);
      }
    });
  }

  // Utility methods
  public isConnected(): boolean {
    return this.useMockData || (this.ws !== null && this.ws.readyState === WebSocket.OPEN);
  }

  public getCachedRadars(): Radar[] {
    return [...this.cachedRadars];
  }

  public getCachedFines(): Fine[] {
    return [...this.cachedFines];
  }

  public getCachedRadarReadings(): any[] {
    return [...this.cachedRadarReadings];
  }

  public onRadarReadingUpdate(callback: (readings: any[]) => void): () => void {
    this.radarReadingListeners.push(callback);
    
    // Send cached data immediately if available
    if (this.cachedRadarReadings.length > 0) {
      callback(this.cachedRadarReadings);
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.radarReadingListeners.indexOf(callback);
      if (index > -1) {
        this.radarReadingListeners.splice(index, 1);
      }
    };
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
  public requestRadarData(): void {
    this.sendMessage({
      type: 'request_radars',
      timestamp: new Date().toISOString()
    });
  }

  public requestFineData(filters?: { radarId?: number; startDate?: string; endDate?: string }): void {
    this.sendMessage({
      type: 'request_fines',
      filters: filters || {},
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
const udpClientService = new UDPClientService();
export default udpClientService;
