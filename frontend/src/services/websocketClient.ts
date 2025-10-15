// Disabled WebSocket Client - Using HTTP API Instead
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 0; // Disabled
  private reconnectInterval = 5000;
  private isConnecting = false;
  private subscriptions = new Set<string>();
  private messageHandlers = new Map<string, Function[]>();
  private connectionHandlers: Function[] = [];
  private url: string;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'development' ? '3000' : window.location.port;
    this.url = `${protocol}//${host}:${port}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve) => {
      // WebSocket connections disabled - using HTTP API instead
      console.log('ℹ️ WebSocket connections disabled - using HTTP API');
      resolve();
    });
  }

  disconnect(): void {
    // No-op since WebSocket is disabled
  }

  subscribe(channels: string[]): void {
    // No-op since WebSocket is disabled
  }

  unsubscribe(channels: string[]): void {
    // No-op since WebSocket is disabled
  }

  onMessage(type: string, handler: Function): () => void {
    // No-op since WebSocket is disabled
    return () => {};
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    // Always report as disconnected since WebSocket is disabled
    handler(false);
    return () => {};
  }

  onRadarData(handler: Function): () => void {
    return () => {};
  }

  onFineData(handler: Function): () => void {
    return () => {};
  }

  onImageCorrelation(handler: Function): () => void {
    return () => {};
  }

  onPlateRecognition(handler: Function): () => void {
    return () => {};
  }

  onCorrelationCycle(handler: Function): () => void {
    return () => {};
  }

  onSystemStatus(handler: Function): () => void {
    return () => {};
  }

  requestData(dataType: string): void {
    // No-op since WebSocket is disabled
  }

  ping(): void {
    // No-op since WebSocket is disabled
  }

  isConnected(): boolean {
    return false; // Always false since WebSocket is disabled
  }

  getConnectionState(): string {
    return 'disabled'; // WebSocket is disabled
  }
}

// Export singleton instance
const websocketClient = new WebSocketClient();
export default websocketClient;
