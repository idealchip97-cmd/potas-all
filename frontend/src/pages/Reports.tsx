import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Paper,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  Speed,
  LocationOn,
  Download,
  Refresh,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ViolationTrend, RadarPerformance, SpeedAnalysis, LocationViolation } from '../types';
import apiService from '../services/api';

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Reports: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Violation Trends State
  const [trends, setTrends] = useState<ViolationTrend[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [trendDays, setTrendDays] = useState(30);

  // Radar Performance State
  const [radarPerformance, setRadarPerformance] = useState<RadarPerformance[]>([]);

  // Speed Analysis State
  const [speedAnalysis, setSpeedAnalysis] = useState<SpeedAnalysis[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Location Analysis State
  const [locationViolations, setLocationViolations] = useState<LocationViolation[]>([]);

  // Monthly Report State
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Compliance Report State
  const [complianceReport, setComplianceReport] = useState<any>(null);

  const loadTrends = async () => {
    try {
      setLoading(true);
      await apiService.getDashboardStats();
      setTrends([]);
      setError(null);
    } catch (err) {
      setError('Failed to load violation trends');
      console.error('Error loading trends:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRadarPerformance = async () => {
    try {
      await apiService.getRadars();
      setRadarPerformance([]);
    } catch (err) {
      console.error('Error loading radar performance:', err);
    }
  };

  const loadSpeedAnalysis = async () => {
    try {
      setLoading(true);
      await apiService.getFines();
      setSpeedAnalysis([]);
      setError(null);
    } catch (err) {
      setError('Failed to load speed analysis');
      console.error('Error loading speed analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationViolations = async () => {
    try {
      setLoading(true);
      await apiService.getFines();
      setLocationViolations([]);
      setError(null);
    } catch (err) {
      setError('Failed to load location violations');
      console.error('Error loading location violations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStats();
      setMonthlyReport(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load monthly report');
      console.error('Error loading monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadComplianceReport = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStats();
      setComplianceReport(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load compliance report');
      console.error('Error loading compliance report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrends();
    loadRadarPerformance();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={() => setError(null)} startIcon={<Refresh />}>
          Dismiss
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Reports & Analytics
        </Typography>
        <Button
          startIcon={<Download />}
          variant="outlined"
        >
          Export Data
        </Button>
      </Box>

      {/* Overview Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Violations
                  </Typography>
                  <Typography variant="h4">
                    {trends.reduce((sum, t) => sum + t.violations, 0)}
                  </Typography>
                </Box>
                <Assessment color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Radars
                  </Typography>
                  <Typography variant="h4">
                    {radarPerformance.filter(r => r.status === 'active').length}
                  </Typography>
                </Box>
                <LocationOn color="success" />
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Speed
                  </Typography>
                  <Typography variant="h4">
                    {radarPerformance.length > 0 
                      ? Math.round(radarPerformance.reduce((sum, r) => sum + r.averageSpeed, 0) / radarPerformance.length)
                      : 0} km/h
                  </Typography>
                </Box>
                <Speed color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    This Month
                  </Typography>
                  <Typography variant="h4">
                    {trends.filter(t => new Date(t.date).getMonth() === new Date().getMonth()).reduce((sum, t) => sum + t.violations, 0)}
                  </Typography>
                </Box>
                <TrendingUp color="info" />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="reports tabs">
          <Tab label="Violation Trends" />
          <Tab label="Radar Performance" />
          <Tab label="Speed Analysis" />
          <Tab label="Location Analysis" />
          <Tab label="Monthly Report" />
          <Tab label="Compliance Report" />
        </Tabs>
      </Paper>

      {/* Violation Trends Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <TextField
              select
              fullWidth
              label="Period"
              value={trendPeriod}
              onChange={(e) => setTrendPeriod(e.target.value as any)}
            >
              <MenuItem value="hourly">Hourly</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <TextField
              fullWidth
              label="Number of Days"
              type="number"
              value={trendDays}
              onChange={(e) => setTrendDays(Number(e.target.value))}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <Button
              variant="contained"
              fullWidth
              onClick={loadTrends}
              disabled={loading}
              sx={{ height: '56px' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Update Trends'}
            </Button>
          </Box>
        </Box>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Violation Trends - {trendPeriod.charAt(0).toUpperCase() + trendPeriod.slice(1)}
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="violations" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Radar Performance Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(66.67% - 12px)' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Radar Performance Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={radarPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="radarName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalViolations" fill="#1976d2" name="Total Violations" />
                    <Bar dataKey="todayViolations" fill="#4caf50" name="Today Violations" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 12px)' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Radar Status Overview
                </Typography>
                {radarPerformance.map((radar, index) => (
                  <Box key={radar.radarId} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">{radar.radarName}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Status: {radar.status}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Uptime: {radar.uptime}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Speed: {radar.averageSpeed} km/h
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </TabPanel>

      {/* Speed Analysis Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <Button
              variant="contained"
              fullWidth
              onClick={loadSpeedAnalysis}
              disabled={loading}
              sx={{ height: '56px' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Analyze Speed'}
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(66.67% - 12px)' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Speed Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={speedAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="speedRange" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1976d2" name="Violations Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 12px)' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Speed Range Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={speedAnalysis}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {speedAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </TabPanel>

      {/* Location Analysis Tab */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <Button
              variant="contained"
              fullWidth
              onClick={loadLocationViolations}
              disabled={loading}
              sx={{ height: '56px' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Analyze Locations'}
            </Button>
          </Box>
        </Box>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Violations by Location
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={locationViolations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="location" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="violations" fill="#1976d2" name="Violations" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Monthly Report Tab */}
      <TabPanel value={tabValue} index={4}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
            <TextField
              fullWidth
              label="Year"
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
            <Button
              variant="contained"
              fullWidth
              onClick={loadMonthlyReport}
              disabled={loading}
              sx={{ height: '56px' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate Report'}
            </Button>
          </Box>
        </Box>

        {monthlyReport && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Report - {selectedYear}
              </Typography>
              <Typography variant="body1">
                {JSON.stringify(monthlyReport, null, 2)}
              </Typography>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* Compliance Report Tab */}
      <TabPanel value={tabValue} index={5}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.33% - 12px)' } }}>
            <Button
              variant="contained"
              fullWidth
              onClick={loadComplianceReport}
              disabled={loading}
              sx={{ height: '56px' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate Report'}
            </Button>
          </Box>
        </Box>

        {complianceReport && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance Report
              </Typography>
              <Typography variant="body1">
                {JSON.stringify(complianceReport, null, 2)}
              </Typography>
            </CardContent>
          </Card>
        )}
      </TabPanel>
    </Box>
  );
};

export default Reports;
