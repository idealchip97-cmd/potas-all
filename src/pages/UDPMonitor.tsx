import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Storage,
  Wifi,
  WifiOff,
  Refresh,
  Radar as RadarIcon,
  Receipt,
} from '@mui/icons-material';
import realTimeDataService from '../services/realTimeDataService';
import { Radar, Fine } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UDPMonitor: React.FC = () => {
  const [radars, setRadars] = useState<Radar[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Filter states
  const [radarFilter, setRadarFilter] = useState('all');
  const [fineFilter, setFineFilter] = useState('all');

  useEffect(() => {
    setupRealTimeMonitoring();
    
    return () => {
      // Cleanup subscriptions
    };
  }, []);

  const setupRealTimeMonitoring = () => {
    setLoading(true);

    // Subscribe to connection status
    const unsubscribeConnection = realTimeDataService.onConnectionChange((status) => {
      setIsConnected(status.udp);
      if (!status.udp) {
        setError('UDP connection lost. Monitoring disabled.');
      } else {
        setError(null);
      }
    });

    // Subscribe to radar updates
    const unsubscribeRadars = realTimeDataService.onRadarUpdate((updatedRadars) => {
      setRadars(updatedRadars);
      setLastUpdate(new Date().toISOString());
      setLoading(false);
    });

    // Subscribe to fine updates
    const unsubscribeFines = realTimeDataService.onFineUpdate((updatedFines) => {
      setFines(updatedFines);
      setLastUpdate(new Date().toISOString());
      setLoading(false);
    });

    // Subscribe to errors
    const unsubscribeErrors = realTimeDataService.onError((error, source) => {
      if (source === 'udp') {
        setError(`UDP Error: ${error}`);
        setLoading(false);
      }
    });

    // Request initial data
    realTimeDataService.requestRadarData();
    realTimeDataService.requestFineData();

    // Return cleanup function
    return () => {
      unsubscribeConnection();
      unsubscribeRadars();
      unsubscribeFines();
      unsubscribeErrors();
    };
  };

  const handleRefresh = () => {
    setLoading(true);
    realTimeDataService.requestRadarData();
    realTimeDataService.requestFineData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'maintenance': return 'warning';
      case 'pending': return 'warning';
      case 'processed': return 'info';
      case 'paid': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const filteredRadars = radars.filter(radar => 
    radarFilter === 'all' || radar.status === radarFilter
  );

  const filteredFines = fines.filter(fine => 
    fineFilter === 'all' || fine.status === fineFilter
  );

  if (loading && radars.length === 0 && fines.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading UDP data...</Typography>
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
              UDP Server Monitor
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
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
          onClick={handleRefresh}
          startIcon={<Refresh />}
          disabled={loading}
          variant="contained"
        >
          Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Total Radars</Typography>
            <Typography variant="h4">{radars.length}</Typography>
            <Typography variant="body2" color="success.main">
              {radars.filter(r => r.status === 'active').length} Active
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Total Fines</Typography>
            <Typography variant="h4">{fines.length}</Typography>
            <Typography variant="body2" color="warning.main">
              {fines.filter(f => f.status === 'pending').length} Pending
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Last Update</Typography>
            <Typography variant="h6">
              {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {lastUpdate ? new Date(lastUpdate).toLocaleDateString() : ''}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Connection Status</Typography>
            <Typography variant="h6" color={isConnected ? 'success.main' : 'error.main'}>
              {isConnected ? 'Online' : 'Offline'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Real-time monitoring
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Data Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab 
              label={`Radars (${radars.length})`} 
              icon={<RadarIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Fines (${fines.length})`} 
              icon={<Receipt />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Radars Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2 }}>
            <TextField
              select
              label="Filter by Status"
              value={radarFilter}
              onChange={(e) => setRadarFilter(e.target.value)}
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
            </TextField>
          </Box>
          
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Speed Limit</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Serial Number</TableCell>
                  <TableCell>Statistics</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRadars.map((radar) => (
                  <TableRow key={radar.id} hover>
                    <TableCell>{radar.id}</TableCell>
                    <TableCell>{radar.name}</TableCell>
                    <TableCell>{radar.location}</TableCell>
                    <TableCell>
                      <Chip 
                        label={radar.status} 
                        color={getStatusColor(radar.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{radar.speedLimit} km/h</TableCell>
                    <TableCell>{radar.ipAddress || 'N/A'}</TableCell>
                    <TableCell>{radar.serialNumber || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        Total: {radar.statistics?.totalFines || 0}
                      </Typography>
                      <Typography variant="body2">
                        Pending: {radar.statistics?.pendingFines || 0}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Fines Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2 }}>
            <TextField
              select
              label="Filter by Status"
              value={fineFilter}
              onChange={(e) => setFineFilter(e.target.value)}
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processed">Processed</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
          </Box>
          
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Radar ID</TableCell>
                  <TableCell>Plate Number</TableCell>
                  <TableCell>Vehicle Speed</TableCell>
                  <TableCell>Speed Limit</TableCell>
                  <TableCell>Fine Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Violation Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFines.map((fine) => (
                  <TableRow key={fine.id} hover>
                    <TableCell>{fine.id}</TableCell>
                    <TableCell>{fine.radarId}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {fine.plateNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color={fine.vehicleSpeed > fine.speedLimit ? 'error.main' : 'text.primary'}
                      >
                        {fine.vehicleSpeed} km/h
                      </Typography>
                    </TableCell>
                    <TableCell>{fine.speedLimit} km/h</TableCell>
                    <TableCell>${fine.fineAmount}</TableCell>
                    <TableCell>
                      <Chip 
                        label={fine.status} 
                        color={getStatusColor(fine.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(fine.violationTime).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default UDPMonitor;
