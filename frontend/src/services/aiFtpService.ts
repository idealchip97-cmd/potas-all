/**
 * AI-Enhanced FTP Service
 * Service for connecting to the AI-enhanced FTP server on port 3003
 */

export interface AIViolation {
  id: string;
  camera: string;
  date: string;
  case: string;
  imagePath: string;
  imageUrl: string;
  platesDetected: number;
  plates: Array<{
    bbox: number[];
    area: number;
    aspect_ratio: number;
    confidence: number;
    text: string;
    detected_characters: string;
  }>;
  confidence: number[];
  processingMethod: string;
  processedAt: string;
  status: string;
}

export interface AIProcessingSummary {
  cameras: number;
  dates: number;
  totalCases: number;
  aiEnabledCases: number;
  processedCases: number;
  totalImages: number;
  totalPlates: number;
  processingMethods: Record<string, number>;
}

export interface AIViolationResponse {
  success: boolean;
  violations: AIViolation[];
  total: number;
  limit: number;
  summary: {
    totalViolations: number;
    totalPlates: number;
    cameras: string[];
    dates: string[];
  };
}

export interface AISummaryResponse {
  success: boolean;
  summary: AIProcessingSummary;
  averagePlatesPerImage: string;
}

class AIFtpService {
  private baseUrl = 'http://localhost:3003/api';

  async getViolationCycles(limit: number = 50): Promise<AIViolationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/ftp-images/violations-cycle?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching violation cycles:', error);
      throw error;
    }
  }

  async getProcessingSummary(): Promise<AISummaryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/ftp-images/summary`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching processing summary:', error);
      throw error;
    }
  }

  async getCameras(): Promise<{ success: boolean; cameras: string[]; count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/cameras`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching cameras:', error);
      throw error;
    }
  }

  async getCameraDates(camera: string): Promise<{ success: boolean; camera: string; dates: string[]; count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/cameras/${camera}/dates`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching camera dates:', error);
      throw error;
    }
  }

  async getCameraCases(camera: string, date: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/cameras/${camera}/dates/${date}/cases`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching camera cases:', error);
      throw error;
    }
  }

  async getCaseResults(camera: string, date: string, caseName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/cameras/${camera}/dates/${date}/cases/${caseName}/results`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching case results:', error);
      throw error;
    }
  }

  getImageUrl(camera: string, date: string, caseName: string, imageName: string): string {
    return `${this.baseUrl}/cameras/${camera}/dates/${date}/cases/${caseName}/images/${imageName}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:3003/health`);
      return response.ok;
    } catch (error) {
      console.error('❌ AI FTP Server connection test failed:', error);
      return false;
    }
  }
}

const aiFtpService = new AIFtpService();
export default aiFtpService;
