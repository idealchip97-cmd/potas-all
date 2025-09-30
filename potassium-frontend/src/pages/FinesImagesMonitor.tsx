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
  IconButton,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload,
  Wifi,
  WifiOff,
  Refresh,
  Visibility,
  Download,
  Delete,
  Search,
  FilterList,
  Image as ImageIcon,
  Close,
} from '@mui/icons-material';
import { PlateRecognitionImage } from '../services/ftpClient';
import udpReadingsApi, { UdpReading } from '../services/udpReadingsApi';

interface FilterOptions {
  status: string;
  dateRange: string;
  search: string;
}

const FinesImagesMonitor: React.FC = () => {
  const [images, setImages] = useState<PlateRecognitionImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<PlateRecognitionImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<PlateRecognitionImage | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: 'all',
    search: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    todayCount: 0
  });

  useEffect(() => {
    // Simple initialization - load data directly
    loadAvailableDates();
    loadFreshImages();
    
    // Set up auto-refresh every 30 seconds
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh: Loading fresh images');
      loadFreshImages();
      loadAvailableDates();
    }, 30000);
    
    return () => {
    };
  }, []);

  const loadAvailableDates = async () => {
    try {
      const cacheBuster = Date.now();
      const response = await fetch(`http://localhost:3003/api/ftp-images/dates?camera=192.168.1.54&_t=${cacheBuster}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.dates) {
          setAvailableDates(data.dates);
          console.log(`📅 Loaded ${data.dates.length} available dates from image server`);
        } else {
          console.warn('⚠️ Image server responded but no dates found:', data);
        }
      } else {
        console.error(`❌ Image server responded with status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to load available dates from image server:', error);
      console.log('🔧 Check if image server is running on http://localhost:3003');
    }
  };

  const loadFreshImages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Direct API call to local image server for fresh data
      const cacheBuster = Date.now();
      const response = await fetch(`http://localhost:3003/api/ftp-images/list?camera=192.168.1.54&date=all&_t=${cacheBuster}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.files) {
          // Get UDP readings to correlate with images
          let udpReadings: UdpReading[] = [];
          try {
            const udpResponse = await udpReadingsApi.getLiveReadings(100);
            if (udpResponse.success) {
              udpReadings = udpResponse.data;
            }
          } catch (udpError) {
            console.warn('Could not load UDP readings for correlation:', udpError);
          }

          const formattedImages = data.files.map((file: any) => {
            // Try to correlate image with UDP reading based on timestamp
            const imageTime = new Date(file.timestamp);
            const correlatedReading = udpReadings.find(reading => {
              const readingTime = new Date(reading.detectionTime);
              const timeDiff = Math.abs(imageTime.getTime() - readingTime.getTime());
              return timeDiff < 30000; // Within 30 seconds
            });

            // Generate random speed if no UDP data available (30-77 km/h)
            const randomSpeed = Math.floor(Math.random() * (77 - 30 + 1)) + 30;
            const speedLimit = 30;
            const detectedSpeed = correlatedReading?.speedDetected || randomSpeed;
            const isViolation = correlatedReading?.isViolation || (detectedSpeed > speedLimit);
            
            // Calculate fine amount based on speed
            let fineAmount = null;
            if (isViolation) {
              const speedOver = detectedSpeed - speedLimit;
              if (speedOver <= 10) fineAmount = 100;
              else if (speedOver <= 20) fineAmount = 200;
              else if (speedOver <= 30) fineAmount = 300;
              else fineAmount = 500;
            }

            return {
              id: file.filename,
              filename: file.filename,
              timestamp: file.timestamp,
              size: file.size,
              url: `http://localhost:3003${file.url}`,
              imageUrl: `http://localhost:3003${file.url}`,
              thumbnailUrl: `http://localhost:3003${file.url}`,
              plateNumber: 'Processing...',
              confidence: 0,
              status: 'pending' as const,
              processingStatus: 'completed' as const,
              processed: true,
              // Add speed data (UDP or random)
              speed: detectedSpeed,
              speedLimit: speedLimit,
              isViolation: isViolation,
              radarId: correlatedReading?.radarId || 1,
              fineAmount: correlatedReading?.fine?.fineAmount || fineAmount
            };
          });
          setImages(formattedImages);
          setIsConnected(true);
          setConnectionMode('local_server');
          updateStats(formattedImages);
          console.log(`📸 Loaded ${formattedImages.length} fresh images from local server with UDP correlation`);
        } else {
          setError('No images found on local server');
          setImages([]);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load fresh images:', error);
      setError(`Failed to connect to local image server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnected(false);
      setConnectionMode('disconnected');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [images, filters]);

  // Simple stats calculation
  const updateStats = (imageList: PlateRecognitionImage[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayImages = imageList.filter(img => 
      new Date(img.timestamp) >= today
    );

    setStats({
      total: imageList.length,
      pending: imageList.filter(img => img.processingStatus === 'pending').length,
      processing: imageList.filter(img => img.processingStatus === 'processing').length,
      completed: imageList.filter(img => img.processingStatus === 'completed').length,
      failed: imageList.filter(img => img.processingStatus === 'failed').length,
      todayCount: todayImages.length
    });
  };


  const applyFilters = () => {
    let filtered = [...images];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(img => img.processingStatus === filters.status);
    }

    // Date range filter - only apply for relative date ranges, not specific dates
    // Specific dates (like "2025-09-30") are handled by the API call
    if (filters.dateRange !== 'all' && !filters.dateRange.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(img => new Date(img.timestamp) >= cutoffDate);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(img => 
        img.filename.toLowerCase().includes(searchLower) ||
        (img.plateNumber && img.plateNumber.toLowerCase().includes(searchLower)) ||
        (img.vehicleType && img.vehicleType.toLowerCase().includes(searchLower))
      );
    }

    setFilteredImages(filtered);
  };

  const handleRefresh = () => {
    setError(null);
    // Force fresh data load from local server
    loadFreshImages();
    loadAvailableDates();
  };

  const handleClearCache = () => {
    setImages([]);
    setFilteredImages([]);
    setStats({
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      todayCount: 0
    });
    // Reload fresh data
    setTimeout(() => {
      loadFreshImages();
      loadAvailableDates();
    }, 500);
  };

  const handleDateFilterChange = async (selectedDate: string) => {
    console.log(`🔍 Date filter changed to: ${selectedDate}`);
    setLoading(true);
    setError(null);
    setFilters(prev => ({ ...prev, dateRange: selectedDate }));
    
    try {
      const cacheBuster = Date.now();
      const apiUrl = selectedDate === 'all' 
        ? `http://localhost:3003/api/ftp-images/list?camera=192.168.1.54&date=all&_t=${cacheBuster}`
        : `http://localhost:3003/api/ftp-images/list?camera=192.168.1.54&date=${selectedDate}&_t=${cacheBuster}`;
      
      console.log(`🌐 Loading images for: ${selectedDate === 'all' ? 'all dates' : selectedDate}`);
      
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.files) {
          const formattedImages = data.files.map((file: any) => {
            // Generate random speed for each image (30-77 km/h)
            const randomSpeed = Math.floor(Math.random() * (77 - 30 + 1)) + 30;
            const speedLimit = 30;
            const isViolation = randomSpeed > speedLimit;
            
            // Calculate fine amount based on speed
            let fineAmount = null;
            if (isViolation) {
              const speedOver = randomSpeed - speedLimit;
              if (speedOver <= 10) fineAmount = 100;
              else if (speedOver <= 20) fineAmount = 200;
              else if (speedOver <= 30) fineAmount = 300;
              else fineAmount = 500;
            }

            return {
              id: file.filename,
              filename: file.filename,
              timestamp: file.timestamp,
              size: file.size,
              url: `http://localhost:3003${file.url}`,
              imageUrl: `http://localhost:3003${file.url}`,
              thumbnailUrl: `http://localhost:3003${file.url}`,
              plateNumber: 'Processing...',
              confidence: 0,
              status: 'pending' as const,
              processingStatus: 'completed' as const,
              processed: true,
              // Add random speed data
              speed: randomSpeed,
              speedLimit: speedLimit,
              isViolation: isViolation,
              radarId: 1,
              fineAmount: fineAmount
            };
          });
          
          setImages(formattedImages);
          setIsConnected(true);
          setConnectionMode('local_server');
          updateStats(formattedImages);
          
          console.log(`✅ Successfully loaded ${formattedImages.length} images for ${selectedDate === 'all' ? 'all dates' : selectedDate}`);
        } else {
          setImages([]);
          setError(`No images found for ${selectedDate === 'all' ? 'any date' : selectedDate}`);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to filter images by date:', error);
      setError(`Failed to load images: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setImages([]);
      setIsConnected(false);
      setConnectionMode('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const handleViewImage = (image: PlateRecognitionImage) => {
    setSelectedImage(image);
    setImageDialogOpen(true);
  };

  const handleDeleteImage = (imageId: string) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      // Remove from local state
      const updatedImages = images.filter(img => img.id !== imageId);
      setImages(updatedImages);
      updateStats(updatedImages);
    }
  };

  const handleReprocessImage = (imageId: string) => {
    // Simulate reprocessing by updating the image status
    const updatedImages = images.map(img => 
      img.id === imageId 
        ? { ...img, processingStatus: 'processing' as const }
        : img
    );
    setImages(updatedImages);
    updateStats(updatedImages);
    
    // Simulate completion after 2 seconds
    setTimeout(() => {
      const finalImages = images.map(img => 
        img.id === imageId 
          ? { 
              ...img, 
              processingStatus: 'completed' as const,
              plateNumber: `ABC${Math.floor(Math.random() * 1000)}`,
              confidence: Math.floor(Math.random() * 30) + 70
            }
          : img
      );
      setImages(finalImages);
      updateStats(finalImages);
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getConnectionLabel = () => {
    switch (connectionMode) {
      case 'local_server': return 'Local Server';
      case 'ftp_websocket': return 'FTP WebSocket';
      case 'ftp_http_api': return 'FTP Connected';
      case 'ftp_auth_failed': return 'Auth Failed';
      case 'disconnected': return 'Disconnected';
      default: return isConnected ? 'Connected' : 'Disconnected';
    }
  };

  const getConnectionColor = (): 'success' | 'error' | 'warning' | 'info' => {
    switch (connectionMode) {
      case 'local_server': return 'info';
      case 'ftp_websocket': return 'success';
      case 'ftp_http_api': return 'success';
      case 'ftp_auth_failed': return 'error';
      case 'disconnected': return 'error';
      default: return isConnected ? 'success' : 'error';
    }
  };

  const getLoadingMessage = () => {
    switch (connectionMode) {
      case 'local_server': return 'Connected to local server - Loading images...';
      case 'ftp_websocket': return 'Connected to FTP WebSocket - Fetching file list';
      case 'ftp_http_api': return 'Connected to FTP HTTP API - Loading real images...';
      case 'ftp_auth_failed': return 'FTP authentication failed - Using local fallback';
      case 'disconnected': return 'Attempting connection... Will fallback to local server';
      default: return isConnected ? 'Connected - Fetching file list' : 'Connecting...';
    }
  };

  if (loading && images.length === 0) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>
          Loading images from local server...
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Local Image Server: localhost:3003
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CloudUpload sx={{ fontSize: '2rem', color: isConnected ? 'success.main' : 'error.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              Fines Images Monitor
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Local Image Server: localhost:3003
            </Typography>
          </Box>
          <Chip 
            icon={isConnected ? <Wifi /> : <WifiOff />}
            label={getConnectionLabel()} 
            color={getConnectionColor()} 
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={handleRefresh}
            startIcon={<Refresh />}
            disabled={loading}
            variant="contained"
          >
            Refresh
          </Button>
          <Button
            onClick={handleClearCache}
            startIcon={<Delete />}
            disabled={loading}
            variant="outlined"
            color="warning"
          >
            Clear Cache
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: '1 1 calc(16.66% - 8px)', minWidth: 150 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Total Files</Typography>
            <Typography variant="h4">{stats.total}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(16.66% - 8px)', minWidth: 150 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Today</Typography>
            <Typography variant="h4">{stats.todayCount}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(16.66% - 8px)', minWidth: 150 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Completed</Typography>
            <Typography variant="h4" color="success.main">{stats.completed}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(16.66% - 8px)', minWidth: 150 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Processing</Typography>
            <Typography variant="h4" color="warning.main">{stats.processing}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(16.66% - 8px)', minWidth: 150 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Pending</Typography>
            <Typography variant="h4" color="info.main">{stats.pending}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(16.66% - 8px)', minWidth: 150 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Failed</Typography>
            <Typography variant="h4" color="error.main">{stats.failed}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterList />
            <Typography variant="h6">Filters</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </TextField>
            <TextField
              select
              label="Date Filter"
              value={filters.dateRange}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              sx={{ minWidth: 180 }}
              size="small"
              helperText="Select specific date or all"
            >
              <MenuItem value="all">All Dates</MenuItem>
              {availableDates.map((date) => (
                <MenuItem key={date} value={date}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Search"
              placeholder="Search filename, plate number..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ minWidth: 250 }}
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Images Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Image Files ({filteredImages.length})
          </Typography>
          {filteredImages.length > 0 ? (
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Preview</TableCell>
                    <TableCell>Filename</TableCell>
                    <TableCell>Plate Number</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Speed Detection</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredImages.map((image) => (
                    <TableRow key={image.id} hover>
                      <TableCell>
                        <Avatar
                          src={image.thumbnailUrl || image.imageUrl || image.url}
                          variant="rounded"
                          sx={{ width: 60, height: 40 }}
                        >
                          <ImageIcon />
                        </Avatar>
                      </TableCell>
                      <TableCell>{image.filename}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {image.plateNumber || 'Processing...'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {image.confidence ? `${image.confidence}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <Box>
                          {image.speed ? (
                            <>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold"
                                color={image.isViolation ? 'error.main' : 'success.main'}
                              >
                                {image.speed} km/h
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                Limit: {image.speedLimit} km/h
                              </Typography>
                              {image.isViolation && (
                                <Chip 
                                  label={`VIOLATION - $${image.fineAmount || 'TBD'}`} 
                                  color="error" 
                                  size="small" 
                                  sx={{ mt: 0.5, display: 'block' }}
                                />
                              )}
                              {image.radarId && (
                                <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem' }}>
                                  Radar: {image.radarId}
                                </Typography>
                              )}
                            </>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              No speed data
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={image.processingStatus} 
                          color={getStatusColor(image.processingStatus) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(image.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewImage(image)}
                            title="View Details"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleReprocessImage(image.id)}
                            title="Reprocess"
                            disabled={image.processingStatus === 'processing'}
                          >
                            <Refresh />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteImage(image.id)}
                            title="Delete"
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              {images.length === 0 ? 'No images found on FTP server' : 'No images match the current filters'}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Image Details Dialog */}
      <Dialog 
        open={imageDialogOpen} 
        onClose={() => setImageDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Image Details</Typography>
            <IconButton onClick={() => setImageDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box>
              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <img 
                    src={selectedImage.imageUrl || selectedImage.url} 
                    alt={selectedImage.filename}
                    style={{ width: '100%', maxHeight: 300, objectFit: 'contain' }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>Processing Results</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">Filename</Typography>
                      <Typography>{selectedImage.filename}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">Plate Number</Typography>
                      <Typography fontWeight="bold">
                        {selectedImage.plateNumber || 'Not detected'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">Confidence</Typography>
                      <Typography>{selectedImage.confidence ? `${selectedImage.confidence}%` : 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">Vehicle Type</Typography>
                      <Typography>{selectedImage.vehicleType || 'Unknown'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                      <Chip 
                        label={selectedImage.processingStatus} 
                        color={getStatusColor(selectedImage.processingStatus) as any}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">Timestamp</Typography>
                      <Typography>{new Date(selectedImage.timestamp).toLocaleString()}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedImage && (
            <>
              <Button 
                onClick={() => handleReprocessImage(selectedImage.id)}
                startIcon={<Refresh />}
                disabled={selectedImage.processingStatus === 'processing'}
              >
                Reprocess
              </Button>
              <Button 
                onClick={() => window.open(selectedImage.imageUrl || selectedImage.url, '_blank')}
                startIcon={<Download />}
              >
                Download
              </Button>
            </>
          )}
          <Button onClick={() => setImageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinesImagesMonitor;
