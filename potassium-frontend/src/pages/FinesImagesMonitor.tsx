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

// New interface for violation cases (3-photo system)
interface ViolationCase {
  eventId: string;
  cameraId: string;
  date: string;
  verdict: {
    event_id: string;
    camera_id: string;
    src_ip: string;
    event_ts: number;
    arrival_ts: number;
    decision: 'violation' | 'no_violation';
    speed: number;
    limit: number | null;
    payload: any;
  };
  photos: {
    filename: string;
    size: number;
    exists: boolean;
    url: string | null;
  }[];
  folderPath: string;
}

interface FilterOptions {
  status: string;
  dateRange: string;
  search: string;
  cameraFilter: string;
  caseFilter: string;
}

const FinesImagesMonitor: React.FC = () => {
  // New state for violation cases
  const [violationCases, setViolationCases] = useState<ViolationCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<ViolationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<ViolationCase | null>(null);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableCameras] = useState<string[]>(['camera001', 'camera002', 'camera003']);
  const [selectedCamera, setSelectedCamera] = useState<string>('camera002'); // Default to camera002
  
  // Filter states
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: '2025-10-05', // Default to date with data
    search: '',
    cameraFilter: 'all',
    caseFilter: ''
  });

  // Statistics for violation cases
  const [stats, setStats] = useState({
    total: 0,
    violations: 0,
    noViolations: 0,
    camera001: 0,
    camera002: 0,
    camera003: 0,
    todayCount: 0
  });

  // Move useEffect after function definitions

  const loadAvailableDates = async () => {
    try {
      // Set unique dates for the violation system
      const availableDatesList = ['2025-10-05', '2025-10-04', '2025-10-03', '2025-10-02'];
      
      // Remove duplicates and sort
      const uniqueDates = Array.from(new Set(availableDatesList)).sort().reverse();
      
      setAvailableDates(uniqueDates);
      console.log('📅 Set available dates for violation system:', uniqueDates);
      
    } catch (error: any) {
      console.error('❌ Failed to load available dates:', error);
      setAvailableDates(['2025-10-05']);
    }
  };

  const loadViolationCases = async (selectedDate?: string, cameraId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const date = selectedDate || '2025-10-05'; // Use known date with data
      console.log(`🔍 Loading violation cases for date: ${date}`);
      
      let allCases: ViolationCase[] = [];
      
      // Load violations for selected camera
      const camera = cameraId || selectedCamera;
      try {
        const response = await fetch(`http://localhost:3003/api/violations/${camera}/${date}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.violations) {
            const formattedCases = data.violations.map((violation: any) => ({
              eventId: violation.eventId,
              cameraId: camera,
              date: date,
              verdict: violation.verdict,
              photos: violation.photos,
              folderPath: violation.folderPath
            }));
            
            allCases = formattedCases;
            console.log(`📷 Loaded ${formattedCases.length} cases from ${camera}`);
          }
        } else {
          console.warn(`⚠️ No violations found for ${camera} on ${date}`);
        }
      } catch (cameraError) {
        console.warn(`⚠️ Failed to load violations for ${camera}:`, cameraError);
      }
      
      // Sort by event timestamp (newest first)
      allCases.sort((a, b) => b.verdict.event_ts - a.verdict.event_ts);
      
      setViolationCases(allCases);
      setIsConnected(true);
      setConnectionMode('violation_system');
      updateViolationStats(allCases);
      
      console.log(`✅ Loaded ${allCases.length} total violation cases`);
      
    } catch (error: any) {
      console.error('❌ Failed to load violation cases:', error);
      setError(`Failed to load violation cases: ${error.message}`);
      setIsConnected(false);
      setConnectionMode('disconnected');
      setViolationCases([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize data loading
  useEffect(() => {
    // Load available dates and violation cases
    loadAvailableDates();
    loadViolationCases('2025-10-05', 'camera002'); // Load with specific date and camera
    
    // Set up auto-refresh every 30 seconds
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh: Loading violation cases');
      loadViolationCases();
    }, 30000);
    
    return () => {
      clearInterval(autoRefreshInterval);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [violationCases, filters]);

  // Stats calculation for violation cases
  const updateViolationStats = (cases: ViolationCase[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCases = cases.filter(c => 
      new Date(c.verdict.event_ts * 1000) >= today
    );

    const cameraStats = {
      camera001: cases.filter(c => c.cameraId === 'camera001').length,
      camera002: cases.filter(c => c.cameraId === 'camera002').length,
      camera003: cases.filter(c => c.cameraId === 'camera003').length
    };

    setStats({
      total: cases.length,
      violations: cases.filter(c => c.verdict.decision === 'violation').length,
      noViolations: cases.filter(c => c.verdict.decision === 'no_violation').length,
      camera001: cameraStats.camera001,
      camera002: cameraStats.camera002,
      camera003: cameraStats.camera003,
      todayCount: todayCases.length
    });
  };


  const applyFilters = () => {
    let filtered = [...violationCases];

    // Status filter (violation/no_violation)
    if (filters.status !== 'all') {
      filtered = filtered.filter(c => c.verdict.decision === filters.status);
    }

    // Case filter (by event ID)
    if (filters.caseFilter && filters.caseFilter.trim() !== '') {
      filtered = filtered.filter(c => c.eventId.toLowerCase().includes(filters.caseFilter.toLowerCase()));
    }

    // Search filter
    if (filters.search && filters.search.trim() !== '') {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.eventId.toLowerCase().includes(searchLower) ||
        c.verdict.src_ip.includes(searchLower)
      );
    }

    setFilteredCases(filtered);
  };

  const handleRefresh = () => {
    setError(null);
    // Force fresh data load from violation system
    loadViolationCases();
    loadAvailableDates();
  };

  const handleClearCache = () => {
    setViolationCases([]);
    setFilteredCases([]);
    setStats({
      total: 0,
      violations: 0,
      noViolations: 0,
      camera001: 0,
      camera002: 0,
      camera003: 0,
      todayCount: 0
    });
    // Reload fresh data
    setTimeout(() => {
      loadViolationCases();
      loadAvailableDates();
    }, 500);
  };

  const handleDateFilterChange = async (selectedDate: string) => {
    console.log(`🔍 Date filter changed to: ${selectedDate}`);
    setFilters(prev => ({ ...prev, dateRange: selectedDate }));
    
    if (selectedDate === 'all') {
      // Load all available dates - for now just load today
      loadViolationCases();
    } else {
      // Load specific date
      loadViolationCases(selectedDate);
    }
  };

  const handleViewCase = (violationCase: ViolationCase) => {
    setSelectedCase(violationCase);
    setCaseDialogOpen(true);
  };

  const handleDeleteCase = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this violation case?')) {
      // Remove from local state
      const updatedCases = violationCases.filter(c => c.eventId !== eventId);
      setViolationCases(updatedCases);
      updateViolationStats(updatedCases);
    }
  };

  const handleReprocessCase = (eventId: string) => {
    // In a real system, this would trigger reprocessing on the server
    console.log(`🔄 Reprocessing case: ${eventId}`);
    // For now, just refresh the data
    loadViolationCases();
  };

  const getStatusColor = (decision: string) => {
    switch (decision) {
      case 'violation': return 'error';
      case 'no_violation': return 'success';
      default: return 'default';
    }
  };

  const getConnectionLabel = () => {
    switch (connectionMode) {
      case 'violation_system': return 'Violation System';
      case 'local_server': return 'Local Server';
      case 'disconnected': return 'Disconnected';
      default: return isConnected ? 'Connected' : 'Disconnected';
    }
  };

  const getConnectionColor = (): 'success' | 'error' | 'warning' | 'info' => {
    switch (connectionMode) {
      case 'violation_system': return 'success';
      case 'local_server': return 'info';
      case 'disconnected': return 'error';
      default: return isConnected ? 'success' : 'error';
    }
  };

  const getLoadingMessage = () => {
    switch (connectionMode) {
      case 'violation_system': return 'Connected to violation system - Loading cases...';
      case 'local_server': return 'Connected to local server - Loading images...';
      case 'disconnected': return 'Attempting connection... Will fallback to local server';
      default: return isConnected ? 'Connected - Loading violation cases' : 'Connecting...';
    }
  };

  if (loading && violationCases.length === 0) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>
          Loading violation cases...
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Violation System: localhost:3003
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
              Violation Cases Monitor - 3 Photos Per Car
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {selectedCamera.toUpperCase()} - Each Case = One Car
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
        <Card sx={{ flex: '1 1 calc(25% - 8px)', minWidth: 150 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Total Cars</Typography>
            <Typography variant="h4">{stats.total}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(25% - 8px)', minWidth: 150 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Today</Typography>
            <Typography variant="h4">{stats.todayCount}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(25% - 8px)', minWidth: 150 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Violations</Typography>
            <Typography variant="h4" color="error.main">{stats.violations}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(25% - 8px)', minWidth: 150 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">No Violations</Typography>
            <Typography variant="h4" color="success.main">{stats.noViolations}</Typography>
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
              label="Camera"
              value={selectedCamera}
              onChange={(e) => {
                const newCamera = e.target.value;
                setSelectedCamera(newCamera);
                // Clear current data and reload for new camera
                setViolationCases([]);
                setFilteredCases([]);
                loadViolationCases(undefined, newCamera);
              }}
              sx={{ minWidth: 150 }}
              size="small"
              helperText="Select camera"
            >
              <MenuItem value="camera001">Camera 001</MenuItem>
              <MenuItem value="camera002">Camera 002</MenuItem>
              <MenuItem value="camera003">Camera 003</MenuItem>
            </TextField>
            <TextField
              select
              label="Decision Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="all">All Cases</MenuItem>
              <MenuItem value="violation">Violation</MenuItem>
              <MenuItem value="no_violation">No Violation</MenuItem>
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
              placeholder="Search by case ID, IP address..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ minWidth: 250 }}
              size="small"
            />
            <TextField
              label="Car Filter"
              placeholder="e.g. case001, case002..."
              value={filters.caseFilter}
              onChange={(e) => setFilters({ ...filters, caseFilter: e.target.value })}
              sx={{ minWidth: 200 }}
              size="small"
              helperText="Type car case ID to filter"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Violation Cases Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Car Violation Cases - {selectedCamera.toUpperCase()} ({filteredCases.length})
          </Typography>
          {filteredCases.length > 0 ? (
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Case ID (Car)</TableCell>
                    <TableCell>Speed Detection</TableCell>
                    <TableCell>Decision</TableCell>
                    <TableCell>Photos (3)</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCases.map((violationCase) => (
                    <TableRow key={violationCase.eventId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {violationCase.eventId}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {violationCase.verdict.src_ip}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={violationCase.verdict.decision === 'violation' ? 'error.main' : 'success.main'}
                        >
                          {violationCase.verdict.speed} km/h
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Limit: {violationCase.verdict.limit || 30} km/h
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={violationCase.verdict.decision === 'violation' ? 'VIOLATION' : 'NO VIOLATION'} 
                          color={getStatusColor(violationCase.verdict.decision) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {violationCase.photos.map((photo, index) => (
                            <Avatar
                              key={`${violationCase.eventId}-photo-${index}`}
                              src={photo.exists ? `http://localhost:3003${photo.url}` : undefined}
                              variant="rounded"
                              sx={{ 
                                width: 30, 
                                height: 20, 
                                bgcolor: photo.exists ? 'success.light' : 'error.light'
                              }}
                            >
                              {photo.exists ? (index + 1) : '✗'}
                            </Avatar>
                          ))}
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          {violationCase.photos.filter(p => p.exists).length}/3 available
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(violationCase.verdict.event_ts * 1000).toLocaleString('ar-SA')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewCase(violationCase)}
                            title="View Details"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleReprocessCase(violationCase.eventId)}
                            title="Reprocess"
                          >
                            <Refresh />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteCase(violationCase.eventId)}
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
              {violationCases.length === 0 ? `No violation cases found in ${selectedCamera.toUpperCase()}` : 'No cases match the current filters'}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Case Details Dialog */}
      <Dialog 
        open={caseDialogOpen} 
        onClose={() => setCaseDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Car Violation Case Details</Typography>
            <IconButton onClick={() => setCaseDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCase && (
            <Box>
              {/* Case Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Case Information</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Event ID</Typography>
                    <Typography fontWeight="bold">{selectedCase.eventId}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Camera</Typography>
                    <Typography fontWeight="bold">{selectedCase.cameraId}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Detected Speed</Typography>
                    <Typography fontWeight="bold" color={selectedCase.verdict.decision === 'violation' ? 'error.main' : 'success.main'}>
                      {selectedCase.verdict.speed} km/h
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Decision</Typography>
                    <Chip 
                      label={selectedCase.verdict.decision === 'violation' ? 'VIOLATION' : 'NO VIOLATION'}
                      color={getStatusColor(selectedCase.verdict.decision) as any}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Source IP Address</Typography>
                    <Typography>{selectedCase.verdict.src_ip}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Event Time</Typography>
                    <Typography>{new Date(selectedCase.verdict.event_ts * 1000).toLocaleString('ar-SA')}</Typography>
                  </Box>
                </Box>
              </Box>
              
              {/* Photos */}
              <Typography variant="h6" gutterBottom>Photos (3 Photos Per Car)</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                {selectedCase.photos.map((photo, index) => (
                  <Box key={`${selectedCase.eventId}-dialog-photo-${index}`} sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Photo {index + 1}
                    </Typography>
                    {photo.exists ? (
                      <img 
                        src={`http://localhost:3003${photo.url}`}
                        alt={photo.filename}
                        style={{ 
                          width: '100%', 
                          height: 200, 
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '2px solid #e0e0e0'
                        }}
                      />
                    ) : (
                      <Box 
                        sx={{ 
                          width: '100%', 
                          height: 200, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: 'grey.200',
                          borderRadius: 2,
                          border: '2px dashed #ccc'
                        }}
                      >
                        <Typography color="textSecondary">Photo not available</Typography>
                      </Box>
                    )}
                    <Typography variant="caption" color="textSecondary">
                      {photo.filename} ({photo.size} bytes)
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCaseDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinesImagesMonitor;
