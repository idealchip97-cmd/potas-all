import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { AuthProvider } from '../../contexts/AuthContext';
import Dashboard from '../../pages/Dashboard';
import apiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

const mockDashboardStats = {
  totalRadars: 5,
  activeRadars: 4,
  totalFines: 150,
  todayFines: 12,
  totalRevenue: 15000,
  todayRevenue: 1200,
  averageSpeed: 45,
  complianceRate: 85,
  pendingFines: 25,
  processedFines: 75,
  paidFines: 40,
  cancelledFines: 10,
};

const mockTrends = [
  { date: '2024-01-01', violations: 10, revenue: 1000, averageSpeed: 45 },
  { date: '2024-01-02', violations: 15, revenue: 1500, averageSpeed: 48 },
];

const mockRadarPerformance = [
  {
    radarId: 1,
    radarName: 'Radar 1',
    location: 'Main Gate',
    totalViolations: 50,
    todayViolations: 5,
    averageSpeed: 45,
    uptime: 98,
    status: 'active',
    lastActivity: '2024-01-01T10:00:00Z',
  },
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('Dashboard Component', () => {
  beforeEach(() => {
    mockedApiService.getDashboardStats.mockResolvedValue({
      success: true,
      message: 'Success',
      data: mockDashboardStats,
    });

    mockedApiService.getViolationTrends.mockResolvedValue({
      success: true,
      message: 'Success',
      data: mockTrends,
    });

    mockedApiService.getRadarPerformance.mockResolvedValue({
      success: true,
      message: 'Success',
      data: mockRadarPerformance,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard title', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays dashboard stats after loading', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Radars')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('4 Active')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Fines')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('12 Today')).toBeInTheDocument();
  });

  it('displays charts after data loads', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockedApiService.getDashboardStats.mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('calls API services on mount', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockedApiService.getDashboardStats).toHaveBeenCalledTimes(1);
      expect(mockedApiService.getViolationTrends).toHaveBeenCalledWith({
        period: 'daily',
        days: 30,
      });
      expect(mockedApiService.getRadarPerformance).toHaveBeenCalledTimes(1);
    });
  });
});
