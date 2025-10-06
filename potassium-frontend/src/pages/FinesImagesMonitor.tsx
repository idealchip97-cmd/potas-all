import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputProps,
  Pagination,
  Autocomplete
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
  const [availableCameras, setAvailableCameras] = useState<string[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('all'); // Default to all cameras
  const [availableCases, setAvailableCases] = useState<string[]>([]);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Filter states
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: getTodayDate(), // Default to today's date
    search: '',
    caseFilter: ''
  });

  // Statistics for violation cases (dynamic for any number of cameras)
  const [stats, setStats] = useState<{[key: string]: number}>({
    total: 0,
    violations: 0,
    noViolations: 0,
    todayCount: 0
  });

  // Load available cameras dynamically
  const loadAvailableCameras = async () => {
    try {
      console.log('🔍 Loading available cameras...');
      const response = await fetch('http://localhost:3003/api/discover/cameras');
      const data = await response.json();
      
      if (data.success && data.cameras) {
        setAvailableCameras(data.cameras);
        setIsConnected(true);
        setConnectionMode('local_server');
        console.log(`✅ Loaded ${data.cameras.length} cameras:`, data.cameras);
      } else {
        console.warn('⚠️ Failed to load cameras, using fallback');
        setAvailableCameras(['camera001', 'camera002']); // Fallback
        setIsConnected(false);
        setConnectionMode('disconnected');
      }
    } catch (error: any) {
      console.error('❌ Failed to load available cameras:', error);
      setAvailableCameras(['camera001', 'camera002']); // Fallback
      setIsConnected(false);
      setConnectionMode('disconnected');
    }
  };

  // Load available dates dynamically
  const loadAvailableDates = async () => {
    try {
      console.log('🔍 Loading available dates...');
      const response = await fetch('http://localhost:3003/api/discover/dates');
      const data = await response.json();
      
      if (data.success && data.dates) {
        setAvailableDates(data.dates);
        setIsConnected(true);
        setConnectionMode('local_server');
        console.log(`✅ Loaded ${data.dates.length} dates:`, data.dates);
      } else {
        console.warn('⚠️ Failed to load dates, using fallback');
        setAvailableDates([getTodayDate()]); // Fallback to today
        setIsConnected(false);
        setConnectionMode('disconnected');
      }
    } catch (error: any) {
      console.error('❌ Failed to load available dates:', error);
      setAvailableDates([getTodayDate()]); // Fallback to today
      setIsConnected(false);
      setConnectionMode('disconnected');
    }
  };

  // Load available case IDs for current camera and date selection
  const loadAvailableCases = async (cameraId?: string, date?: string) => {
    try {
      if (!cameraId || cameraId === 'all' || !date || date === 'all') {
        // For 'all' selections, we'll load cases from multiple sources
        const allCases = new Set<string>();
        
        const camerasToCheck = cameraId === 'all' ? availableCameras : [cameraId];
        const datesToCheck = date === 'all' ? availableDates.slice(0, 3) : [date]; // Limit to recent dates
        
        for (const camera of camerasToCheck) {
          for (const checkDate of datesToCheck) {
            try {
              const response = await fetch(`http://localhost:3003/api/discover/cases/${camera}/${checkDate}`);
              const data = await response.json();
              
              if (data.success && data.cases) {
                data.cases.forEach((caseId: string) => allCases.add(caseId));
              }
            } catch (err) {
              console.warn(`⚠️ Could not load cases for ${camera}/${checkDate}`);
            }
          }
        }
        
        const sortedCases = Array.from(allCases).sort();
        setAvailableCases(sortedCases);
        console.log(`✅ Loaded ${sortedCases.length} unique case IDs`);
      } else {
        // Load cases for specific camera and date
        const response = await fetch(`http://localhost:3003/api/discover/cases/${cameraId}/${date}`);
        const data = await response.json();
        
        if (data.success && data.cases) {
          setAvailableCases(data.cases);
          console.log(`✅ Loaded ${data.cases.length} cases for ${cameraId}/${date}`);
        } else {
          setAvailableCases([]);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to load available cases:', error);
      setAvailableCases([]);
    }
  };
  const loadViolationCases = async (selectedDate?: string, cameraId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let allCases: ViolationCase[] = [];
      
      // Determine which dates to load
      let datesToLoad: string[] = [];
      if (selectedDate === 'all' || !selectedDate) {
        // Load from all available dates (last 7 days)
        datesToLoad = availableDates.length > 0 ? availableDates : [getTodayDate()];
        console.log(`🔍 Loading violation cases for all dates: ${datesToLoad.join(', ')}`);
      } else {
        // Load specific date
        datesToLoad = [selectedDate];
        console.log(`🔍 Loading violation cases for date: ${selectedDate}`);
      }
      
      // Determine which cameras to load based on selection
      let camerasToLoad: string[];
      if (cameraId && cameraId !== 'all') {
        // Load ONLY the selected camera - STRICT filtering
        camerasToLoad = [cameraId];
        console.log(`📡 ⚠️ STRICT FILTER: Loading data from ${cameraId} ONLY`);
      } else {
        // Load from all available cameras
        camerasToLoad = availableCameras.length > 0 ? availableCameras : ['camera001', 'camera002'];
        console.log(`📡 Loading data from ALL cameras: ${camerasToLoad.join(', ')}`);
      }
      
      // Load violations from all combinations of dates and cameras
      for (const date of datesToLoad) {
        for (const camera of camerasToLoad) {
          try {
            const apiUrl = `http://localhost:3003/api/violations/${camera}/${date}`;
            console.log(`🔍 API CALL: ${apiUrl}`);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`📊 API RESPONSE for ${camera}/${date}:`, {
                success: data.success,
                violationCount: data.violations?.length || 0,
                cameraIds: data.violations?.map((v: any) => v.verdict?.camera_id) || []
              });
              
              if (data.success && data.violations) {
                const cameraViolations = data.violations.map((violation: any) => ({
                  eventId: `${violation.eventId}_${camera}`, // Make eventId unique with camera
                  cameraId: camera, // ENSURE camera ID matches the requested camera
                  date: date,
                  verdict: violation.verdict,
                  photos: violation.photos,
                  folderPath: violation.folderPath
                }));
                
                // VERIFY: Only add violations that match the requested camera
                const verifiedViolations = cameraViolations.filter((v: any) => v.cameraId === camera);
                console.log(`✅ VERIFICATION for ${camera}:`);
                console.log(`   - Total violations received: ${cameraViolations.length}`);
                console.log(`   - Verified violations: ${verifiedViolations.length}`);
                console.log(`   - Camera IDs in data:`, cameraViolations.map((v: any) => v.cameraId));
                console.log(`   - Expected camera: ${camera}`);
                
                allCases = [...allCases, ...verifiedViolations];
                setIsConnected(true);
                setConnectionMode('violation_system');
                console.log(`✅ Loaded ${cameraViolations.length} cases from ${camera} for ${date}`);
              }
            } else {
              console.warn(`⚠️ Failed to fetch violations from ${camera} for ${date}: ${response.status}`);
              setIsConnected(false);
              setConnectionMode('disconnected');
            }
          } catch (error: any) {
            console.error(`❌ Error fetching violations from ${camera} for ${date}:`, error.message);
          }
        }
      }
      
      // Sort by date (newest first), then by timestamp within each date
      allCases.sort((a, b) => {
        // First sort by date (newest first)
        const dateComparison = b.date.localeCompare(a.date);
        if (dateComparison !== 0) return dateComparison;
        
        // Then sort by timestamp within the same date (newest first)
        return b.verdict.event_ts - a.verdict.event_ts;
      });
      
      // FINAL VERIFICATION: Ensure only correct camera data is included
      if (cameraId && cameraId !== 'all') {
        console.log(`🔍 FINAL VERIFICATION for ${cameraId}:`);
        console.log(`   - Total cases before filter: ${allCases.length}`);
        console.log(`   - Camera IDs in all cases:`, allCases.map((c: any) => c.cameraId));
        
        const filteredCases = allCases.filter((c: any) => c.cameraId === cameraId);
        console.log(`   - Cases after filter: ${filteredCases.length}`);
        console.log(`   - Filtered case IDs:`, filteredCases.map((c: any) => `${c.eventId} (${c.cameraId})`));
        
        setViolationCases(filteredCases);
        updateViolationStats(filteredCases);
        console.log(`📊 FINAL RESULT for ${cameraId}: ${filteredCases.length} cases`);
      } else {
        setViolationCases(allCases);
        updateViolationStats(allCases);
        console.log(`📊 Total violation cases loaded from ALL cameras: ${allCases.length}`);
      }
      
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

  // Test connection to server
  const testConnection = async () => {
    try {
      console.log('🔍 Testing connection to local image server...');
      const response = await fetch('http://localhost:3003/health');
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        setConnectionMode('local_server');
        console.log('✅ Connected to local image server');
        return true;
      } else {
        setIsConnected(false);
        setConnectionMode('disconnected');
        console.warn('⚠️ Local image server health check failed');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Failed to connect to local image server:', error);
      setIsConnected(false);
      setConnectionMode('disconnected');
      return false;
    }
  };

  // Initialize data loading
  useEffect(() => {
    // Test connection first, then load data
    const initializeData = async () => {
      const connected = await testConnection();
      if (connected) {
        await loadAvailableCameras();
        await loadAvailableDates();
        await loadViolationCases(getTodayDate(), undefined); // Load from all cameras for today's date
      }
    };
    
    initializeData();
    
    // Set up auto-refresh every 30 seconds
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh: Loading violation cases');
      console.log(`📡 Auto-refresh with camera: ${selectedCamera}`);
      testConnection(); // Test connection on each refresh
      // Respect current camera and date selection during auto-refresh
      const cameraParam = selectedCamera === 'all' ? undefined : selectedCamera;
      loadViolationCases(filters.dateRange, cameraParam);
      loadAvailableDates(); // Also refresh available dates
    }, 30000);
    
    return () => {
      clearInterval(autoRefreshInterval);
    };
  }, []);

  // Load cases when camera or date selection changes
  useEffect(() => {
    if (availableCameras.length > 0 && availableDates.length > 0) {
      loadAvailableCases(selectedCamera, filters.dateRange);
    }
  }, [selectedCamera, filters.dateRange, availableCameras, availableDates]);

  useEffect(() => {
    applyFilters();
  }, [violationCases, filters]);

  // Stats calculation for violation cases (dynamic for any number of cameras)
  const updateViolationStats = (cases: ViolationCase[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCases = cases.filter(c => 
      new Date(c.verdict.event_ts * 1000) >= today
    );

    // Calculate stats for each available camera dynamically
    const newStats: {[key: string]: number} = {
      total: cases.length,
      violations: cases.filter(c => c.verdict.decision === 'violation').length,
      noViolations: cases.filter(c => c.verdict.decision === 'no_violation').length,
      todayCount: todayCases.length
    };

    // Add stats for each camera
    availableCameras.forEach(camera => {
      newStats[camera] = cases.filter(c => c.cameraId === camera).length;
    });

    setStats(newStats);
  };


  const applyFilters = () => {
    let filtered = [...violationCases];

    // Status filter (violation/no_violation)
    if (filters.status !== 'all') {
      filtered = filtered.filter(c => c.verdict.decision === filters.status);
    }

    // Camera filter is now handled by the main camera selection
    // No additional filtering needed here since data is loaded per camera selection

    // Car Case ID filter (matches case ID part before underscore)
    if (filters.caseFilter && filters.caseFilter.trim() !== '') {
      filtered = filtered.filter(c => {
        const caseIdPart = c.eventId.split('_')[0]; // Get case ID part (before camera)
        return caseIdPart.toLowerCase().includes(filters.caseFilter.toLowerCase());
      });
    }

    // Search All filter (searches across multiple fields)
    if (filters.search && filters.search.trim() !== '') {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c => {
        const caseIdPart = c.eventId.split('_')[0]; // Get case ID part for search
        return caseIdPart.toLowerCase().includes(searchLower) ||
               c.verdict.src_ip.includes(searchLower) ||
               c.cameraId.toLowerCase().includes(searchLower) ||
               c.verdict.speed.toString().includes(searchLower);
      });
    }

    setFilteredCases(filtered);
    setPage(1); // Reset to first page when filters change
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    console.log(`📡 Manual refresh with camera: ${selectedCamera}, date: ${filters.dateRange}`);
    setLoading(true);
    
    // Force fresh data load from violation system
    loadAvailableCameras();
    loadAvailableDates();
    // Respect current camera and date selection during manual refresh
    const cameraParam = selectedCamera === 'all' ? undefined : selectedCamera;
    loadViolationCases(filters.dateRange, cameraParam);
    loadAvailableCases(selectedCamera, filters.dateRange);
    setViolationCases([]); // Clear violation cases cache
  };

  const handleClearCache = () => {
    setViolationCases([]);
    setFilteredCases([]);
    setAvailableCameras([]);
    setAvailableDates([]);
    setAvailableCases([]);
    const emptyStats: {[key: string]: number} = {
      total: 0,
      violations: 0,
      noViolations: 0,
      todayCount: 0
    };
    // Add empty stats for each camera
    availableCameras.forEach(camera => {
      emptyStats[camera] = 0;
    });
    setStats(emptyStats);
    // Reload fresh data
    setTimeout(() => {
      loadAvailableCameras();
      loadAvailableDates();
      // Respect current camera and date selection after cache clear
      const cameraParam = selectedCamera === 'all' ? undefined : selectedCamera;
      loadViolationCases(filters.dateRange, cameraParam);
    }, 500);
  };

  const handleDateFilterChange = async (selectedDate: string) => {
    console.log(`🔍 Date filter changed to: ${selectedDate}`);
    console.log(`📡 Current camera selection: ${selectedCamera}`);
    setFilters(prev => ({ ...prev, dateRange: selectedDate }));
    
    // IMPORTANT: Pass the current camera selection to respect camera filter
    const cameraParam = selectedCamera === 'all' ? undefined : selectedCamera;
    
    if (selectedDate === 'all') {
      // Load all available dates but respect camera selection
      console.log(`📡 Loading ALL dates for camera: ${selectedCamera}`);
      loadViolationCases('all', cameraParam);
    } else {
      // Load specific date but respect camera selection
      console.log(`📡 Loading date ${selectedDate} for camera: ${selectedCamera}`);
      loadViolationCases(selectedDate, cameraParam);
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
    console.log(`📡 Reprocess with camera: ${selectedCamera}, date: ${filters.dateRange}`);
    // For now, just refresh the data while respecting current filters
    const cameraParam = selectedCamera === 'all' ? undefined : selectedCamera;
    loadViolationCases(filters.dateRange, cameraParam);
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
              Violation Cases Monitor - Multi-Photo System
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {selectedCamera === 'all' ? 'ALL CAMERAS' : selectedCamera.toUpperCase()} - Each Case = One Car
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

      {/* Camera Breakdown (when All Cameras is selected) */}
      {selectedCamera === 'all' && stats.total > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 Camera Breakdown
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {availableCameras.map((camera, index) => {
                const cameraStats = (stats as any)[camera] || 0;
                const chipColor = index === 0 ? 'primary' : index === 1 ? 'secondary' : 'default';
                
                return (
                  <Box key={camera} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={camera.toUpperCase()} 
                      color={chipColor as any} 
                      size="small" 
                    />
                    <Typography variant="body2">{cameraStats} cases</Typography>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}

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
              onChange={async (e) => {
                const newCamera = e.target.value;
                console.log(`🎯 Camera selection changed to: ${newCamera}`);
                
                // FORCE clear all data immediately
                setSelectedCamera(newCamera);
                setViolationCases([]);
                setFilteredCases([]);
                setLoading(true);
                
                // Clear stats to prevent showing old camera data
                const emptyStats: {[key: string]: number} = {
                  total: 0,
                  violations: 0,
                  noViolations: 0,
                  todayCount: 0
                };
                availableCameras.forEach(camera => {
                  emptyStats[camera] = 0;
                });
                setStats(emptyStats);
                
                // Add small delay to ensure UI updates
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (newCamera === 'all') {
                  console.log('📡 Loading data from ALL cameras');
                  await loadViolationCases(filters.dateRange, undefined);
                } else {
                  console.log(`📡 Loading data from ${newCamera} ONLY - clearing other camera data`);
                  await loadViolationCases(filters.dateRange, newCamera);
                }
              }}
              sx={{ minWidth: 150 }}
              size="small"
              helperText="Load data from camera(s)"
            >
              <MenuItem value="all">All Cameras</MenuItem>
              {availableCameras.map((camera) => (
                <MenuItem key={camera} value={camera}>
                  {camera.replace('camera', 'Camera ').replace(/^Camera 0*/, 'Camera ')}
                </MenuItem>
              ))}
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
              label="Search All"
              placeholder="Search by case ID, IP address..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ minWidth: 250 }}
              size="small"
              helperText="Search in all fields"
            />
            <Autocomplete
              options={availableCases}
              value={filters.caseFilter}
              onChange={(event, newValue) => {
                setFilters({ ...filters, caseFilter: newValue || '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Car Case ID"
                  placeholder={availableCases.length > 0 ? "Select from list or type..." : "Loading cases..."}
                  size="small"
                  helperText={`${availableCases.length} cases available`}
                />
              )}
              freeSolo
              filterOptions={(options, { inputValue }) => {
                // Show all options that contain the input value
                return options.filter(option => 
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
              }}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {option}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
              sx={{ minWidth: 200 }}
              loading={availableCases.length === 0}
              loadingText="Loading case IDs..."
            />
          </Box>
        </CardContent>
      </Card>

      {/* Violation Cases Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Car Violation Cases - {selectedCamera === 'all' ? 'ALL CAMERAS' : selectedCamera.toUpperCase()} ({filteredCases.length})
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Page {page} of {Math.ceil(filteredCases.length / rowsPerPage)} • {rowsPerPage} per page
            </Typography>
          </Box>
          {filteredCases.length > 0 ? (
            <>
              <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Case ID (Car)</TableCell>
                      <TableCell>Date/Camera</TableCell>
                      <TableCell>Speed Detection</TableCell>
                      <TableCell>Decision</TableCell>
                      <TableCell>Photos</TableCell>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCases
                      .slice((page - 1) * rowsPerPage, page * rowsPerPage)
                      .map((violationCase) => (
                      <TableRow key={`${violationCase.cameraId}-${violationCase.date}-${violationCase.eventId}`} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {violationCase.eventId.split('_')[0]} {/* Show only case ID part */}
                        </Typography>
                        <Typography variant="caption" color="primary" fontWeight="bold">
                          {violationCase.cameraId.toUpperCase()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {violationCase.verdict.src_ip}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {new Date(violationCase.date + 'T00:00:00').toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Typography>
                        <Chip
                          label={violationCase.cameraId.toUpperCase()}
                          size="small"
                          color={
                            violationCase.cameraId === 'camera001' ? 'primary' :
                            violationCase.cameraId === 'camera002' ? 'secondary' : 'default'
                          }
                          variant={selectedCamera === 'all' ? 'filled' : 'outlined'}
                        />
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
                              key={`${violationCase.cameraId}-${violationCase.date}-${violationCase.eventId}-photo-${index}`}
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
                          {violationCase.photos.filter(p => p.exists).length}/{violationCase.photos.length} available
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
              
              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(filteredCases.length / rowsPerPage)}
                  page={page}
                  onChange={(event, newPage) => setPage(newPage)}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
              
              {/* Pagination Info */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Showing {((page - 1) * rowsPerPage) + 1}-{Math.min(page * rowsPerPage, filteredCases.length)} of {filteredCases.length} cases
                </Typography>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              {violationCases.length === 0 ? `No violation cases found in ${selectedCamera === 'all' ? 'ALL CAMERAS' : selectedCamera.toUpperCase()}` : 'No cases match the current filters'}
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
              <Typography variant="h6" gutterBottom>
                Photos ({selectedCase.photos.filter(p => p.exists).length} Photos Per Car)
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${Math.min(selectedCase.photos.length, 4)}, 1fr)`, 
                gap: 2 
              }}>
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
