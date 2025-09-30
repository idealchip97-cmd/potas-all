import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Visibility,
  LocationOn,
  Speed,
  CheckCircle,
  Error,
  Warning,
  Build,
  Refresh,
  Wifi,
  WifiOff,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import apiService from '../services/api';
import realTimeDataService from '../services/realTimeDataService';
import { Radar } from '../types';

interface RadarFilters {
  status?: string;
  location?: string;
}

const Radars: React.FC = () => {
  const [radars, setRadars] = useState<Radar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRadar, setSelectedRadar] = useState<Radar | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<RadarFilters>({});
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [useRealTimeData, setUseRealTimeData] = useState(true);

  const setupRealTimeData = useCallback(() => {
    setLoading(true);
    
    // Subscribe to connection status
    const unsubscribeConnection = realTimeDataService.onConnectionChange((status) => {
      setIsRealTimeConnected(status.udp);
      if (!status.udp) {
        setError('Real-time connection lost. Switching to API data.');
        setUseRealTimeData(false);
      }
    });

    // Subscribe to radar updates
    const unsubscribeRadars = realTimeDataService.onRadarUpdate((updatedRadars) => {
      // Apply filters if any
      let filteredRadars = updatedRadars;
      
      if (filters.status) {
        filteredRadars = filteredRadars.filter(radar => radar.status === filters.status);
      }
      
      if (filters.location) {
        filteredRadars = filteredRadars.filter(radar => 
          radar.location.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }
      
      setRadars(filteredRadars);
      setLoading(false);
      setError(null);
    });

    // Subscribe to errors
    const unsubscribeErrors = realTimeDataService.onError((error, source) => {
      if (source === 'udp') {
        setError(`Real-time data error: ${error}`);
      }
    });

    // Request initial data
    realTimeDataService.requestRadarData();

    // Return cleanup function
    return () => {
      unsubscribeConnection();
      unsubscribeRadars();
      unsubscribeErrors();
    };
  }, [filters]);

  useEffect(() => {
    if (useRealTimeData) {
      setupRealTimeData();
    } else {
      fetchRadars();
    }
    
    return () => {
      // Cleanup subscriptions when component unmounts
    };
  }, [filters, useRealTimeData, setupRealTimeData]);

  const fetchRadars = async () => {
    try {
      setLoading(true);
      const response = await apiService.getRadars();
      console.log('Raw API response:', response);
      
      // Handle the correct API response structure: response.data.radars
      const radarData = response.data?.radars || response.data || [];
      console.log('Extracted radar data:', radarData);
      
      const processedRadars = Array.isArray(radarData) ? radarData : [];
      console.log('Processed radars:', processedRadars);
      
      setRadars(processedRadars);
      setError(null);
    } catch (err) {
      setError('Failed to fetch radars data');
      console.error('Error fetching radars:', err);
      setRadars([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (radarId: number) => {
    if (!Array.isArray(radars)) return;
    const radar = radars.find(r => r.id === radarId);
    if (radar) {
      setSelectedRadar(radar);
      setDialogOpen(true);
    }
  };

  const handleRefresh = () => {
    if (useRealTimeData) {
      realTimeDataService.requestRadarData();
    } else {
      fetchRadars();
    }
  };

  const toggleDataSource = () => {
    setUseRealTimeData(!useRealTimeData);
    setError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'inactive': return <Error />;
      case 'maintenance': return <Build />;
      default: return <Warning />;
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'location', headerName: 'Location', width: 200 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.row?.status || 'unknown';
        return (
          <Chip
            label={status}
            color={getStatusColor(status) as any}
            size="small"
            icon={getStatusIcon(status)}
          />
        );
      },
      valueGetter: (params: any) => params?.row?.status || 'unknown',
    },
    {
      field: 'speedLimit',
      headerName: 'Speed Limit',
      width: 120,
      type: 'number',
    },
    {
      field: 'statistics.pendingFines',
      headerName: 'Pending',
      width: 100,
      type: 'number',
      valueGetter: (params: any) => params?.row?.statistics?.pendingFines || 0,
    },
    {
      field: 'statistics.totalFines',
      headerName: 'Total Fines',
      width: 120,
      type: 'number',
      valueGetter: (params: any) => params?.row?.statistics?.totalFines || 0,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={() => handleViewDetails(params.row?.id)}
          color="primary"
          size="small"
          disabled={!params.row?.id}
        >
          <Visibility />
        </IconButton>
      ),
    },
  ];

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={handleRefresh} startIcon={<Refresh />}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1">
            Radar Management
          </Typography>
          <Chip
            icon={isRealTimeConnected ? <Wifi /> : <WifiOff />}
            label={useRealTimeData ? (isRealTimeConnected ? 'Real-time' : 'Connecting...') : 'API Mode'}
            color={isRealTimeConnected && useRealTimeData ? 'success' : 'default'}
            size="small"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={toggleDataSource}
            variant="outlined"
            size="small"
            startIcon={useRealTimeData ? <WifiOff /> : <Wifi />}
          >
            {useRealTimeData ? 'Use API' : 'Use Real-time'}
          </Button>
          <Button
            onClick={handleRefresh}
            startIcon={<Refresh />}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(33.33% - 12px)' } }}>
              <TextField
                select
                fullWidth
                label="Status"
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(33.33% - 12px)' } }}>
              <TextField
                fullWidth
                label="Location"
                value={filters.location || ''}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Radar Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Radars
                  </Typography>
                  <Typography variant="h4">
                    {radars.length}
                  </Typography>
                </Box>
                <LocationOn color="primary" />
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
                    Active
                  </Typography>
                  <Typography variant="h4">
                    {Array.isArray(radars) ? radars.filter(r => r.status === 'active').length : 0}
                  </Typography>
                </Box>
                <CheckCircle color="success" />
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
                    Maintenance
                  </Typography>
                  <Typography variant="h4">
                    {Array.isArray(radars) ? radars.filter(r => r.status === 'maintenance').length : 0}
                  </Typography>
                </Box>
                <Build color="warning" />
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
                    Inactive
                  </Typography>
                  <Typography variant="h4">
                    {Array.isArray(radars) ? radars.filter(r => r.status === 'inactive').length : 0}
                  </Typography>
                </Box>
                <Error color="error" />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Radars Data Grid */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Radar List
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={radars || []}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 20 }
                }
              }}
              pageSizeOptions={[10, 20, 50]}
              disableRowSelectionOnClick
              loading={loading}
              getRowId={(row) => row?.id || Math.random()}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Radar Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Radar Details - {selectedRadar?.name}
        </DialogTitle>
        <DialogContent>
          {selectedRadar && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Name
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.name}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={selectedRadar.status}
                  color={getStatusColor(selectedRadar.status) as any}
                  icon={getStatusIcon(selectedRadar.status)}
                />
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Location
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.location}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Speed Limit
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.speedLimit} km/h
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Coordinates
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.latitude}, {selectedRadar.longitude}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Created At
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedRadar.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Updated At
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedRadar.updatedAt).toLocaleDateString()}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Pending Fines
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.statistics?.pendingFines || 0}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Fines
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.statistics?.totalFines || 0}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Serial Number
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.serialNumber || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  IP Address
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.ipAddress || 'N/A'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Radars;
