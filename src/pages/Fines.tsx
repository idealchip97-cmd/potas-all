import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import {
  Visibility,
  Receipt,
  CheckCircle,
  Error,
  Warning,
  Pending,
  Refresh,
  AttachMoney,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import apiService from '../services/api';
import { Fine } from '../types';


interface FineFilters {
  status?: string;
  minSpeed?: number;
  maxSpeed?: number;
  startDate?: string;
  endDate?: string;
}

const Fines: React.FC = () => {
  const [fines, setFines] = useState<Fine[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FineFilters>({});

  useEffect(() => {
    fetchFines();
    fetchStats();
  }, [filters]);

  const fetchFines = async () => {
    try {
      setLoading(true);
      const response = await apiService.getFines(filters);
      // Handle the correct API response structure: response.data.fines
      const finesData = response.data?.fines || response.data || [];
      setFines(Array.isArray(finesData) ? finesData : []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch fines data');
      console.error('Error fetching fines:', err);
      setFines([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.getFines({});
      // Handle the correct API response structure for stats
      const finesData = response.data?.fines || response.data || [];
      setStats(Array.isArray(finesData) ? finesData : []);
    } catch (err) {
      console.error('Error fetching fine stats:', err);
      setStats([]);
    }
  };

  const handleViewDetails = (fineId: number) => {
    const fine = fines.find(f => f.id === fineId);
    if (fine) {
      setSelectedFine(fine);
      setDialogOpen(true);
    }
  };

  const handleRefresh = () => {
    fetchFines();
    fetchStats();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'processed': return 'info';
      case 'paid': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Pending />;
      case 'processed': return <CheckCircle />;
      case 'paid': return <AttachMoney />;
      case 'cancelled': return <Error />;
      default: return <Warning />;
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'plateNumber', headerName: 'Plate Number', width: 130 },
    {
      field: 'vehicleSpeed',
      headerName: 'Speed (km/h)',
      width: 120,
      type: 'number',
    },
    {
      field: 'speedLimit',
      headerName: 'Speed Limit',
      width: 120,
      type: 'number',
    },
    {
      field: 'fineAmount',
      headerName: 'Fine Amount',
      width: 120,
      type: 'number',
      renderCell: (params) => `$${params.value}`,
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
      valueGetter: (params: any) => 'N/A',
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
          size="small"
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
        <Typography variant="h4" component="h1">
          Fines Management
        </Typography>
        <Button
          onClick={handleRefresh}
          startIcon={<Refresh />}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(16.67% - 10px)' } }}>
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
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(16.67% - 10px)' } }}>
              <TextField
                fullWidth
                label="Min Speed"
                type="number"
                value={filters.minSpeed || ''}
                onChange={(e) => setFilters({ ...filters, minSpeed: e.target.value ? Number(e.target.value) : undefined })}
              />
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(16.67% - 10px)' } }}>
              <TextField
                fullWidth
                label="Max Speed"
                type="number"
                value={filters.maxSpeed || ''}
                onChange={(e) => setFilters({ ...filters, maxSpeed: e.target.value ? Number(e.target.value) : undefined })}
              />
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(33.33% - 12px)' } }}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(33.33% - 12px)' } }}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Fines Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(20% - 14.4px)' } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Fines
                  </Typography>
                  <Typography variant="h4">
                    {stats?.totalFines || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Receipt />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(20% - 14.4px)' } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending
                  </Typography>
                  <Typography variant="h4">
                    {stats?.pendingFines || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Pending />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(20% - 14.4px)' } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Processed
                  </Typography>
                  <Typography variant="h4">
                    {stats?.processedFines || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(20% - 14.4px)' } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    ${stats?.totalRevenue || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <AttachMoney />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(20% - 14.4px)' } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Monthly Growth
                  </Typography>
                  <Typography variant="h4">
                    {stats?.monthlyGrowth || 0}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: stats?.monthlyGrowth && stats.monthlyGrowth > 0 ? 'success.main' : 'error.main' }}>
                  {stats?.monthlyGrowth && stats.monthlyGrowth > 0 ? <TrendingUp /> : <TrendingDown />}
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

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
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 20 }
                }
              }}
              pageSizeOptions={[10, 20, 50]}
              disableRowSelectionOnClick
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Plate Number
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.plateNumber}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={selectedFine.status}
                  color={getStatusColor(selectedFine.status) as any}
                  icon={getStatusIcon(selectedFine.status)}
                />
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Vehicle Speed
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.vehicleSpeed} km/h
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Speed Limit
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.speedLimit} km/h
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Fine Amount
                </Typography>
                <Typography variant="body1" gutterBottom color="success.main">
                  ${selectedFine.fineAmount}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Violation Time
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedFine.violationTime).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Radar ID
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.radarId}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Location
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.radar?.location || 'N/A'}
                </Typography>
              </Box>
              {selectedFine.imageUrl && (
                <Box sx={{ flex: '1 1 100%' }}>
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
                </Box>
              )}
              {selectedFine.processingNotes && (
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Processing Notes
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedFine.processingNotes}
                  </Typography>
                </Box>
              )}
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Created At
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedFine.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Updated At
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedFine.updatedAt).toLocaleString()}
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

export default Fines;
