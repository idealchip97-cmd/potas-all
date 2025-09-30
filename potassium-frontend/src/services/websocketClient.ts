class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private isConnecting = false;
  private subscriptions = new Set<string>();
  private messageHandlers = new Map<string, ((data: any) => void)[]>();
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private url: string;

  constructor() {
    // Use the same host as the current page, but with WebSocket protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'development' ? '3000' : window.location.port;
    this.url = `${protocol}//${host}:${port}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      console.log(`🔗 Connecting to WebSocket server at ${this.url}`);

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(true);
          
          // Resubscribe to channels
          if (this.subscriptions.size > 0) {
            this.send({
              type: 'subscribe',
              channels: Array.from(this.subscriptions)
            });
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket connection closed:', event.code, event.reason);
          this.isConnecting = false;
          this.notifyConnectionHandlers(false);
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          this.notifyConnectionHandlers(false);
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch(error => {
          console.error('❌ Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }

  private handleMessage(data: any): void {
    const handlers = this.messageHandlers.get(data.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('❌ Error in message handler:', error);
        }
      });
    }
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('❌ Error in connection handler:', error);
      }
    });
  }

  // Public methods
  subscribe(channels: string[]): void {
    channels.forEach(channel => this.subscriptions.add(channel));
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe',
        channels
      });
    }
  }

  unsubscribe(channels: string[]): void {
    channels.forEach(channel => this.subscriptions.delete(channel));
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'unsubscribe',
        channels
      });
    }
  }

  onMessage(type: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    
    this.messageHandlers.get(type)!.push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler);
    
    // Send current status immediately
    const isConnected = this.ws?.readyState === WebSocket.OPEN;
    handler(isConnected);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  // Convenience methods for specific data types
  onRadarData(handler: (data: any) => void): () => void {
    return this.onMessage('radar_data', handler);
  }

  onFineData(handler: (data: any) => void): () => void {
    return this.onMessage('fine_data', handler);
  }

  onImageCorrelation(handler: (data: any) => void): () => void {
    return this.onMessage('image_correlation', handler);
  }

  onPlateRecognition(handler: (data: any) => void): () => void {
    return this.onMessage('plate_recognition', handler);
  }

  onCorrelationCycle(handler: (data: any) => void): () => void {
    return this.onMessage('correlation_cycle', handler);
  }

  onSystemStatus(handler: (data: any) => void): () => void {
    return this.onMessage('system_status', handler);
  }

  // Request data
  requestData(dataType: string): void {
    this.send({
      type: 'request_data',
      dataType
    });
  }

  // Ping/pong for connection health
  ping(): void {
    this.send({
      type: 'ping'
    });
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || false;
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Export singleton instance
const websocketClient = new WebSocketClient();
export default websocketClient;
