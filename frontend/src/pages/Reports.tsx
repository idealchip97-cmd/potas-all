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
  Alert,
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
  const [finesData, setFinesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [aiPerformance, setAiPerformance] = useState({
    totalProcessed: 0,
    accurateDetections: 0,
    accuracy: 0,
    avgConfidence: 0
  });
  const [useDemoData, setUseDemoData] = useState(false);
  const { token } = useAuth();

  // Mock data for demonstrationboard it 
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

  // Fetch AI performance data
  const fetchAiPerformanceData = async () => {
    try {
      const response = await fetch('/api/ai-cases?limit=100');
      
      if (response.ok) {
        const data = await response.json();
        console.log('AI Cases API Response:', data); // Debug log
        
        if (data.success && data.cases) {
          const cases = data.cases;
          const totalProcessed = cases.length;
          const accurateDetections = cases.filter((c: any) => 
            c.confidence && c.confidence > 0.8
          ).length;
          
          const avgConfidence = cases.reduce((sum: number, c: any) => {
            return sum + (c.confidence || 0);
          }, 0) / (totalProcessed || 1);
          
          setAiPerformance({
            totalProcessed,
            accurateDetections,
            accuracy: totalProcessed > 0 ? (accurateDetections / totalProcessed) * 100 : 0,
            avgConfidence: avgConfidence * 100
          });
          
          console.log('AI Performance Updated:', {
            totalProcessed,
            accurateDetections,
            accuracy: totalProcessed > 0 ? (accurateDetections / totalProcessed) * 100 : 0,
            avgConfidence: avgConfidence * 100
          });
        } else {
          console.warn('AI Cases API failed, using demo data');
          setUseDemoData(true);
          setAiPerformance({
            totalProcessed: 13,
            accurateDetections: 11,
            accuracy: 84.6,
            avgConfidence: 87.2
          });
        }
      } else {
        console.warn('AI Cases API failed, using demo data');
        setUseDemoData(true);
        setAiPerformance({
          totalProcessed: 13,
          accurateDetections: 11,
          accuracy: 84.6,
          avgConfidence: 87.2
        });
      }
    } catch (error) {
      console.error('Error fetching AI performance data:', error);
      console.warn('Using demo AI performance data');
      setUseDemoData(true);
      setAiPerformance({
        totalProcessed: 13,
        accurateDetections: 11,
        accuracy: 84.6,
        avgConfidence: 87.2
      });
    }
  };

  // Clear cache function
  const clearCache = () => {
    console.log('🧹 Clearing cache and resetting state...');
    setFinesData([]);
    setTotalRevenue(0);
    setUseDemoData(false);
    // Clear any localStorage cache
    localStorage.removeItem('reportsCache');
    localStorage.removeItem('finesData');
    localStorage.removeItem('totalRevenue');
  };

  // Fetch fines data from backend
  const fetchFinesData = async () => {
    try {
      setLoading(true);
      // Clear cache and reset revenue to prevent accumulation
      clearCache();
      console.log('Fetching fines data with token:', token ? 'Token present' : 'No token');
      
      const response = await fetch('/api/fines', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Fines API Response Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fines API Response Data:', data);
        
        // Backend returns data.data.fines, not data.fines
        const finesArray = data.data?.fines || data.fines || [];
        setFinesData(finesArray);
        
        // Calculate total revenue in JD - Force numeric calculation
        let calculatedRevenue = 0;
        console.log('=== REVENUE CALCULATION START ===');
        
        for (let i = 0; i < finesArray.length; i++) {
          const fine = finesArray[i];
          const fineAmountRaw = fine.fineAmount;
          const fineAmountStr = String(fineAmountRaw || '0');
          const fineAmountNum = Number(fineAmountStr);
          const validAmount = isNaN(fineAmountNum) ? 0 : fineAmountNum;
          
          console.log(`Fine ${i + 1}: Plate=${fine.vehiclePlate}, Raw="${fineAmountRaw}", String="${fineAmountStr}", Number=${fineAmountNum}, Valid=${validAmount}`);
          calculatedRevenue = calculatedRevenue + validAmount;
          console.log(`Running total: ${calculatedRevenue}`);
        }
        
        console.log(`=== FINAL REVENUE: ${calculatedRevenue} JD from ${finesArray.length} fines ===`);
        setTotalRevenue(Number(calculatedRevenue));
        
        console.log('Fines Data Updated:', {
          count: finesArray.length,
          revenue: calculatedRevenue
        });
      } else {
        const errorText = await response.text();
        console.error('Fines API Error:', response.status, errorText);
        console.warn('Using demo fines data');
        setUseDemoData(true);
        const demoFines = [
          { id: 1, vehiclePlate: '112-2334', fineAmount: '75.00', violationDateTime: '2025-01-19T10:30:00Z', notes: 'from camera001 case case001' },
          { id: 2, vehiclePlate: '512-3456', fineAmount: '50.00', violationDateTime: '2025-01-19T14:15:00Z', notes: 'from camera002 case case003' }
        ];
        setFinesData(demoFines);
        // Calculate demo revenue properly
        const demoRevenue = demoFines.reduce((sum, fine) => sum + parseFloat(fine.fineAmount), 0);
        console.log(`Demo revenue calculated: ${demoRevenue}`);
        setTotalRevenue(demoRevenue);
      }
    } catch (error) {
      console.error('Error fetching fines data:', error);
      console.warn('Using demo fines data');
      setUseDemoData(true);
      const demoFines = [
        { id: 1, vehiclePlate: '112-2334', fineAmount: '75.00', violationDateTime: '2025-01-19T10:30:00Z', notes: 'from camera001 case case001' },
        { id: 2, vehiclePlate: '512-3456', fineAmount: '50.00', violationDateTime: '2025-01-19T14:15:00Z', notes: 'from camera002 case case003' }
      ];
      setFinesData(demoFines);
      // Calculate demo revenue properly
      const demoRevenue = demoFines.reduce((sum, fine) => sum + parseFloat(fine.fineAmount), 0);
      console.log(`Demo revenue calculated (catch): ${demoRevenue}`);
      setTotalRevenue(demoRevenue);
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
    fetchAiPerformanceData();
  };

  // Print report function
  const handlePrintReport = () => {
    const printContent = document.getElementById('reports-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Radar System Report - ${new Date().toLocaleDateString()}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
                .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                .stat-title { font-weight: bold; color: #666; margin-bottom: 5px; }
                .stat-value { font-size: 24px; font-weight: bold; color: #333; }
                .stat-subtitle { font-size: 12px; color: #888; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .print-date { text-align: right; margin-top: 20px; font-size: 12px; color: #666; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Radar System Report</h1>
                <p>Generated on ${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-title">Total Fines</div>
                  <div class="stat-value">${finesData.length}</div>
                  <div class="stat-subtitle">Approved violations</div>
                </div>
                <div class="stat-card">
                  <div class="stat-title">AI Cases Processed</div>
                  <div class="stat-value">${aiPerformance.totalProcessed}</div>
                  <div class="stat-subtitle">Plate detections</div>
                </div>
                <div class="stat-card">
                  <div class="stat-title">AI Accuracy</div>
                  <div class="stat-value">${aiPerformance.accuracy.toFixed(1)}%</div>
                  <div class="stat-subtitle">Detection accuracy</div>
                </div>
                <div class="stat-card">
                  <div class="stat-title">Total Revenue</div>
                  <div class="stat-value">${totalRevenue.toFixed(2)} JD</div>
                  <div class="stat-subtitle">Collected fines</div>
                </div>
              </div>

              ${finesData.length > 0 ? `
                <h2>Fines Report</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plate Number</th>
                      <th>Speed Detected</th>
                      <th>Speed Limit</th>
                      <th>Fine Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${finesData.map(fine => `
                      <tr>
                        <td>${new Date(fine.violationDateTime).toLocaleDateString('en-US')}</td>
                        <td>${fine.vehiclePlate}</td>
                        <td>${fine.speedDetected} km/h</td>
                        <td>${fine.speedLimit} km/h</td>
                        <td>${parseFloat(fine.fineAmount).toFixed(2)} JD</td>
                        <td>${fine.status || 'Processed'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p>No fines data available.</p>'}

              <div class="print-date">
                Report generated by Radar System - ${new Date().toISOString()}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // Export data function
  const handleExportData = () => {
    const exportData = {
      reportDate: new Date().toISOString(),
      filters: {
        dateRange,
        selectedCamera,
        activeTab
      },
      statistics: {
        totalFines: finesData.length,
        totalRevenue: totalRevenue,
        aiPerformance: aiPerformance
      },
      finesData: finesData.map(fine => ({
        id: fine.id,
        date: fine.violationDateTime,
        plateNumber: fine.vehiclePlate,
        speedDetected: fine.speedDetected,
        speedLimit: fine.speedLimit,
        violationAmount: fine.violationAmount,
        fineAmount: fine.fineAmount,
        status: fine.status,
        notes: fine.notes
      }))
    };

    // Create CSV format
    const csvHeaders = ['Date', 'Plate Number', 'Speed Detected (km/h)', 'Speed Limit (km/h)', 'Violation Amount (km/h)', 'Fine Amount (JD)', 'Status'];
    const csvRows = finesData.map(fine => [
      new Date(fine.violationDateTime).toLocaleDateString('en-US'),
      fine.vehiclePlate,
      fine.speedDetected,
      fine.speedLimit,
      fine.violationAmount,
      parseFloat(fine.fineAmount).toFixed(2),
      fine.status || 'Processed'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `radar_system_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Also create JSON export option
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const jsonLink = document.createElement('a');
    const jsonUrl = URL.createObjectURL(jsonBlob);
    jsonLink.setAttribute('href', jsonUrl);
    jsonLink.setAttribute('download', `radar_system_report_${new Date().toISOString().split('T')[0]}.json`);
    jsonLink.style.visibility = 'hidden';
    document.body.appendChild(jsonLink);
    
    console.log('📊 Report exported as CSV and JSON files');
    alert('Report exported successfully! Check your downloads folder for CSV and JSON files.');
  };

  // Load data on component mount
  useEffect(() => {
    if (token) {
      fetchFinesData();
      fetchAiPerformanceData();
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box id="reports-content" sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment />
            Reports & Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive radar system performance and violation reports
          </Typography>
          {useDemoData && (
            <Alert severity="info" sx={{ mt: 1, maxWidth: 600 }}>
              Using demo data - API endpoints may be unavailable
            </Alert>
          )}
        </Box>
        
        {/* Action Buttons */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<Download />}
            onClick={handleExportData}
            disabled={finesData.length === 0}
            title={finesData.length === 0 ? "Generate a report first to export data" : "Export report data as CSV and JSON files"}
          >
            Export Data
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Print />}
            onClick={handlePrintReport}
            disabled={finesData.length === 0}
            title={finesData.length === 0 ? "Generate a report first to print" : "Print the current report"}
          >
            Print Report
          </Button>
          <Button 
            variant="outlined" 
            color="warning"
            onClick={clearCache}
            title="Clear cache and reset all data"
          >
            🧹 Clear Cache
          </Button>
        </Box>
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
                    Total Fines
                  </Typography>
                  <Typography variant="h4">
                    {finesData.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved violations
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
                    AI Cases Processed
                  </Typography>
                  <Typography variant="h4">
                    {aiPerformance.totalProcessed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Plate detections
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
                    AI Accuracy
                  </Typography>
                  <Typography variant="h4">
                    {aiPerformance.accuracy.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Detection accuracy
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
                <Typography variant="h6" gutterBottom>AI Performance & Accuracy</Typography>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">AI Detection Accuracy</Typography>
                    <Typography variant="body2" fontWeight="medium">{aiPerformance.accuracy.toFixed(1)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={aiPerformance.accuracy} color="success" />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Average Confidence</Typography>
                    <Typography variant="body2" fontWeight="medium">{aiPerformance.avgConfidence.toFixed(1)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={aiPerformance.avgConfidence} color="primary" />
                </Box>
                <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
                  <Typography variant="body2" fontWeight="medium" color="info.dark">
                    Total Cases Processed: {aiPerformance.totalProcessed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Accurate Detections: {aiPerformance.accurateDetections} / {aiPerformance.totalProcessed}
                  </Typography>
                </Box>
                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Camera Performance</Typography>
                <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle color="success" />
                      <Typography fontWeight="medium">Camera 001</Typography>
                    </Box>
                    <Chip size="small" label="Active" color="success" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Uptime: 99.8% | Fines: {finesData.filter((f: any) => f.notes?.includes('camera001')).length} | AI Accuracy: {aiPerformance.accuracy.toFixed(1)}%
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
                    Uptime: 98.5% | Fines: {finesData.filter((f: any) => f.notes?.includes('camera002')).length} | AI Accuracy: {aiPerformance.accuracy.toFixed(1)}%
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
