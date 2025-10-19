import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Pagination,
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
  CameraAlt,
  Speed,
  Edit,
  Delete,
} from '@mui/icons-material';
import apiService from '../services/api';
import approvalSyncService from '../services/approvalSyncService';
import { Fine } from '../types';
import usePermissions from '../hooks/usePermissions';
import RoleIndicator from '../components/RoleIndicator';

interface FineFilters {
  status?: string;
  minSpeed?: number;
  maxSpeed?: number;
  startDate?: string;
  endDate?: string;
}

const Fines: React.FC = () => {
  const permissions = usePermissions();
  const [fines, setFines] = useState<Fine[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FineFilters>({});
  
  // Pagination state
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fineToDelete, setFineToDelete] = useState<Fine | null>(null);
  
  // Edit plate number state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fineToEdit, setFineToEdit] = useState<Fine | null>(null);
  const [newPlateNumber, setNewPlateNumber] = useState('');
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const calculateStats = useCallback((finesData: Fine[]) => {
    const totalFines = finesData.length;
    const pendingFines = finesData.filter(f => f.status === 'pending').length;
    const processedFines = finesData.filter(f => f.status === 'processed').length;
    const paidFines = finesData.filter(f => f.status === 'paid').length;
    const totalRevenue = finesData.reduce((sum, fine) => sum + fine.fineAmount, 0);
    
    setStats({
      totalFines,
      pendingFines,
      processedFines,
      paidFines,
      totalRevenue
    });
  }, []);

  // Load fines data on component mount and when filters change
  useEffect(() => {
    fetchFines();
    fetchStats();
  }, [filters]);

  const fetchFines = async () => {
    try {
      setLoading(true);
      const response = await apiService.getFines(filters);
      const finesData = response.data?.fines || response.data || [];
      setFines(Array.isArray(finesData) ? finesData : []);
      calculateStats(Array.isArray(finesData) ? finesData : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching fines:', err);
      setError('Failed to fetch fines data');
      setFines([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.getFines({});
      const finesData = response.data?.fines || response.data || [];
      calculateStats(Array.isArray(finesData) ? finesData : []);
    } catch (error) {
      console.error('Error fetching fine stats:', error);
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
    setError(null);
  };

  // Delete fine function
  const handleDeleteFine = async () => {
    if (!fineToDelete) return;
    
    try {
      const response = await apiService.deleteFine(fineToDelete.id);
      
      if (response.success) {
        setSuccessMessage(`Fine #${fineToDelete.id} deleted successfully!`);
        setFines(fines.filter(f => f.id !== fineToDelete.id));
        calculateStats(fines.filter(f => f.id !== fineToDelete.id));
        
        // Notify approval sync service about the deletion
        if (response.data?.caseInfo) {
          // Use current date as default - in a real app you might want to track this better
          const currentDate = new Date().toISOString().split('T')[0];
          approvalSyncService.handleFineDeleted(response.data.caseInfo, currentDate);
        }
        
        // Hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Failed to delete fine');
      }
    } catch (error) {
      console.error('Error deleting fine:', error);
      setError('Failed to delete fine');
    } finally {
      setDeleteDialogOpen(false);
      setFineToDelete(null);
    }
  };

  // Edit plate number function
  const handleEditPlateNumber = async () => {
    if (!fineToEdit || !newPlateNumber.trim()) return;
    
    try {
      const response = await apiService.updateFine(fineToEdit.id, {
        plateNumber: newPlateNumber.trim()
      });
      
      if (response.success) {
        setSuccessMessage(`Plate number updated successfully to ${newPlateNumber}!`);
        
        // Update the fine in the local state
        setFines(fines.map(f => 
          f.id === fineToEdit.id 
            ? { ...f, plateNumber: newPlateNumber.trim() }
            : f
        ));
        
        // Hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Failed to update plate number');
      }
    } catch (error) {
      console.error('Error updating plate number:', error);
      setError('Failed to update plate number');
    } finally {
      setEditDialogOpen(false);
      setFineToEdit(null);
      setNewPlateNumber('');
    }
  };

  // Open delete confirmation
  const openDeleteConfirmation = (fine: Fine) => {
    setFineToDelete(fine);
    setDeleteDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (fine: Fine) => {
    setFineToEdit(fine);
    setNewPlateNumber(fine.plateNumber || '');
    setEditDialogOpen(true);
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

  if (error && fines.length === 0) {
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
      <Typography variant="h4" gutterBottom>
        Fines Management
      </Typography>
      
      <RoleIndicator />

      {/* Statistics Cards */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 3, 
        mb: 3,
        '& > *': { flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(20% - 14.4px)' } }
      }}>
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

      {/* Fines Table */}
      <Card>
        <CardContent>
          {/* Success/Error Messages */}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Fines Management ({fines.length} total)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              size="small"
            >
              Refresh
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>Loading fines...</Typography>
            </Box>
          ) : fines.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="textSecondary">
                No fines found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Approved violations will appear here
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Image</TableCell>
                      <TableCell>Plate Number</TableCell>
                      <TableCell>Speed</TableCell>
                      <TableCell>Fine Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Violation Time</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fines
                      .slice((page - 1) * itemsPerPage, page * itemsPerPage)
                      .map((fine, index) => (
                      <TableRow key={`fine-${fine.id}-${index}`}>
                        <TableCell>
                          <Avatar
                            src={fine.imageUrl}
                            variant="rounded"
                            sx={{ width: 80, height: 60 }}
                          >
                            <CameraAlt />
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={fine.plateNumber || 'Unknown'} 
                            color="primary" 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Speed fontSize="small" color="action" />
                            <Typography variant="body2">
                              {fine.speedDetected || fine.vehicleSpeed} km/h
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              (limit: {fine.speedLimit})
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            ${fine.fineAmount}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={fine.status}
                            color={getStatusColor(fine.status) as any}
                            size="small"
                            icon={getStatusIcon(fine.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(fine.violationDateTime || fine.violationTime || new Date()).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(fine.id)}
                                color="primary"
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            {permissions.canEditFines && (
                              <Tooltip title="Edit Plate Number">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => openEditDialog(fine)}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                            )}
                            {permissions.canDeleteFines && (
                              <Tooltip title="Delete Fine">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => openDeleteConfirmation(fine)}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(fines.length / itemsPerPage)}
                  page={page}
                  onChange={(event, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete Fine #{fineToDelete?.id}?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Plate: {fineToDelete?.plateNumber} | Amount: ${fineToDelete?.fineAmount}
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteFine} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Plate Number Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          Edit Plate Number
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Fine #{fineToEdit?.id} - Current plate: {fineToEdit?.plateNumber}
          </Typography>
          <TextField
            fullWidth
            label="New Plate Number"
            value={newPlateNumber}
            onChange={(e) => setNewPlateNumber(e.target.value)}
            placeholder="Enter new plate number"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditPlateNumber} 
            color="primary" 
            variant="contained"
            disabled={!newPlateNumber.trim()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

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
                  Vehicle Speed
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedFine.speedDetected} km/h
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
                <Typography variant="body1" gutterBottom>
                  ${selectedFine.fineAmount}
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
                  Violation Time
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedFine.violationDateTime || selectedFine.violationTime || new Date()).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Fines;
