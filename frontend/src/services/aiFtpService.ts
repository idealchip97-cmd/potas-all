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
      // Use relative URL to go through React dev server proxy
      const response = await fetch(`/api/ai-cases?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform the AI cases data to match the expected AIViolationResponse format
      if (data.success && data.data && data.data.cases) {
        const violations: AIViolation[] = data.data.cases.map((caseData: any) => {
          // Extract plate information from AI data
          let detectedPlate = 'No Plate Detected';
          let plateConfidence = 0;
          let platesCount = 0;
          
          if (caseData.ai_data && caseData.ai_data.best_detection) {
            detectedPlate = caseData.ai_data.best_detection.plate || caseData.ai_data.plate_number || 'No Plate Detected';
            plateConfidence = caseData.ai_data.best_detection.confidence || caseData.ai_data.confidence || 0;
            platesCount = caseData.ai_data.detections ? caseData.ai_data.detections.length : 1;
          } else if (caseData.plate_number) {
            detectedPlate = caseData.plate_number;
            plateConfidence = caseData.confidence || 0;
            platesCount = 1;
          }

          return {
            id: caseData.case_id,
            camera: caseData.camera_id,
            date: caseData.date,
            case: caseData.case_id,
            imagePath: caseData.case_path,
            imageUrl: caseData.ai_images && caseData.ai_images.length > 0 
              ? `/api/ai-cases/${caseData.camera_id}/${caseData.date}/${caseData.case_id}/images/${caseData.ai_images[0].split('/').pop()}`
              : '',
            platesDetected: platesCount,
            plates: [{
              bbox: [0, 0, 100, 50],
              area: 5000,
              aspect_ratio: 2.0,
              confidence: plateConfidence,
              text: detectedPlate,
              detected_characters: detectedPlate
            }],
            confidence: [plateConfidence],
            processingMethod: 'ai_plate_detection',
            processedAt: caseData.processed_at || new Date().toISOString(),
            status: detectedPlate !== 'No Plate Detected' ? 'success' : 'no_plates_detected'
          };
        });

        // Remove duplicates based on unique violation identifier
        const uniqueViolations = violations.filter((violation, index, self) => 
          index === self.findIndex(v => v.id === violation.id && v.camera === violation.camera && v.date === violation.date)
        );

        return {
          success: true,
          violations: uniqueViolations,
          total: uniqueViolations.length,
          limit,
          summary: {
            totalViolations: uniqueViolations.length,
            totalPlates: uniqueViolations.filter(v => v.status === 'success').length,
            cameras: Array.from(new Set(uniqueViolations.map(v => v.camera))),
            dates: Array.from(new Set(uniqueViolations.map(v => v.date)))
          }
        };
      }
      
      throw new Error('No AI cases data available');
    } catch (error) {
      console.error('❌ Error fetching AI violation cycles:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
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
      const response = await fetch(`${this.baseUrl}/discover/cameras`);
      
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
      const response = await fetch(`${this.baseUrl}/discover/dates/${camera}`);
      
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
      const response = await fetch(`${this.baseUrl}/discover/cases/${camera}/${date}`);
      
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
      const response = await fetch(`/health`);
      return response.ok;
    } catch (error) {
      console.error('❌ AI Backend Server connection test failed:', error);
      console.error('Connection test error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      return false;
    }
  }
}

const aiFtpService = new AIFtpService();
export default aiFtpService;
