import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
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
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { DashboardStats, ViolationTrend, RadarPerformance } from '../types';
import apiService from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<ViolationTrend[]>([]);
  const [radarPerformance, setRadarPerformance] = useState<RadarPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, trendsResponse, performanceResponse] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getViolationTrends({ period: 'daily', days: 30 }),
        apiService.getRadarPerformance(),
      ]);

      if (statsResponse.success) setStats(statsResponse.data);
      if (trendsResponse.success) setTrends(trendsResponse.data);
      if (performanceResponse.success) setRadarPerformance(performanceResponse.data);
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
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
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Violation Trends Chart */}
        <Grid item xs={12} md={8}>
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
        </Grid>

        {/* Fine Status Distribution */}
        <Grid item xs={12} md={4}>
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
        </Grid>
      </Grid>

      {/* Status Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statusCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
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
          </Grid>
        ))}
      </Grid>

      {/* Radar Performance */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
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
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
