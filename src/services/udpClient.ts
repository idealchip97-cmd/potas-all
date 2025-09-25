import { Radar, Fine } from '../types';

interface UDPMessage {
  type: 'radar' | 'fine' | 'heartbeat';
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
  private serverIP = '192.168.1.14';
  private serverPort = 17081;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 2; // Reduced for faster fallback to mock mode
  private reconnectDelay = 2000; // 2 seconds
  private isConnecting = false;
  private useMockData = false; // Fallback to mock data when WebSocket fails
  
  // Event listeners
  private radarListeners: ((radars: Radar[]) => void)[] = [];
  private fineListeners: ((fines: Fine[]) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private errorListeners: ((error: string) => void)[] = [];

  // Data cache
  private cachedRadars: Radar[] = [];
  private cachedFines: Fine[] = [];

  constructor() {
    this.connect();
  }

  private generateMockRadars(): Radar[] {
    const mockRadars: Radar[] = [];
    const locations = ['Highway A1 - North', 'City Center - Main St', 'Industrial Zone - Route 5', 'Residential Area - Oak Ave', 'School Zone - Education Blvd'];
    const statuses: ('active' | 'inactive' | 'maintenance')[] = ['active', 'active', 'active', 'maintenance', 'inactive'];

    for (let i = 0; i < 5; i++) {
      mockRadars.push({
        id: i + 1,
        name: `Radar ${i + 1}`,
        location: locations[i],
        status: statuses[i],
        speedLimit: [50, 60, 80, 30, 40][i],
        latitude: 31.7683 + (Math.random() - 0.5) * 0.1,
        longitude: 35.2137 + (Math.random() - 0.5) * 0.1,
        serialNumber: `RDR${String(i + 1).padStart(3, '0')}`,
        ipAddress: `192.168.1.${10 + i}`,
        installationDate: new Date(2023, i, 15).toISOString(),
        lastMaintenance: new Date(2024, 8, i + 1).toISOString(),
        ftpPath: `/radar${i + 1}/images`,
        createdAt: new Date(2023, i, 15).toISOString(),
        updatedAt: new Date(2024, 8, i + 1).toISOString(),
        statistics: {
          pendingFines: Math.floor(Math.random() * 20) + 5,
          totalFines: Math.floor(Math.random() * 500) + 100
        }
      });
    }

    return mockRadars;
  }

  private generateMockFines(): Fine[] {
    const mockFines: Fine[] = [];
    const plateNumbers = ['ABC123', 'XYZ789', 'DEF456', 'GHI012', 'JKL345', 'MNO678', 'PQR901', 'STU234'];
    const statuses: ('pending' | 'processed' | 'paid' | 'cancelled')[] = ['pending', 'processed', 'paid', 'cancelled'];

    for (let i = 0; i < 25; i++) {
      const radarId = Math.floor(Math.random() * 5) + 1;
      const speedLimit = [50, 60, 80, 30, 40][radarId - 1];
      const vehicleSpeed = speedLimit + Math.floor(Math.random() * 40) + 10;
      const timestamp = new Date(Date.now() - (i * 3600000) - Math.random() * 86400000);

      mockFines.push({
        id: i + 1,
        radarId: radarId,
        vehicleSpeed: vehicleSpeed,
        speedLimit: speedLimit,
        plateNumber: plateNumbers[Math.floor(Math.random() * plateNumbers.length)],
        violationTime: timestamp.toISOString(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        fineAmount: Math.floor((vehicleSpeed - speedLimit) * 5) + 50,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString()
      });
    }

    return mockFines.sort((a, b) => new Date(b.violationTime).getTime() - new Date(a.violationTime).getTime());
  }

  private initializeMockMode(): void {
    console.log('UDP Client: Initializing mock mode due to connection failure');
    this.useMockData = true;
    this.cachedRadars = this.generateMockRadars();
    this.cachedFines = this.generateMockFines();
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.notifyConnectionListeners(true);
      this.notifyRadarListeners(this.cachedRadars);
      this.notifyFineListeners(this.cachedFines);
    }, 1000);

    // Simulate periodic updates
    setInterval(() => {
      if (this.useMockData) {
        // Occasionally add a new mock fine
        if (Math.random() < 0.1) { // 10% chance every interval
          const newFine: Fine = {
            id: Date.now(),
            radarId: Math.floor(Math.random() * 5) + 1,
            vehicleSpeed: Math.floor(Math.random() * 40) + 60,
            speedLimit: 50,
            plateNumber: `NEW${Math.floor(Math.random() * 999)}`,
            violationTime: new Date().toISOString(),
            status: 'pending',
            fineAmount: Math.floor(Math.random() * 100) + 50,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          this.cachedFines.unshift(newFine);
          // Keep only last 50 fines
          if (this.cachedFines.length > 50) {
            this.cachedFines = this.cachedFines.slice(0, 50);
          }
          this.notifyFineListeners(this.cachedFines);
        }
      }
    }, 30000); // Every 30 seconds
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    
    const wsProxyPort = this.serverPort + 1000; // 18081
    console.log(`UDP Client: Attempting to connect to WebSocket proxy at ${this.serverIP}:${wsProxyPort}`);
    console.log(`UDP Client: Note - Actual UDP server is available at ${this.serverIP}:${this.serverPort}`);
    
    try {
      // Use WebSocket to connect to a WebSocket proxy that forwards UDP data
      // In a real implementation, you'd need a WebSocket server that receives UDP data
      // and forwards it to WebSocket clients
      const wsUrl = `ws://${this.serverIP}:${wsProxyPort}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('UDP WebSocket connection established');
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
        console.log('UDP WebSocket connection closed');
        this.isConnecting = false;
        this.notifyConnectionListeners(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('UDP WebSocket proxy not available:', error);
        this.isConnecting = false;
        this.notifyErrorListeners('WebSocket proxy not available - UDP server is running but WebSocket proxy service needed');
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
      console.log(`Scheduling UDP reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('Max UDP reconnection attempts reached, switching to mock mode');
      this.initializeMockMode();
    }
  }

  private handleMessage(message: UDPMessage): void {
    console.log('Received UDP message:', message);

    switch (message.type) {
      case 'radar':
        this.handleRadarData(message.data);
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
