import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Button,
  CardMedia,
  Fade,
  Slide,
  Avatar,
  LinearProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  LocationOn,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Refresh,
  PhotoCamera,
  Visibility,
  Speed,
  TrendingUp,
  WifiOff,
  Wifi,
  CameraAlt,
  Timeline,
  Edit,
  Delete,
  Add,
  Sync,
} from '@mui/icons-material';
import { Radar } from '../types';
import RadarEditDialog from '../components/RadarEditDialog';
import usePermissions from '../hooks/usePermissions';
import RoleIndicator from '../components/RoleIndicator';

const Radars: React.FC = () => {
  const permissions = usePermissions();
  const [radars, setRadars] = useState<Radar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRadar, setSelectedRadar] = useState<Radar | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [radarToDelete, setRadarToDelete] = useState<Radar | null>(null);

  const fetchRadars = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token') || 'demo_token_1760447560349_liqy8nlhx';
      
      // Use dynamic discovery endpoint
      const response = await fetch('/api/radars/discover', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.radars) {
          setRadars(data.data.radars);
          console.log(`✅ Discovered ${data.data.radars.length} radars from /srv/processing_inbox`);
        } else {
          throw new (Error as any)(data.message || 'Failed to discover radars');
        }
      } else {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        throw new (Error as any)(errorMsg);
      }
      
    } catch (error: any) {
      console.error('Error discovering radars:', error);
      setError(`Failed to discover radars: ${error.message}`);
      setRadars([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadars();
  }, []);

  const handleRefresh = () => {
    fetchRadars();
  };

  const handleEditRadar = (radar: Radar) => {
    setSelectedRadar(radar);
    setEditDialogOpen(true);
  };

  const handleAddRadar = () => {
    setSelectedRadar(null);
    setEditDialogOpen(true);
  };

  const handleSaveRadar = async (formData: FormData) => {
    try {
      const token = localStorage.getItem('token') || 'demo_token_1760447560349_liqy8nlhx';
      
      const url = selectedRadar ? `/api/radars/${selectedRadar.id}` : '/api/radars';
      const method = selectedRadar ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ ${selectedRadar ? 'Updated' : 'Created'} radar successfully`);
          fetchRadars(); // Refresh the list
        } else {
          throw new (Error as any)(data.message || 'Failed to save radar');
        }
      } else {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        throw new (Error as any)(errorMsg);
      }
    } catch (error: any) {
      console.error('Error saving radar:', error);
      throw error; // Re-throw to be handled by the dialog
    }
  };

  const handleDeleteRadar = (radar: Radar) => {
    setRadarToDelete(radar);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRadar = async () => {
    if (!radarToDelete) return;
    
    try {
      const token = localStorage.getItem('token') || 'demo_token_1760447560349_liqy8nlhx';
      
      const response = await fetch(`/api/radars/${radarToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ Deleted radar ${radarToDelete.name} successfully`);
          fetchRadars(); // Refresh the list
          setDeleteDialogOpen(false);
          setRadarToDelete(null);
        } else {
          throw new (Error as any)(data.message || 'Failed to delete radar');
        }
      } else {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        throw new (Error as any)(errorMsg);
      }
    } catch (error: any) {
      console.error('Error deleting radar:', error);
      setError(`Failed to delete radar: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'maintenance': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Wifi />;
      case 'inactive': return <WifiOff />;
      case 'maintenance': return <Warning />;
      case 'error': return <ErrorIcon />;
      default: return <WifiOff />;
    }
  };

  // Get radar image - use uploaded image or fallback to default
  const getRadarImage = (radar: Radar) => {
    if (radar.imageUrl) {
      return `http://localhost:3001${radar.imageUrl}`;
    }
    
    // Fallback images based on radar ID
    const fallbackImages = [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop', // Dead Sea landscape
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop', // Highway view
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'  // Road monitoring
    ];
    return fallbackImages[(radar.id - 1) % fallbackImages.length];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Dead Sea Camera Network...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <RoleIndicator />
      
      {/* Animated Header */}
      <Slide direction="down" in={!loading} timeout={800}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom sx={{ 
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold'
            }}>
              🇯🇴 Dead Sea Camera Network
            </Typography>
            <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
              Advanced Speed Detection System - Jordan Dead Sea Region
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <Chip 
                icon={<LocationOn />} 
                label="Dead Sea, Jordan" 
                color="primary" 
                variant="filled"
              />
              <Chip 
                icon={<PhotoCamera />} 
                label={`${radars.length} Active Cameras`} 
                color="success" 
                variant="filled"
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {permissions.canAddRadars && (
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddRadar}
                sx={{
                  borderColor: '#10b981',
                  color: '#10b981',
                  '&:hover': {
                    borderColor: '#059669',
                    backgroundColor: 'rgba(16, 185, 129, 0.04)',
                  },
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                }}
              >
                Add Radar
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<Sync />}
              onClick={handleRefresh}
              size="large"
              sx={{
                borderRadius: 3,
                px: 3,
                py: 1.5,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                  transform: 'translateY(-2px)',
                  boxShadow: 6
                },
                transition: 'all 0.3s ease'
              }}
            >
              Sync Radars
            </Button>
          </Box>
        </Box>
      </Slide>

      {error && (
        <Fade in={!!error}>
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        </Fade>
      )}

      {/* Camera Cards Grid */}
      <Box 
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)'
          },
          gap: 4
        }}
      >
        {radars.map((radar, index) => (
          <Fade in={!loading} timeout={1000 + index * 200} key={radar.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  '&:hover': { 
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                  },
                  background: radar.status === 'active' 
                    ? 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)'
                    : 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)'
                }}
                onClick={() => setSelectedCamera(selectedCamera === radar.id ? null : radar.id)}
              >
                {/* Camera Image */}
                <CardMedia
                  component="img"
                  height="200"
                  image={getRadarImage(radar)}
                  alt={radar.name}
                  sx={{
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'scale(1.05)' }
                  }}
                />
                
                {/* Status Overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 1
                  }}
                >
                  <Chip
                    icon={getStatusIcon(radar.status)}
                    label={radar.status.toUpperCase()}
                    color={getStatusColor(radar.status) as any}
                    sx={{
                      fontWeight: 'bold',
                      boxShadow: 2,
                      '& .MuiChip-icon': {
                        animation: radar.status === 'active' ? 'pulse 2s infinite' : 'none'
                      }
                    }}
                  />
                </Box>

                <CardContent sx={{ p: 3 }}>
                  {/* Camera Info */}
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="h5" fontWeight="bold" gutterBottom>
                        {radar.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" display="flex" alignItems="center" gap={1}>
                        <LocationOn fontSize="small" />
                        {radar.location}
                      </Typography>
                    </Box>
                    <Avatar 
                      sx={{ 
                        bgcolor: radar.status === 'active' ? '#4caf50' : '#757575',
                        width: 48,
                        height: 48
                      }}
                    >
                      <CameraAlt />
                    </Avatar>
                  </Box>

                  {/* Statistics */}
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={2}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight="bold" color="primary">
                        {radar.violationCount || 0}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Total Violations
                      </Typography>
                    </Box>
                    <Box textAlign="center" p={1} sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">
                        {Math.floor((radar.violationCount || 0) * 0.8)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Pending Fines
                      </Typography>
                    </Box>
                  </Box>

                  {/* Technical Details */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      IP: {radar.ipAddress}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Speed Limit: {radar.speedLimit} km/h
                    </Typography>
                  </Box>

                  {/* Activity Indicator */}
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" fontWeight="medium">
                        Camera Activity
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {radar.status === 'active' ? '98%' : '0%'} Uptime
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={radar.status === 'active' ? 98 : 0}
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: '#f0f0f0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: radar.status === 'active' ? '#4caf50' : '#757575',
                          borderRadius: 4
                        }
                      }}
                    />
                  </Box>

                  {/* Expanded Details */}
                  {selectedCamera === radar.id && (
                    <Fade in={selectedCamera === radar.id} timeout={500}>
                      <Box mt={3} p={2} sx={{ bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                          Technical Specifications
                        </Typography>
                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1} mb={2}>
                          <Typography variant="body2">
                            <strong>Serial:</strong> {radar.serialNumber}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Installed:</strong> {
                              radar.installationDate 
                                ? new Date(radar.installationDate).toLocaleDateString()
                                : 'Not available'
                            }
                          </Typography>
                          <Typography variant="body2">
                            <strong>Last Maintenance:</strong> {
                              radar.lastMaintenance 
                                ? new Date(radar.lastMaintenance).toLocaleDateString()
                                : 'Not available'
                            }
                          </Typography>
                          <Typography variant="body2">
                            <strong>Coordinates:</strong> {
                              typeof radar.latitude === 'number' && typeof radar.longitude === 'number' 
                                ? `${radar.latitude.toFixed(4)}, ${radar.longitude.toFixed(4)}`
                                : 'Not available'
                            }
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          {permissions.canEditRadars && (
                            <Button 
                              size="small" 
                              startIcon={<Edit />}
                              variant="contained"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRadar(radar);
                              }}
                              sx={{ borderRadius: 2 }}
                            >
                              Edit
                            </Button>
                          )}
                          {permissions.canDeleteRadars && (
                            <Button 
                              size="small" 
                              startIcon={<Delete />}
                              variant="outlined"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRadar(radar);
                              }}
                              sx={{ borderRadius: 2 }}
                            >
                              Delete
                            </Button>
                          )}
                          <Button 
                            size="small" 
                            startIcon={<Visibility />}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          >
                            Live Feed
                          </Button>
                        </Box>
                      </Box>
                    </Fade>
                  )}
                </CardContent>
              </Card>
          </Fade>
        ))}
      </Box>

      {/* Edit Radar Dialog */}
      <RadarEditDialog
        open={editDialogOpen}
        radar={selectedRadar}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedRadar(null);
        }}
        onSave={handleSaveRadar}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete radar "{radarToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Location: {radarToDelete?.location}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmDeleteRadar} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add CSS animations */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

export default Radars;
