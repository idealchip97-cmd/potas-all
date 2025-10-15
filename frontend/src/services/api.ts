import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  AuthResponse, 
  ApiResponse, 
  User, 
  Radar, 
  Fine, 
  DashboardStats, 
  ViolationTrend, 
  RadarPerformance, 
  SpeedAnalysis, 
  LocationViolation,
  FilterOptions,
  RadarListResponse,
  FineListResponse
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL = 'http://localhost:3001/api';
  private isDevelopmentMode = process.env.NODE_ENV === 'development';

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log('🔐 Authentication error - clearing stored credentials');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          
          // Only redirect if we're not already on the login page
          if (!window.location.pathname.includes('/login')) {
            console.log('🔄 Redirecting to login page');
            window.location.href = '/login';
          }
        } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
          console.log('🌐 Backend connection failed - using fallback mode');
          // Don't redirect on network errors, let components handle gracefully
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<AuthResponse> {
    // Development mode bypass
    if (this.isDevelopmentMode) {
      console.log('🔧 Development mode: Bypassing authentication');
      const mockResponse: AuthResponse = {
        success: true,
        message: 'Development login successful',
        data: {
          token: 'dev-token-' + Date.now(),
          user: {
            id: 1,
            email: email,
            firstName: 'Development',
            lastName: 'User',
            role: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      };
      
      // Store in localStorage for consistency
      localStorage.setItem('authToken', mockResponse.data.token);
      localStorage.setItem('user', JSON.stringify(mockResponse.data.user));
      
      return mockResponse;
    }
    
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/signin', {
      email,
      password,
    });
    return response.data;
  }

  async signup(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/signup', userData);
    return response.data;
  }

  async forgotPassword(email: string): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/auth/forgot-password', {
      email,
    });
    return response.data;
  }

  // Radar endpoints
  async getRadars(filters?: FilterOptions): Promise<ApiResponse<RadarListResponse>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response: AxiosResponse<ApiResponse<RadarListResponse>> = await this.api.get(
      `/radars?${params.toString()}`
    );
    return response.data;
  }

  async getRadarById(id: number): Promise<ApiResponse<Radar>> {
    const response: AxiosResponse<ApiResponse<Radar>> = await this.api.get(`/radars/${id}`);
    return response.data;
  }

  // Fines endpoints
  async getFines(filters?: FilterOptions): Promise<ApiResponse<FineListResponse>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response: AxiosResponse<ApiResponse<FineListResponse>> = await this.api.get(
      `/fines?${params.toString()}`
    );
    return response.data;
  }

  async getFinesByRadarId(radarId: number, filters?: FilterOptions): Promise<ApiResponse<Fine[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response: AxiosResponse<ApiResponse<Fine[]>> = await this.api.get(
      `/fines/radar/${radarId}?${params.toString()}`
    );
    return response.data;
  }

  async getFineById(id: number): Promise<ApiResponse<Fine>> {
    const response: AxiosResponse<ApiResponse<Fine>> = await this.api.get(`/fines/${id}`);
    return response.data;
  }

  // Reports endpoints
  async getDashboardStats(filters?: { startDate?: string; endDate?: string }): Promise<ApiResponse<DashboardStats>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });
    }
    
    const response: AxiosResponse<ApiResponse<DashboardStats>> = await this.api.get(
      `/reports/dashboard?${params.toString()}`
    );
    return response.data;
  }

  async getViolationTrends(filters?: { 
    period?: 'hourly' | 'daily' | 'weekly' | 'monthly'; 
    days?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<ViolationTrend[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response: AxiosResponse<ApiResponse<ViolationTrend[]>> = await this.api.get(
      `/reports/trends?${params.toString()}`
    );
    return response.data;
  }

  async getRadarPerformance(): Promise<ApiResponse<RadarPerformance[]>> {
    const response: AxiosResponse<ApiResponse<RadarPerformance[]>> = await this.api.get('/reports/radar-performance');
    return response.data;
  }

  async getSpeedAnalysis(filters?: {
    radarId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<SpeedAnalysis[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response: AxiosResponse<ApiResponse<SpeedAnalysis[]>> = await this.api.get(
      `/reports/speed-analysis?${params.toString()}`
    );
    return response.data;
  }

  async getViolationsByLocation(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<LocationViolation[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });
    }
    
    const response: AxiosResponse<ApiResponse<LocationViolation[]>> = await this.api.get(
      `/reports/violations-by-location?${params.toString()}`
    );
    return response.data;
  }

  async getMonthlyReport(year?: number): Promise<ApiResponse<any>> {
    const params = year ? `?year=${year}` : '';
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(`/reports/monthly${params}`);
    return response.data;
  }

  async getComplianceReport(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });
    }
    
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(
      `/reports/compliance?${params.toString()}`
    );
    return response.data;
  }

  // System health
  async getHealthCheck(): Promise<{ success: boolean; message: string; timestamp: string }> {
    const response = await axios.get('/health');
    return response.data;
  }

  // External Data Service endpoints
  async getExternalDataStatus(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/external-data/status');
    return response.data;
  }

  async getExternalDataStats(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/external-data/stats');
    return response.data;
  }

  async startExternalDataService(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/external-data/start');
    return response.data;
  }

  async stopExternalDataService(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/external-data/stop');
    return response.data;
  }

  async getCorrelationStats(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/external-data/correlation/stats');
    return response.data;
  }

  async triggerManualCorrelation(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/external-data/correlation/trigger');
    return response.data;
  }

  async sendTestUDPMessage(message: string): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/external-data/udp/test', { message });
    return response.data;
  }

  // Plate Recognition endpoints
  async getPlateRecognitionResults(filters?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(
      `/plate-recognition?${params.toString()}`
    );
    return response.data;
  }

  async getViolationsCycle(filters?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(
      `/plate-recognition/violations-cycle?${params.toString()}`
    );
    return response.data;
  }

  async getPlateRecognitionStats(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/plate-recognition/statistics');
    return response.data;
  }

  async processPlateImages(formData: FormData): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      '/plate-recognition/process',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }
}

const apiService = new ApiService();
export default apiService;
