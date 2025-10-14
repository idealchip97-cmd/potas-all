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
} from '@mui/material';
import {
  LocationOn,
  CheckCircle,
  Error,
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
} from '@mui/icons-material';
import { Radar } from '../types';

const Radars: React.FC = () => {
  const [radars, setRadars] = useState<Radar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null);

  const fetchRadars = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create 3 camera/radar entries with real data from violation system
      const cameras = ['camera001', 'camera002', 'camera003'];
      const date = '2025-10-05';
      const radarData: Radar[] = [];
      
      for (let i = 0; i < cameras.length; i++) {
        const cameraId = cameras[i];
        let violationCount = 0;
        
        try {
          // Fetch real violation data for each camera
          const response = await fetch(`http://localhost:3003/api/violations/${cameraId}/${date}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.violations) {
              violationCount = data.violations.length;
            }
          }
        } catch (fetchError) {
          console.warn(`Could not fetch data for ${cameraId}:`, fetchError);
        }
        
        // Create radar entry with Dead Sea Jordan locations + camera images
        const locations = [
          { name: 'Dead Sea Highway - North', coords: [31.5497, 35.4732], description: 'Main tourist route to Dead Sea resorts' },
          { name: 'Dead Sea Resort Area', coords: [31.5000, 35.4500], description: 'Hotel and spa district monitoring' },
          { name: 'Dead Sea - South Access', coords: [31.4500, 35.4200], description: 'Southern entrance checkpoint' }
        ];
        
        const radar: Radar = {
          id: i + 1,
          name: `Dead Sea Camera ${String(i + 1).padStart(3, '0')}`,
          location: locations[i].name,
          ipAddress: `192.168.1.${60 + i}`,
          serialNumber: `UNV-CAM-${2024000 + i}`,
          speedLimit: 30, // Static speed limit
          status: violationCount > 0 ? 'active' : 'inactive',
          latitude: locations[i].coords[0], // Dead Sea coordinates
          longitude: locations[i].coords[1],
          installationDate: '2024-01-15',
          lastMaintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          ftpPath: `/srv/processing_inbox/${cameraId}`,
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: new Date().toISOString(),
          statistics: {
            totalFines: violationCount,
            pendingFines: Math.floor(violationCount * 0.8)
          }
        };
        
        radarData.push(radar);
      }
      
      setRadars(radarData);
      console.log(`✅ Loaded ${radarData.length} cameras with real violation data`);
      
    } catch (error: any) {
      console.error('Error creating radar data:', error);
      setError(`Failed to load camera data: ${error.message}`);
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
      case 'error': return <Error />;
      default: return <WifiOff />;
    }
  };

  // Mock camera images - in real system these would come from actual cameras
  const getCameraImage = (cameraId: number) => {
    const images = [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop', // Dead Sea landscape
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop', // Highway view
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'  // Road monitoring
    ];
    return images[cameraId - 1] || images[0];
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
          <Button
            variant="contained"
            startIcon={<Refresh />}
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
            Refresh Network
          </Button>
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
                  image={getCameraImage(radar.id)}
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
                        {radar.statistics?.totalFines || 0}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Total Violations
                      </Typography>
                    </Box>
                    <Box textAlign="center" p={1} sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">
                        {radar.statistics?.pendingFines || 0}
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
                            <strong>Installed:</strong> {new Date(radar.installationDate).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Last Maintenance:</strong> {new Date(radar.lastMaintenance || '').toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Coordinates:</strong> {radar.latitude.toFixed(4)}, {radar.longitude.toFixed(4)}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" gap={1} mt={2}>
                          <Button 
                            size="small" 
                            startIcon={<Visibility />}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          >
                            View Live Feed
                          </Button>
                          <Button 
                            size="small" 
                            startIcon={<Timeline />}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          >
                            Analytics
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
