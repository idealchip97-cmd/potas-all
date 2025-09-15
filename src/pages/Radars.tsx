import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Radar, FilterOptions } from '../types';
import apiService from '../services/api';

const Radars: React.FC = () => {
  const [radars, setRadars] = useState<Radar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRadar, setSelectedRadar] = useState<Radar | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    page: 1,
    limit: 10,
    status: '',
    location: '',
  });

  useEffect(() => {
    fetchRadars();
  }, [filters]);

  const fetchRadars = async () => {
    try {
      setLoading(true);
      const response = await apiService.getRadars(filters);
      if (response.success) {
        setRadars(response.data);
      }
    } catch (err) {
      setError('Failed to load radars');
      console.error('Radars error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (radarId: number) => {
    try {
      const response = await apiService.getRadarById(radarId);
      if (response.success) {
        setSelectedRadar(response.data);
        setDialogOpen(true);
      }
    } catch (err) {
      console.error('Error fetching radar details:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle color="success" />;
      case 'inactive':
        return <Error color="error" />;
      case 'maintenance':
        return <Build color="warning" />;
      case 'error':
        return <Warning color="error" />;
      default:
        return <Error color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'maintenance':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'location', headerName: 'Location', width: 200 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value) as any}
          size="small"
          icon={getStatusIcon(params.value)}
        />
      ),
    },
    {
      field: 'speedLimit',
      headerName: 'Speed Limit',
      width: 120,
      renderCell: (params) => `${params.value} km/h`,
    },
    {
      field: 'statistics.totalFines',
      headerName: 'Total Fines',
      width: 120,
      valueGetter: (params) => params.row.statistics?.totalFines || 0,
    },
    {
      field: 'statistics.todayFines',
      headerName: 'Today Fines',
      width: 120,
      valueGetter: (params) => params.row.statistics?.todayFines || 0,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={() => handleViewDetails(params.row.id)}
          color="primary"
        >
          <Visibility />
        </IconButton>
      ),
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Radar Management</Typography>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchRadars}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
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
                <MenuItem value="error">Error</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Location"
                value={filters.location || ''}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Radar Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
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
                <LocationOn color="primary" sx={{ fontSize: '3rem' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Radars
                  </Typography>
                  <Typography variant="h4">
                    {radars.filter(r => r.status === 'active').length}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: '3rem' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Maintenance
                  </Typography>
                  <Typography variant="h4">
                    {radars.filter(r => r.status === 'maintenance').length}
                  </Typography>
                </Box>
                <Build color="warning" sx={{ fontSize: '3rem' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Errors
                  </Typography>
                  <Typography variant="h4">
                    {radars.filter(r => r.status === 'error').length}
                  </Typography>
                </Box>
                <Error color="error" sx={{ fontSize: '3rem' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Radars Data Grid */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Radar List
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={radars}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[5, 10, 20]}
              disableSelectionOnClick
              loading={loading}
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
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Location
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.location}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={selectedRadar.status}
                  color={getStatusColor(selectedRadar.status) as any}
                  icon={getStatusIcon(selectedRadar.status)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Speed Limit
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.speedLimit} km/h
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Coordinates
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.latitude}, {selectedRadar.longitude}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  FTP Path
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRadar.ftpPath}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Created At
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedRadar.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
              {selectedRadar.statistics && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Statistics
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Total Fines
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedRadar.statistics.totalFines}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Today's Fines
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedRadar.statistics.todayFines}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Average Speed
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedRadar.statistics.averageSpeed} km/h
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Uptime
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedRadar.statistics.uptime}%
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
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
