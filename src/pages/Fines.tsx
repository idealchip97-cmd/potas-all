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
  Avatar,
} from '@mui/material';
import {
  Visibility,
  Receipt,
  Speed,
  CheckCircle,
  Error,
  Warning,
  Pending,
  Refresh,
  AttachMoney,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Fine, FilterOptions } from '../types';
import apiService from '../services/api';

const Fines: React.FC = () => {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    page: 1,
    limit: 20,
    status: '',
    radarId: undefined,
    startDate: '',
    endDate: '',
    minSpeed: undefined,
    maxSpeed: undefined,
  });

  useEffect(() => {
    fetchFines();
  }, [filters]);

  const fetchFines = async () => {
    try {
      setLoading(true);
      const response = await apiService.getFines(filters);
      if (response.success) {
        setFines(response.data);
      }
    } catch (err) {
      setError('Failed to load fines');
      console.error('Fines error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (fineId: number) => {
    try {
      const response = await apiService.getFineById(fineId);
      if (response.success) {
        setSelectedFine(response.data);
        setDialogOpen(true);
      }
    } catch (err) {
      console.error('Error fetching fine details:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Pending color="warning" />;
      case 'processed':
        return <CheckCircle color="info" />;
      case 'paid':
        return <CheckCircle color="success" />;
      case 'cancelled':
        return <Error color="error" />;
      default:
        return <Warning color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'processed':
        return 'info';
      case 'paid':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'plateNumber',
      headerName: 'Plate Number',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value} variant="outlined" size="small" />
      ),
    },
    {
      field: 'vehicleSpeed',
      headerName: 'Speed',
      width: 100,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          <Speed fontSize="small" sx={{ mr: 0.5 }} />
          {params.value} km/h
        </Box>
      ),
    },
    {
      field: 'speedLimit',
      headerName: 'Limit',
      width: 80,
      renderCell: (params) => `${params.value} km/h`,
    },
    {
      field: 'fineAmount',
      headerName: 'Fine Amount',
      width: 120,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" color="success.main">
          <AttachMoney fontSize="small" />
          {params.value}
        </Box>
      ),
    },
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
      field: 'violationTime',
      headerName: 'Violation Time',
      width: 180,
      renderCell: (params) => new Date(params.value).toLocaleString(),
    },
    {
      field: 'radar.location',
      headerName: 'Location',
      width: 150,
      valueGetter: (params) => params.row.radar?.location || 'N/A',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
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

  const totalFines = fines.length;
  const pendingFines = fines.filter(f => f.status === 'pending').length;
  const processedFines = fines.filter(f => f.status === 'processed').length;
  const paidFines = fines.filter(f => f.status === 'paid').length;
  const cancelledFines = fines.filter(f => f.status === 'cancelled').length;
  const totalRevenue = fines.reduce((sum, fine) => sum + fine.fineAmount, 0);

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
        <Typography variant="h4">Fines Management</Typography>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchFines}
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
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                label="Status"
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="processed">Processed</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Min Speed"
                type="number"
                value={filters.minSpeed || ''}
                onChange={(e) => setFilters({ ...filters, minSpeed: e.target.value ? Number(e.target.value) : undefined })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Max Speed"
                type="number"
                value={filters.maxSpeed || ''}
                onChange={(e) => setFilters({ ...filters, maxSpeed: e.target.value ? Number(e.target.value) : undefined })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Fines Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Fines
                  </Typography>
                  <Typography variant="h4">
                    {totalFines}
                  </Typography>
                </Box>
                <Receipt color="primary" sx={{ fontSize: '3rem' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending
                  </Typography>
                  <Typography variant="h4">
                    {pendingFines}
                  </Typography>
                </Box>
                <Pending color="warning" sx={{ fontSize: '3rem' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Processed
                  </Typography>
                  <Typography variant="h4">
                    {processedFines}
                  </Typography>
                </Box>
                <CheckCircle color="info" sx={{ fontSize: '3rem' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Paid
                  </Typography>
                  <Typography variant="h4">
                    {paidFines}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: '3rem' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    ${totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
                <AttachMoney color="success" sx={{ fontSize: '3rem' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fines Data Grid */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Fines List
          </Typography>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={fines}
              columns={columns}
              pageSize={20}
              rowsPerPageOptions={[10, 20, 50]}
              disableSelectionOnClick
              loading={loading}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Fine Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Fine Details - #{selectedFine?.id}
        </DialogTitle>
        <DialogContent>
          {selectedFine && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Plate Number
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.plateNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={selectedFine.status}
                  color={getStatusColor(selectedFine.status) as any}
                  icon={getStatusIcon(selectedFine.status)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Vehicle Speed
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.vehicleSpeed} km/h
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Speed Limit
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.speedLimit} km/h
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Fine Amount
                </Typography>
                <Typography variant="body1" gutterBottom color="success.main">
                  ${selectedFine.fineAmount}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Violation Time
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedFine.violationTime).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Radar ID
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.radarId}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Location
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.radar?.location || 'N/A'}
                </Typography>
              </Grid>
              {selectedFine.imageUrl && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Violation Image
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <img
                      src={selectedFine.imageUrl}
                      alt="Violation"
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </Box>
                </Grid>
              )}
              {selectedFine.processingNotes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Processing Notes
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedFine.processingNotes}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Created At
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedFine.createdAt).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Updated At
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedFine.updatedAt).toLocaleString()}
                </Typography>
              </Grid>
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

export default Fines;
