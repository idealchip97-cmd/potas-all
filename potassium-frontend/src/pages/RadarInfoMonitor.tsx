import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Storage,
  Wifi,
  WifiOff,
  Refresh,
} from '@mui/icons-material';
import udpReadingsApi, { UdpSystemStatus, UdpStatistics } from '../services/udpReadingsApi';

const RadarInfoMonitor: React.FC = () => {
  const [udpStatus, setUdpStatus] = useState<UdpSystemStatus | null>(null);
  const [udpStats, setUdpStats] = useState<UdpStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const loadUdpData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load UDP system status
      const status = await udpReadingsApi.getSystemStatus();
      setUdpStatus(status);
      setIsConnected(status.listening);

      // Load UDP statistics
      const statsResponse = await udpReadingsApi.getStatistics();
      if (statsResponse.success) {
        setUdpStats(statsResponse.data);
      }

      setLastUpdate(new Date().toISOString());
      console.log('✅ UDP system connected - Status:', status.listening ? 'Online' : 'Offline');
    } catch (error) {
      console.error('❌ Error loading UDP data:', error);
      setError('Failed to connect to UDP system');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUdpData();

    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      loadUdpData();
    }, 10000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const handleRefresh = () => {
    loadUdpData();
  };

  if (loading && !udpStatus) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Storage sx={{ fontSize: '2rem', color: isConnected ? 'success.main' : 'error.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              Radar Info Monitor
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Server: 192.186.1.14:17081
            </Typography>
          </Box>
          <Chip 
            icon={isConnected ? <Wifi /> : <WifiOff />}
            label={isConnected ? 'Connected' : 'Disconnected'} 
            color={isConnected ? 'success' : 'error'} 
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 calc(20% - 12px)', minWidth: 180 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">System Status</Typography>
            <Typography variant="h6" color={isConnected ? 'success.main' : 'error.main'}>
              {isConnected ? 'Online' : 'Offline'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {udpStatus?.stats.uptime ? `${Math.floor(udpStatus.stats.uptime / 60000)}m uptime` : 'No data'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 calc(20% - 12px)', minWidth: 180 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Messages Received</Typography>
            <Typography variant="h6">
              {udpStatus?.stats.messagesReceived || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total UDP messages
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 calc(20% - 12px)', minWidth: 180 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Violations Detected</Typography>
            <Typography variant="h6" color="warning.main">
              {udpStatus?.stats.violationsDetected || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Speed violations
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 calc(20% - 12px)', minWidth: 180 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Fines Created</Typography>
            <Typography variant="h6" color="error.main">
              {udpStatus?.stats.finesCreated || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Automatic fines
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 calc(20% - 12px)', minWidth: 180 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Speed Limit</Typography>
            <Typography variant="h6">
              {udpStatus?.stats.config.speedLimit || 30} km/h
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Current limit
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* System Information */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            UDP System Information
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="textSecondary">Port</Typography>
              <Typography variant="body1">{udpStatus?.address?.port || 17081}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">Address</Typography>
              <Typography variant="body1">{udpStatus?.address?.address || '0.0.0.0'}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">Status</Typography>
              <Typography variant="body1" color={isConnected ? 'success.main' : 'error.main'}>
                {udpStatus?.status || 'Unknown'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">Last Update</Typography>
              <Typography variant="body1">
                {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RadarInfoMonitor;
