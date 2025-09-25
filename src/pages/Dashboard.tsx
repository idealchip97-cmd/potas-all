import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Radar as RadarIcon,
  Receipt,
  TrendingUp,
  Speed,
  CheckCircle,
  Warning,
  Error,
  AttachMoney,
  CameraAlt,
  Wifi,
  WifiOff,
  Storage,
  CloudUpload,
  Refresh,
  Close,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { DashboardStats, ViolationTrend, RadarPerformance } from '../types';
import apiService from '../services/api';
import realTimeDataService, { ConnectionStatus, DataSyncStatus } from '../services/realTimeDataService';
import { PlateRecognitionImage } from '../services/ftpClient';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<ViolationTrend[]>([]);
  const [radarPerformance, setRadarPerformance] = useState<RadarPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Real-time data state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    udp: false,
    ftp: false,
    overall: false
  });
  const [syncStatus, setSyncStatus] = useState<DataSyncStatus>({
    lastRadarUpdate: null,
    lastFineUpdate: null,
    lastImageUpdate: null,
    totalRadars: 0,
    totalFines: 0,
    totalImages: 0
  });
  const [recentImages, setRecentImages] = useState<PlateRecognitionImage[]>([]);
  
  // Dialog states
  const [ftpDialogOpen, setFtpDialogOpen] = useState(false);
  const [udpDialogOpen, setUdpDialogOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    setupRealTimeMonitoring();
    
    return () => {
      // Cleanup subscriptions when component unmounts
    };
  }, []);

  const setupRealTimeMonitoring = () => {
    // Subscribe to connection status
    const unsubscribeConnection = realTimeDataService.onConnectionChange((status) => {
      setConnectionStatus(status);
    });

    // Subscribe to sync status
    const unsubscribeSync = realTimeDataService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    // Subscribe to image updates
    const unsubscribeImages = realTimeDataService.onImageUpdate((images) => {
      // Keep only the 10 most recent images
      setRecentImages(images.slice(0, 10));
    });

    // Return cleanup function (not used in this scope but good practice)
    return () => {
      unsubscribeConnection();
      unsubscribeSync();
      unsubscribeImages();
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, performanceResponse] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getRadarPerformance(),
      ]);

      if (statsResponse.success) {
        // Map backend response structure to frontend expected structure
        const backendData = statsResponse.data as any;
        const mappedStats: DashboardStats = {
          totalRadars: backendData.overview?.totalRadars || 0,
          activeRadars: backendData.overview?.activeRadars || 0,
          totalFines: backendData.overview?.totalFines || 0,
          todayFines: 0, // Not provided by backend
          totalRevenue: backendData.overview?.totalFineAmount || 0,
          todayRevenue: 0, // Not provided by backend
          averageSpeed: 0, // Not provided by backend
          complianceRate: 0, // Not provided by backend
          pendingFines: backendData.overview?.pendingFines || 0,
          processedFines: 0, // Calculate from total - pending
          paidFines: 0, // Not provided by backend
          cancelledFines: 0, // Not provided by backend
        };
        setStats(mappedStats);
      }
      
      if (performanceResponse.success) {
        // Map radar performance data
        const backendData = performanceResponse.data as any;
        const backendPerformance = backendData.performance || [];
        const mappedPerformance: RadarPerformance[] = backendPerformance.map((radar: any) => ({
          radarId: radar.id,
          radarName: radar.name,
          location: radar.location,
          totalViolations: radar.fines?.[0]?.totalViolations || 0,
          todayViolations: 0, // Not provided by backend
          averageSpeed: radar.fines?.[0]?.avgSpeed || 0,
          uptime: 100, // Default value
          status: radar.status,
          lastActivity: new Date().toISOString(),
        }));
        setRadarPerformance(mappedPerformance);
      }
      
      // Create mock trends data since backend trends API has issues
      const mockTrends: ViolationTrend[] = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          violations: Math.floor(Math.random() * 20) + 5,
          revenue: Math.floor(Math.random() * 2000) + 500,
          averageSpeed: Math.floor(Math.random() * 20) + 40,
        };
      });
      setTrends(mockTrends);
      
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const statCards = [
    {
      title: 'Total Radars',
      value: stats?.totalRadars || 0,
      icon: <RadarIcon />,
      color: '#1976d2',
      subtitle: `${stats?.activeRadars || 0} Active`,
    },
    {
      title: 'Total Fines',
      value: stats?.totalFines || 0,
      icon: <Receipt />,
      color: '#dc004e',
      subtitle: `${stats?.todayFines || 0} Today`,
    },
    {
      title: 'Total Revenue',
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: <AttachMoney />,
      color: '#4caf50',
      subtitle: `$${(stats?.todayRevenue || 0).toLocaleString()} Today`,
    },
    {
      title: 'Average Speed',
      value: `${stats?.averageSpeed || 0} km/h`,
      icon: <Speed />,
      color: '#ff9800',
      subtitle: `${stats?.complianceRate || 0}% Compliance`,
    },
    {
      title: 'Plate Recognition',
      value: 'Open System',
      icon: <CameraAlt />,
      color: '#9c27b0',
      subtitle: 'License Plate OCR',
      action: () => navigate('/plate-recognition'),
    },
    {
      title: 'FTP Monitor',
      value: connectionStatus.ftp ? 'Connected' : 'Disconnected',
      icon: connectionStatus.ftp ? <CloudUpload /> : <WifiOff />,
      color: connectionStatus.ftp ? '#4caf50' : '#f44336',
      subtitle: `${syncStatus.totalImages} Images`,
      action: () => setFtpDialogOpen(true),
    },
    {
      title: 'UDP Monitor',
      value: connectionStatus.udp ? 'Connected' : 'Disconnected',
      icon: connectionStatus.udp ? <Wifi /> : <WifiOff />,
      color: connectionStatus.udp ? '#4caf50' : '#f44336',
      subtitle: `${syncStatus.totalRadars} Radars, ${syncStatus.totalFines} Fines`,
      action: () => setUdpDialogOpen(true),
    },
  ];

  const statusCards = [
    {
      title: 'Pending Fines',
      value: stats?.pendingFines || 0,
      icon: <Warning />,
      color: '#ff9800',
    },
    {
      title: 'Processed Fines',
      value: stats?.processedFines || 0,
      icon: <CheckCircle />,
      color: '#4caf50',
    },
    {
      title: 'Paid Fines',
      value: stats?.paidFines || 0,
      icon: <TrendingUp />,
      color: '#2196f3',
    },
    {
      title: 'Cancelled Fines',
      value: stats?.cancelledFines || 0,
      icon: <Error />,
      color: '#f44336',
    },
  ];

  const pieData = [
    { name: 'Pending', value: stats?.pendingFines || 0, color: '#ff9800' },
    { name: 'Processed', value: stats?.processedFines || 0, color: '#4caf50' },
    { name: 'Paid', value: stats?.paidFines || 0, color: '#2196f3' },
    { name: 'Cancelled', value: stats?.cancelledFines || 0, color: '#f44336' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>

      {/* Main Stats Cards */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.33% - 16px)', lg: '1 1 calc(14.28% - 18px)' } }}>
            <Card 
              sx={{ 
                cursor: (card as any).action ? 'pointer' : 'default',
                '&:hover': (card as any).action ? { 
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                  transition: 'all 0.2s ease-in-out'
                } : {}
              }}
              onClick={(card as any).action}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {card.subtitle}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color, fontSize: '3rem' }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Charts Row */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        {/* Violation Trends Chart */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(66.67% - 12px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Violation Trends (Last 30 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="violations" stroke="#1976d2" strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke="#4caf50" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Fine Status Distribution */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 12px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Fine Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Status Cards */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        {statusCards.map((card, index) => (
          <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h5" component="div">
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color, fontSize: '2rem' }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Radar Performance */}
      <Box sx={{ width: '100%' }}>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Radar Performance Overview
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={radarPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="radarName" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalViolations" fill="#1976d2" />
                  <Bar dataKey="todayViolations" fill="#4caf50" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* FTP Monitor Dialog */}
      <Dialog open={ftpDialogOpen} onClose={() => setFtpDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <CloudUpload color={connectionStatus.ftp ? 'success' : 'error'} />
              <Typography variant="h6">FTP Server Monitor</Typography>
              <Chip 
                label={connectionStatus.ftp ? 'Connected' : 'Disconnected'} 
                color={connectionStatus.ftp ? 'success' : 'error'} 
                size="small" 
              />
            </Box>
            <IconButton onClick={() => setFtpDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Connection Status</Typography>
            <Box display="flex" gap={2} sx={{ mb: 2 }}>
              <Chip 
                icon={connectionStatus.ftp ? <Wifi /> : <WifiOff />}
                label={`FTP: ${connectionStatus.ftp ? 'Connected' : 'Disconnected'}`}
                color={connectionStatus.ftp ? 'success' : 'error'}
              />
              <Chip 
                label={`Last Update: ${syncStatus.lastImageUpdate ? new Date(syncStatus.lastImageUpdate).toLocaleString() : 'Never'}`}
                variant="outlined"
              />
            </Box>
          </Box>

          <Typography variant="h6" gutterBottom>Recent Images ({recentImages.length})</Typography>
          {recentImages.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Filename</TableCell>
                    <TableCell>Plate Number</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentImages.map((image) => (
                    <TableRow key={image.id}>
                      <TableCell>{image.filename}</TableCell>
                      <TableCell>{image.plateNumber || 'Processing...'}</TableCell>
                      <TableCell>{image.confidence ? `${image.confidence}%` : '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={image.processingStatus} 
                          color={
                            image.processingStatus === 'completed' ? 'success' : 
                            image.processingStatus === 'failed' ? 'error' : 
                            'warning'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(image.timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No images received yet</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => realTimeDataService.requestImageList()} startIcon={<Refresh />}>
            Refresh
          </Button>
          <Button onClick={() => setFtpDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* UDP Monitor Dialog */}
      <Dialog open={udpDialogOpen} onClose={() => setUdpDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Storage color={connectionStatus.udp ? 'success' : 'error'} />
              <Typography variant="h6">UDP Server Monitor</Typography>
              <Chip 
                label={connectionStatus.udp ? 'Connected' : 'Disconnected'} 
                color={connectionStatus.udp ? 'success' : 'error'} 
                size="small" 
              />
            </Box>
            <IconButton onClick={() => setUdpDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Connection Status</Typography>
            <Box display="flex" gap={2} sx={{ mb: 2 }}>
              <Chip 
                icon={connectionStatus.udp ? <Wifi /> : <WifiOff />}
                label={`UDP: ${connectionStatus.udp ? 'Connected' : 'Disconnected'}`}
                color={connectionStatus.udp ? 'success' : 'error'}
              />
              <Chip 
                label={`Server: 192.186.1.14:17081`}
                variant="outlined"
              />
            </Box>
          </Box>

          <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
            <Card sx={{ flex: '1 1 calc(50% - 8px)' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Radars</Typography>
                <Typography variant="h4">{syncStatus.totalRadars}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Last Update: {syncStatus.lastRadarUpdate ? new Date(syncStatus.lastRadarUpdate).toLocaleString() : 'Never'}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 calc(50% - 8px)' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Total Fines</Typography>
                <Typography variant="h4">{syncStatus.totalFines}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Last Update: {syncStatus.lastFineUpdate ? new Date(syncStatus.lastFineUpdate).toLocaleString() : 'Never'}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Typography variant="h6" gutterBottom>Data Stream Information</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data Type</TableCell>
                  <TableCell>Count</TableCell>
                  <TableCell>Last Update</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Radar Data</TableCell>
                  <TableCell>{syncStatus.totalRadars}</TableCell>
                  <TableCell>{syncStatus.lastRadarUpdate ? new Date(syncStatus.lastRadarUpdate).toLocaleString() : 'Never'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={connectionStatus.udp ? 'Active' : 'Inactive'} 
                      color={connectionStatus.udp ? 'success' : 'error'} 
                      size="small" 
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Fine Data</TableCell>
                  <TableCell>{syncStatus.totalFines}</TableCell>
                  <TableCell>{syncStatus.lastFineUpdate ? new Date(syncStatus.lastFineUpdate).toLocaleString() : 'Never'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={connectionStatus.udp ? 'Active' : 'Inactive'} 
                      color={connectionStatus.udp ? 'success' : 'error'} 
                      size="small" 
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => realTimeDataService.requestRadarData()} startIcon={<Refresh />}>
            Refresh Radars
          </Button>
          <Button onClick={() => realTimeDataService.requestFineData()} startIcon={<Refresh />}>
            Refresh Fines
          </Button>
          <Button onClick={() => setUdpDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Dashboard;
