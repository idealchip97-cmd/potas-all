/**
 * UDP Readings API Service
 * 
 * This service provides access to the new UDP readings system with persistent
 * listening capabilities and comprehensive API endpoints.
 */

export interface UdpReading {
  id: number;
  radarId: number;
  speedDetected: number;
  speedLimit: number;
  detectionTime: string;
  isViolation: boolean;
  sourceIP?: string;
  sourcePort?: number;
  rawMessage?: string;
  messageFormat: 'text' | 'json' | 'binary' | 'unknown';
  hexData?: string;
  processed: boolean;
  fineCreated: boolean;
  fineId?: number;
  correlatedImages?: any[];
  processingNotes?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  radar?: {
    id: number;
    name: string;
    location: string;
    status: string;
  };
  fine?: {
    id: number;
    fineAmount: number;
    status: string;
  };
}

export interface UdpReadingsResponse {
  success: boolean;
  data: UdpReading[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp?: string;
}

export interface UdpStatistics {
  totalReadings: number;
  violationReadings: number;
  processedReadings: number;
  finesCreated: number;
  complianceRate: string;
  averageSpeed: string;
  maxSpeed: number;
  minSpeed: number;
  formatDistribution: Array<{
    format: string;
    count: number;
  }>;
  radarDistribution: Array<{
    radarId: number;
    radarName: string;
    location: string;
    count: number;
  }>;
}

export interface UdpSystemStatus {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  listening: boolean;
  address?: {
    address: string;
    family: string;
    port: number;
  };
  stats: {
    startTime: string;
    messagesReceived: number;
    readingsSaved: number;
    violationsDetected: number;
    finesCreated: number;
    errors: number;
    isListening: boolean;
    uptime: number;
    config: {
      port: number;
      speedLimit: number;
    };
  };
  timestamp: string;
}

export interface UdpReadingFilters {
  page?: number;
  limit?: number;
  radarId?: number;
  isViolation?: boolean;
  processed?: boolean;
  messageFormat?: 'text' | 'json' | 'binary' | 'unknown';
  startDate?: string;
  endDate?: string;
  minSpeed?: number;
  maxSpeed?: number;
  sourceIP?: string;
}

class UdpReadingsApiService {
  private baseUrl: string;

  constructor() {
    // Use environment variable or default to current host
    const apiHost = process.env.REACT_APP_API_HOST || window.location.hostname;
    const apiPort = process.env.REACT_APP_API_PORT || '3000';
    this.baseUrl = `http://${apiHost}:${apiPort}/api`;
  }

  /**
   * Get all UDP readings with optional filtering and pagination
   */
  async getReadings(filters: UdpReadingFilters = {}): Promise<UdpReadingsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/udp-readings?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch UDP readings: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get live/recent UDP readings for real-time dashboard
   */
  async getLiveReadings(limit: number = 100): Promise<UdpReadingsResponse> {
    const response = await fetch(`${this.baseUrl}/udp-readings/live?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch live UDP readings: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get comprehensive statistics for analytics dashboard
   */
  async getStatistics(filters: Omit<UdpReadingFilters, 'page' | 'limit'> = {}): Promise<{
    success: boolean;
    data: UdpStatistics;
  }> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/udp-readings/stats/summary?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch UDP statistics: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get recent violations (last 24 hours by default)
   */
  async getRecentViolations(limit: number = 50): Promise<UdpReadingsResponse> {
    const response = await fetch(`${this.baseUrl}/udp-readings/violations/recent?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recent violations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get specific UDP reading by ID
   */
  async getReading(id: number): Promise<{
    success: boolean;
    data: UdpReading;
  }> {
    const response = await fetch(`${this.baseUrl}/udp-readings/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch UDP reading: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Mark a reading as processed
   */
  async processReading(id: number, processingNotes?: string): Promise<{
    success: boolean;
    message: string;
    data: UdpReading;
  }> {
    const response = await fetch(`${this.baseUrl}/udp-readings/${id}/process`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        processingNotes: processingNotes || 'Processed via dashboard'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to process UDP reading: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Bulk process multiple readings
   */
  async bulkProcessReadings(ids: number[], processingNotes?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/udp-readings/bulk/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids,
        processingNotes: processingNotes || 'Bulk processed via dashboard'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk process UDP readings: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Export readings as CSV
   */
  exportCsv(filters: Omit<UdpReadingFilters, 'page' | 'limit'> = {}): void {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/udp-readings/export/csv?${queryParams}`;
    window.open(url, '_blank');
  }

  /**
   * Delete a specific reading (admin only)
   */
  async deleteReading(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/udp-readings/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete UDP reading: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get UDP system status and health
   */
  async getSystemStatus(): Promise<UdpSystemStatus> {
    const response = await fetch(`${this.baseUrl}/udp/status`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch UDP system status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Reset UDP statistics (admin only)
   */
  async resetStatistics(): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/udp/reset-stats`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to reset UDP statistics: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get enhanced health check including UDP listener status
   */
  async getHealthStatus(): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
    imageBasePath: string;
    udpListener: UdpSystemStatus;
  }> {
    const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch health status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Real-time polling for live updates
   */
  startLivePolling(
    callback: (readings: UdpReading[]) => void,
    interval: number = 5000,
    limit: number = 100
  ): () => void {
    const poll = async () => {
      try {
        const response = await this.getLiveReadings(limit);
        if (response.success) {
          callback(response.data);
        }
      } catch (error) {
        console.error('Error polling live readings:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, interval);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }

  /**
   * Real-time polling for system status
   */
  startStatusPolling(
    callback: (status: UdpSystemStatus) => void,
    interval: number = 10000
  ): () => void {
    const poll = async () => {
      try {
        const status = await this.getSystemStatus();
        callback(status);
      } catch (error) {
        console.error('Error polling system status:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, interval);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }

  /**
   * Format speed for display
   */
  formatSpeed(speed: number): string {
    return `${speed} km/h`;
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Get violation severity based on speed excess
   */
  getViolationSeverity(speedDetected: number, speedLimit: number): 'low' | 'medium' | 'high' | 'extreme' {
    const excess = speedDetected - speedLimit;
    
    if (excess <= 10) return 'low';
    if (excess <= 20) return 'medium';
    if (excess <= 30) return 'high';
    return 'extreme';
  }

  /**
   * Get color for violation severity
   */
  getViolationColor(speedDetected: number, speedLimit: number): string {
    const severity = this.getViolationSeverity(speedDetected, speedLimit);
    
    switch (severity) {
      case 'low': return '#ff9800'; // Orange
      case 'medium': return '#f44336'; // Red
      case 'high': return '#d32f2f'; // Dark Red
      case 'extreme': return '#b71c1c'; // Very Dark Red
      default: return '#4caf50'; // Green
    }
  }
}

// Export singleton instance
const udpReadingsApi = new UdpReadingsApiService();
export default udpReadingsApi;
