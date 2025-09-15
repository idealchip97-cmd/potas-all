import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  CalendarToday,
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

const Reports: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data states
  const [trends, setTrends] = useState<ViolationTrend[]>([]);
  const [radarPerformance, setRadarPerformance] = useState<RadarPerformance[]>([]);
  const [speedAnalysis, setSpeedAnalysis] = useState<SpeedAnalysis[]>([]);
  const [locationViolations, setLocationViolations] = useState<LocationViolation[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [complianceReport, setComplianceReport] = useState<any>(null);

  // Filter states
  const [trendPeriod, setTrendPeriod] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [trendDays, setTrendDays] = useState(30);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadReportData();
  }, [tabValue]);

  const loadReportData = async () => {
    setLoading(true);
    setError('');

    try {
      switch (tabValue) {
        case 0: // Trends
          await loadTrends();
          break;
        case 1: // Radar Performance
          await loadRadarPerformance();
          break;
        case 2: // Speed Analysis
          await loadSpeedAnalysis();
          break;
        case 3: // Location Analysis
          await loadLocationViolations();
          break;
        case 4: // Monthly Report
          await loadMonthlyReport();
          break;
        case 5: // Compliance Report
          await loadComplianceReport();
          break;
      }
    } catch (err) {
      setError('Failed to load report data');
      console.error('Reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    const response = await apiService.getViolationTrends({
      period: trendPeriod,
      days: trendDays,
    });
    if (response.success) {
      setTrends(response.data);
    }
  };

  const loadRadarPerformance = async () => {
    const response = await apiService.getRadarPerformance();
    if (response.success) {
      setRadarPerformance(response.data);
    }
  };

  const loadSpeedAnalysis = async () => {
    const response = await apiService.getSpeedAnalysis({
      startDate,
      endDate,
    });
    if (response.success) {
      setSpeedAnalysis(response.data);
    }
  };

  const loadLocationViolations = async () => {
    const response = await apiService.getViolationsByLocation({
      startDate,
      endDate,
    });
    if (response.success) {
      setLocationViolations(response.data);
    }
  };

  const loadMonthlyReport = async () => {
    const response = await apiService.getMonthlyReport(selectedYear);
    if (response.success) {
      setMonthlyReport(response.data);
    }
  };

  const loadComplianceReport = async () => {
    const response = await apiService.getComplianceReport({
      startDate,
      endDate,
    });
    if (response.success) {
      setComplianceReport(response.data);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Reports & Analytics</Typography>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={loadReportData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Violation Trends" icon={<TrendingUp />} />
          <Tab label="Radar Performance" icon={<Assessment />} />
          <Tab label="Speed Analysis" icon={<Speed />} />
          <Tab label="Location Analysis" icon={<LocationOn />} />
          <Tab label="Monthly Report" icon={<CalendarToday />} />
          <Tab label="Compliance Report" icon={<Assessment />} />
        </Tabs>

        {/* Violation Trends Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
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
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Number of Days"
                type="number"
                value={trendDays}
                onChange={(e) => setTrendDays(Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                fullWidth
                onClick={loadTrends}
                disabled={loading}
                sx={{ height: '56px' }}
              >
                {loading ? <CircularProgress size={24} /> : 'Update Trends'}
              </Button>
            </Grid>
          </Grid>

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
                  <Line type="monotone" dataKey="violations" stroke="#1976d2" strokeWidth={2} name="Violations" />
                  <Line type="monotone" dataKey="revenue" stroke="#4caf50" strokeWidth={2} name="Revenue ($)" />
                  <Line type="monotone" dataKey="averageSpeed" stroke="#ff9800" strokeWidth={2} name="Avg Speed (km/h)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Radar Performance Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
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
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Radar Status Overview
                  </Typography>
                  {radarPerformance.map((radar, index) => (
                    <Box key={radar.radarId} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">{radar.radarName}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Location: {radar.location}
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
            </Grid>
          </Grid>
        </TabPanel>

        {/* Speed Analysis Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                fullWidth
                onClick={loadSpeedAnalysis}
                disabled={loading}
                sx={{ height: '56px' }}
              >
                {loading ? <CircularProgress size={24} /> : 'Analyze Speed'}
              </Button>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
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
            </Grid>
            <Grid item xs={12} md={4}>
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
                        innerRadius={40}
                        outerRadius={120}
                        paddingAngle={5}
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
            </Grid>
          </Grid>
        </TabPanel>

        {/* Location Analysis Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                fullWidth
                onClick={loadLocationViolations}
                disabled={loading}
                sx={{ height: '56px' }}
              >
                {loading ? <CircularProgress size={24} /> : 'Analyze Locations'}
              </Button>
            </Grid>
          </Grid>

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
                  <Bar dataKey="totalViolations" fill="#1976d2" name="Total Violations" />
                  <Bar dataKey="revenue" fill="#4caf50" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Monthly Report Tab */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Year"
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                fullWidth
                onClick={loadMonthlyReport}
                disabled={loading}
                sx={{ height: '56px' }}
              >
                {loading ? <CircularProgress size={24} /> : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>

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
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                fullWidth
                onClick={loadComplianceReport}
                disabled={loading}
                sx={{ height: '56px' }}
              >
                {loading ? <CircularProgress size={24} /> : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>

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
      </Paper>
    </Box>
  );
};

export default Reports;
