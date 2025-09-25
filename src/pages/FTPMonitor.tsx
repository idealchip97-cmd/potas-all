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
import realTimeDataService from '../services/realTimeDataService';
import { PlateRecognitionImage } from '../services/ftpClient';

interface FilterOptions {
  status: string;
  dateRange: string;
  search: string;
}

const FTPMonitor: React.FC = () => {
  const [images, setImages] = useState<PlateRecognitionImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<PlateRecognitionImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<PlateRecognitionImage | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  
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
    setupRealTimeMonitoring();
    
    return () => {
      // Cleanup subscriptions
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [images, filters]);

  const setupRealTimeMonitoring = () => {
    setLoading(true);

    // Subscribe to connection status
    const unsubscribeConnection = realTimeDataService.onConnectionChange((status) => {
      setIsConnected(status.ftp);
      if (!status.ftp) {
        setError('FTP connection lost. Monitoring disabled.');
      } else {
        setError(null);
      }
    });

    // Subscribe to image updates
    const unsubscribeImages = realTimeDataService.onImageUpdate((updatedImages) => {
      setImages(updatedImages);
      calculateStats(updatedImages);
      setLoading(false);
    });

    // Subscribe to new image notifications
    const unsubscribeNewImages = realTimeDataService.onNewImage((image) => {
      console.log('New image received:', image.filename);
    });

    // Subscribe to errors
    const unsubscribeErrors = realTimeDataService.onError((error, source) => {
      if (source === 'ftp') {
        setError(`FTP Error: ${error}`);
        setLoading(false);
      }
    });

    // Request initial data
    realTimeDataService.requestImageList();

    // Return cleanup function (not used here but good practice)
    return () => {
      unsubscribeConnection();
      unsubscribeImages();
      unsubscribeNewImages();
      unsubscribeErrors();
    };
  };

  const calculateStats = (imageList: PlateRecognitionImage[]) => {
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

    // Date range filter
    if (filters.dateRange !== 'all') {
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
    setLoading(true);
    realTimeDataService.requestImageList();
  };

  const handleViewImage = (image: PlateRecognitionImage) => {
    setSelectedImage(image);
    setImageDialogOpen(true);
  };

  const handleDeleteImage = (imageId: string) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      realTimeDataService.deleteImage(imageId);
    }
  };

  const handleReprocessImage = (imageId: string) => {
    realTimeDataService.reprocessImage(imageId);
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

  if (loading && images.length === 0) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>
          {isConnected ? 'Loading FTP data...' : 'Connecting to FTP server...'}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Server: 192.168.1.14:21 (WebSocket Proxy: 18081)
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
          {isConnected ? 'Connected - Fetching file list' : 'Attempting connection... Will fallback to demo data if unavailable'}
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
              FTP Server Monitor
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Server: 192.168.1.14:21
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
              label="Date Range"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
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
                    <TableCell>Vehicle Type</TableCell>
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
                          src={image.thumbnailUrl || image.imageUrl}
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
                      <TableCell>{image.vehicleType || '-'}</TableCell>
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
                    src={selectedImage.imageUrl} 
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
                onClick={() => window.open(selectedImage.imageUrl, '_blank')}
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

export default FTPMonitor;
