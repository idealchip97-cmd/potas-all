import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Tabs,
  Tab,
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  Camera,
  CalendarToday,
  Download,
  Print,
  BarChart,
  PieChart,
  Speed,
  Warning,
  CheckCircle,
  Schedule
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface ReportData {
  id: string;
  date: string;
  camera: string;
  violations: number;
  totalVehicles: number;
  avgSpeed: number;
  status: 'active' | 'maintenance' | 'offline';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedCamera, setSelectedCamera] = useState('all');
  const [finesData, setFinesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const { token } = useAuth();

  // Mock data for demonstration
  const mockReportData: ReportData[] = [
    {
      id: '1',
      date: '2025-01-19',
      camera: 'Camera 001',
      violations: 15,
      totalVehicles: 245,
      avgSpeed: 68,
      status: 'active'
    },
    {
      id: '2',
      date: '2025-01-19',
      camera: 'Camera 002',
      violations: 8,
      totalVehicles: 189,
      avgSpeed: 62,
      status: 'active'
    },
    {
      id: '3',
      date: '2025-01-18',
      camera: 'Camera 001',
      violations: 12,
      totalVehicles: 198,
      avgSpeed: 65,
      status: 'maintenance'
    }
  ];

  const totalViolations = mockReportData.reduce((sum, item) => sum + item.violations, 0);
  const totalVehicles = mockReportData.reduce((sum, item) => sum + item.totalVehicles, 0);
  const avgSpeed = Math.round(mockReportData.reduce((sum, item) => sum + item.avgSpeed, 0) / mockReportData.length);

  // Fetch fines data from backend
  const fetchFinesData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fines', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFinesData(data.fines || []);
        
        // Calculate total revenue in JD
        const revenue = (data.fines || []).reduce((sum: number, fine: any) => {
          return sum + (parseFloat(fine.fineAmount) || 0);
        }, 0);
        setTotalRevenue(revenue);
      }
    } catch (error) {
      console.error('Error fetching fines data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate report function
  const handleGenerateReport = () => {
    console.log('Generating report with filters:', {
      dateRange,
      selectedCamera,
      activeTab
    });
    fetchFinesData();
  };

  // Load data on component mount
  useEffect(() => {
    if (token) {
      fetchFinesData();
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Assessment sx={{ fontSize: 32, color: 'primary.main' }} />
          Reports & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive radar system performance and violation reports
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button variant="outlined" startIcon={<Download />}>
          Export Data
        </Button>
        <Button variant="contained" startIcon={<Print />}>
          Print Report
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="reports tabs">
          <Tab icon={<BarChart />} label="Overview" />
          <Tab icon={<Warning />} label="Violations" />
          <Tab icon={<Speed />} label="Performance" />
          <Tab icon={<PieChart />} label="Analytics" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CalendarToday />
            Report Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                select
                label="Camera"
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
              >
                <MenuItem value="all">All Cameras</MenuItem>
                <MenuItem value="camera001">Camera 001</MenuItem>
                <MenuItem value="camera002">Camera 002</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button 
                fullWidth 
                variant="contained" 
                sx={{ height: '56px' }}
                onClick={handleGenerateReport}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Violations
                  </Typography>
                  <Typography variant="h4">
                    {totalViolations}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last 7 days
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <Warning />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Vehicles
                  </Typography>
                  <Typography variant="h4">
                    {totalVehicles.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Detected
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Speed />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Average Speed
                  </Typography>
                  <Typography variant="h4">
                    {avgSpeed} km/h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All cameras
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    {totalRevenue.toFixed(2)} JD
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Collected fines
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <Assessment />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Cameras
                  </Typography>
                  <Typography variant="h4">
                    2/2
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Online status
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <Camera />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Schedule />
                  Recent Activity
                </Typography>
                {mockReportData.slice(0, 5).map((item) => (
                  <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, mb: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Camera color="action" />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">{item.camera}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.date}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight="medium">{item.violations} violations</Typography>
                      <Chip 
                        size="small"
                        label={item.status}
                        color={item.status === 'active' ? 'success' : item.status === 'maintenance' ? 'warning' : 'error'}
                      />
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <BarChart />
                  Performance Summary
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Detection Accuracy</Typography>
                    <Typography variant="body2" fontWeight="medium">98.5%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={98.5} color="success" />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">System Uptime</Typography>
                    <Typography variant="body2" fontWeight="medium">99.2%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={99.2} color="primary" />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Response Time</Typography>
                    <Typography variant="body2" fontWeight="medium">&lt; 100ms</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={95} color="secondary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Warning />
              Fines Reports
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <Typography>Loading fines data...</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Plate Number</TableCell>
                      <TableCell>Speed Detected</TableCell>
                      <TableCell>Speed Limit</TableCell>
                      <TableCell>Fine Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {finesData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                          <Typography color="text.secondary">
                            No fines data available. Generate a report to load data.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      finesData.map((fine: any) => (
                        <TableRow key={fine.id} hover>
                          <TableCell>
                            {new Date(fine.violationDateTime).toLocaleDateString('en-US')}
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight="medium">{fine.vehiclePlate}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography color="error" fontWeight="medium">
                              {fine.speedDetected} km/h
                            </Typography>
                          </TableCell>
                          <TableCell>{fine.speedLimit} km/h</TableCell>
                          <TableCell>
                            <Typography fontWeight="medium" color="success.main">
                              {parseFloat(fine.fineAmount).toFixed(2)} JD
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              size="small"
                              label={fine.status || 'Processed'}
                              color="success"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Camera Performance</Typography>
                <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle color="success" />
                      <Typography fontWeight="medium">Camera 001</Typography>
                    </Box>
                    <Chip size="small" label="Active" color="success" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Uptime: 99.8% | Violations: 27 | Accuracy: 98.2%
                  </Typography>
                </Box>
                <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle color="success" />
                      <Typography fontWeight="medium">Camera 002</Typography>
                    </Box>
                    <Chip size="small" label="Active" color="success" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Uptime: 98.5% | Violations: 8 | Accuracy: 97.8%
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule color="warning" />
                      <Typography fontWeight="medium">Camera 003</Typography>
                    </Box>
                    <Chip size="small" label="Maintenance" color="warning" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Last active: 2 hours ago | Scheduled maintenance
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>System Health</Typography>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">CPU Usage</Typography>
                    <Typography variant="body2">45%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={45} />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Memory Usage</Typography>
                    <Typography variant="body2">62%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={62} color="success" />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Storage Usage</Typography>
                    <Typography variant="body2">78%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={78} color="warning" />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Network Usage</Typography>
                    <Typography variant="body2">23%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={23} color="secondary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Traffic Patterns</Typography>
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <BarChart sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography color="text.secondary">Traffic pattern chart would be displayed here</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Violation Distribution</Typography>
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <PieChart sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography color="text.secondary">Violation distribution chart would be displayed here</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default Reports;
