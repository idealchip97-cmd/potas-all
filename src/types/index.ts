export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface Radar {
  id: number;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  speedLimit: number;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  ftpPath: string;
  createdAt: string;
  updatedAt: string;
  statistics?: {
    totalFines: number;
    todayFines: number;
    averageSpeed: number;
    uptime: number;
  };
}

export interface Fine {
  id: number;
  radarId: number;
  vehicleSpeed: number;
  speedLimit: number;
  plateNumber: string;
  fineAmount: number;
  status: 'pending' | 'processed' | 'paid' | 'cancelled';
  violationTime: string;
  imageUrl?: string;
  processingNotes?: string;
  createdAt: string;
  updatedAt: string;
  radar?: Radar;
}

export interface DashboardStats {
  totalRadars: number;
  activeRadars: number;
  totalFines: number;
  todayFines: number;
  totalRevenue: number;
  todayRevenue: number;
  averageSpeed: number;
  complianceRate: number;
  pendingFines: number;
  processedFines: number;
  paidFines: number;
  cancelledFines: number;
}

export interface ViolationTrend {
  date: string;
  violations: number;
  revenue: number;
  averageSpeed: number;
}

export interface RadarPerformance {
  radarId: number;
  radarName: string;
  location: string;
  totalViolations: number;
  todayViolations: number;
  averageSpeed: number;
  uptime: number;
  status: string;
  lastActivity: string;
}

export interface SpeedAnalysis {
  speedRange: string;
  count: number;
  percentage: number;
  totalFines: number;
}

export interface LocationViolation {
  location: string;
  radarCount: number;
  totalViolations: number;
  averageSpeed: number;
  revenue: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FilterOptions {
  page?: number;
  limit?: number;
  status?: string;
  radarId?: number;
  startDate?: string;
  endDate?: string;
  minSpeed?: number;
  maxSpeed?: number;
  location?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}
