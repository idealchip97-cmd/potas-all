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

// Enhanced interface for violation cases with AI processing
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
  } | null;
  photos: {
    filename: string;
    size: number;
    exists: boolean;
    url: string | null;
  }[];
  folderPath: string;
  // AI Processing Results
  hasAI: boolean;
  processed: boolean;
  imageCount: number;
  platesDetected: number;
  processingMethod: string | null;
  aiResults?: {
    totalImages: number;
    platesDetected: number;
    successfulDetections: number;
    failedDetections: number;
    noPlatesDetected: number;
    results: any[];
  };
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
  
  // Get default date with AI processing data
  const getDefaultDate = () => {
    // Use 2025-10-06 as default since that's where our AI processed data is
    return '2025-10-06';
  };

  // Filter states
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: getDefaultDate(), // Default to date with AI data
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

  /**
   * DYNAMIC CAMERA DETECTION SYSTEM
   * 
   * This function automatically discovers all available cameras by scanning the filesystem.
   * Cameras are detected from /srv/processing_inbox by looking for directories that start with "camera".
   * 
   * How it works:
   * 1. Makes API call to /api/cameras endpoint
   * 2. Server scans /srv/processing_inbox for camera* directories
   * 3. Returns list of discovered cameras (e.g., camera001, camera002, camera003, etc.)
   * 4. Frontend updates camera dropdown dynamically
   * 5. Falls back to default cameras if API fails
   * 
   * Adding new cameras:
   * - Simply create new directory: /srv/processing_inbox/camera003/
   * - System will auto-detect on next refresh
   * - No configuration changes needed
   */
  const loadAvailableCameras = async () => {
    try {
      console.log('🔍 Loading available cameras from AI FTP server...');
      console.log('📁 Scanning /srv/processing_inbox for camera directories...');
      
      // API call to dynamically discover cameras from filesystem
      const response = await fetch('http://localhost:3003/api/discover/cameras');
      const data = await response.json();
      
      if (data.success && data.cameras && Array.isArray(data.cameras)) {
        setAvailableCameras(data.cameras);
        setIsConnected(true);
        setConnectionMode('local_server');
        console.log(`✅ Dynamically detected ${data.cameras.length} cameras:`, data.cameras);
        console.log('📊 Camera detection successful - system supports unlimited cameras');
      } else {
        console.warn('⚠️ Failed to load cameras from AI FTP server, using fallback');
        setAvailableCameras(['camera001', 'camera002']); // Static fallback
        setIsConnected(false);
        setConnectionMode('disconnected');
      }
    } catch (error: any) {
      console.error('❌ Failed to load available cameras from AI FTP server:', error);
      console.log('🔄 Using fallback cameras - check server connection');
      setAvailableCameras(['camera001', 'camera002']); // Static fallback
      setIsConnected(false);
      setConnectionMode('disconnected');
    }
  };

  // Load available dates from AI FTP server
  const loadAvailableDates = async () => {
    try {
      console.log('🔍 Loading available dates from AI FTP server...');
      const response = await fetch('http://localhost:3003/api/ftp-images/dates');
      const data = await response.json();
      
      if (data.success && data.dates && Array.isArray(data.dates)) {
        const dateStrings = data.dates.map((d: any) => d.date || d);
        setAvailableDates(dateStrings);
        setIsConnected(true);
        setConnectionMode('local_server');
        console.log(`✅ Loaded ${dateStrings.length} dates from AI FTP server:`, dateStrings);
      } else {
        console.warn('⚠️ Failed to load dates from AI FTP server, using fallback');
        setAvailableDates(['2025-10-05', '2025-10-06']); // Fallback to known dates
        setIsConnected(false);
        setConnectionMode('disconnected');
      }
    } catch (error: any) {
      console.error('❌ Failed to load available dates from AI FTP server:', error);
      setAvailableDates(['2025-10-05', '2025-10-06']); // Fallback to known dates
      setIsConnected(false);
      setConnectionMode('disconnected');
    }
  };

  // DISABLED: Load available case IDs for current camera and date selection
  // This function is no longer needed as we load violations directly
  const loadAvailableCases = async (cameraId?: string, date?: string) => {
    // Function disabled - using direct violation loading instead
    console.log('📝 loadAvailableCases disabled - using direct violation loading');
  };
  /**
   * MULTI-CAMERA SPEED VIOLATION CASE LOADING
   * 
   * This function loads speed violation cases from multiple cameras dynamically.
   * ONLY loads cases that have valid verdict.json files with speed data.
   * It respects the camera selection (individual camera or "all cameras").
   * 
   * Camera Selection Logic:
   * - If specific camera selected: Load only that camera's data
   * - If "All Cameras" selected: Load data from ALL detected cameras
   * - Uses dynamically detected camera list from loadAvailableCameras()
   * 
   * Data Sources:
   * - /srv/processing_inbox/camera001/2025-10-15/case001/verdict.json
   * - /srv/processing_inbox/camera002/2025-10-15/case001/verdict.json
   * - /srv/processing_inbox/camera003/2025-10-15/case001/verdict.json (auto-detected)
   * 
   * API Endpoints Used:
   * - /api/ftp-images/cases/{camera}/{date} - Get cases with verdict.json for specific camera/date
   * 
   * IMPORTANT: Cases without verdict.json files are automatically filtered out
   */
  const loadViolationCases = async (selectedDate?: string, cameraId?: string) => {
    try {
      console.log('🚀 Starting loadViolationCases for speed monitoring:', { selectedDate, cameraId });
      console.log('📅 Available dates:', availableDates);
      console.log('📡 Available cameras (dynamically detected):', availableCameras);
      setLoading(true);
      setError(null);
      
      let allCases: ViolationCase[] = [];
      
      // DYNAMIC CAMERA SELECTION LOGIC
      // Determine which cameras to load based on user selection and detected cameras
      let camerasToLoad: string[] = [];
      if (cameraId && cameraId !== 'all') {
        // Load specific camera only
        camerasToLoad = [cameraId];
        console.log(`🎯 Loading data from single camera: ${cameraId}`);
      } else {
        // Load ALL detected cameras (supports unlimited cameras)
        camerasToLoad = availableCameras.length > 0 ? availableCameras : ['camera001', 'camera002'];
        console.log(`🌐 Loading data from ALL detected cameras: ${camerasToLoad.join(', ')}`);
      }
      
      // Determine which dates to load
      let datesToLoad: string[] = [];
      if (selectedDate === 'all' || !selectedDate) {
        datesToLoad = availableDates.length > 0 ? availableDates : ['2025-10-05', '2025-10-06'];
        console.log(`🔍 Loading cases for all dates: ${datesToLoad.join(', ')}`);
      } else {
        datesToLoad = [selectedDate];
        console.log(`🔍 Loading cases for date: ${selectedDate}`);
      }
      
      console.log(`🎯 Loading from cameras: ${camerasToLoad.join(', ')}`);
      
      // Load cases from AI FTP server for each camera and date combination
      for (const camera of camerasToLoad) {
        for (const date of datesToLoad) {
          try {
            // Use the correct API endpoint that already filters for verdict.json files
            const apiUrl = `http://localhost:3003/api/ftp-images/cases/${camera}/${date}`;
            console.log(`🔍 API CALL (Speed Monitor): ${apiUrl}`);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`📊 API RESPONSE for ${camera}/${date}:`, {
                success: data.success,
                caseCount: data.cases?.length || 0,
                violations: data.violations || 0,
                compliant: data.compliant || 0
              });
              
              if (data.success && data.cases && data.cases.length > 0) {
                // Process each case - the API already filtered for cases with verdict.json
                for (const caseData of data.cases) {
                  // SKIP cases without valid verdict data (double-check)
                  if (!caseData.hasVerdict || !caseData.verdict || !caseData.verdict.speed || !caseData.verdict.limit) {
                    console.log(`❌ Skipping ${caseData.eventId} - no valid verdict.json with speed data`);
                    continue; // Skip this case entirely
                  }
                  
                  console.log(`✅ Processing case ${caseData.eventId} with speed: ${caseData.verdict.speed} km/h, limit: ${caseData.verdict.limit} km/h`);
                  
                  // Create violation case with verdict data from the API
                  const violationCase: ViolationCase = {
                    eventId: caseData.eventId,
                    cameraId: camera,
                    date: date,
                    verdict: caseData.verdict, // Contains actual verdict data from verdict.json
                    photos: (caseData.photos || []).map((photo: any) => ({
                      ...photo,
                      url: photo.url ? `http://localhost:3003${photo.url}` : null,
                      thumbnailUrl: photo.thumbnailUrl ? `http://localhost:3003${photo.thumbnailUrl}` : null,
                      imageUrl: photo.imageUrl ? `http://localhost:3003${photo.imageUrl}` : null
                    })), // Fix photo URLs to be absolute
                    folderPath: caseData.folderPath,
                    // Set AI processing data to defaults since we're focusing on speed
                    hasAI: false,
                    processed: true,
                    imageCount: caseData.photoCount || caseData.photos?.length || 0,
                    platesDetected: 0, // Not relevant for speed monitoring
                    processingMethod: 'speed_detection',
                    aiResults: undefined
                  };
                  
                  allCases.push(violationCase);
                }
                
                setIsConnected(true);
                setConnectionMode('local_server');
                console.log(`✅ Loaded ${data.cases.length} speed violation cases for ${camera}/${date}`);
              }
            } else {
              console.warn(`⚠️ Failed to fetch cases for ${camera}/${date}: ${response.status}`);
            }
          } catch (error: any) {
            console.error(`❌ Error fetching cases for ${camera}/${date}:`, error);
          }
        }
      }
      
      // Sort by date (newest first), then by case name
      allCases.sort((a, b) => {
        const dateComparison = b.date.localeCompare(a.date);
        if (dateComparison !== 0) return dateComparison;
        return a.eventId.localeCompare(b.eventId);
      });
      
      setViolationCases(allCases);
      updateViolationStats(allCases);
      console.log(`📊 Total speed violation cases loaded: ${allCases.length}`);
      
      if (allCases.length > 0) {
        setIsConnected(true);
        setConnectionMode('local_server');
      } else {
        setIsConnected(false);
        setConnectionMode('disconnected');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to load speed violation cases:', error);
      setError(`Failed to load speed violation cases: ${error.message || 'Unknown error'}`);
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
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ HTTP error:', response.status, response.statusText);
        setIsConnected(false);
        setConnectionMode('disconnected');
        return false;
      }
      
      const data = await response.json();
      console.log('📊 Response data:', data);
      
      if (data.success || data.message) {
        setIsConnected(true);
        setConnectionMode('local_server');
        console.log('✅ Connected to local image server successfully');
        return true;
      } else {
        setIsConnected(false);
        setConnectionMode('disconnected');
        console.log('❌ Server responded but no success indicator');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Failed to connect to local image server:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        fullError: error
      });
      setIsConnected(false);
      setConnectionMode('disconnected');
      return false;
    }
  };

  // Initialize data loading
  useEffect(() => {
    // Test connection first, then load data
    const initializeData = async () => {
      try {
        const connected = await testConnection();
        if (connected) {
          await loadAvailableCameras();
          await loadAvailableDates();
          await loadViolationCases('2025-10-06', undefined); // Load from date with verdict.json files
        } else {
          // If connection fails, stop loading after 5 seconds
          setTimeout(() => {
            setLoading(false);
            setError('Unable to connect to local server on port 3003');
          }, 5000);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setLoading(false);
        setError('Failed to initialize data loading');
      }
    };
    
    initializeData();
    
    // Set up auto-refresh every 2 minutes (reduced frequency to avoid rate limiting)
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh: Loading violation cases');
      console.log(`📡 Auto-refresh with camera: ${selectedCamera}`);
      // Test connection less frequently to reduce API calls
      if (Math.random() < 0.3) { // Only test connection 30% of the time
        testConnection();
      }
      // Respect current camera and date selection during auto-refresh
      const cameraParam = selectedCamera === 'all' ? undefined : selectedCamera;
      loadViolationCases(filters.dateRange, cameraParam);
      // Refresh available dates less frequently
      if (Math.random() < 0.2) { // Only refresh dates 20% of the time
        loadAvailableDates();
      }
    }, 120000); // Changed from 30000 (30s) to 120000 (2 minutes)
    
    return () => {
      clearInterval(autoRefreshInterval);
    };
  }, []);

  // Load cases when camera or date selection changes
  useEffect(() => {
    if (availableCameras.length > 0 && availableDates.length > 0) {
      // loadAvailableCases(selectedCamera, filters.dateRange); // Disabled - using direct violation loading
    }
  }, [selectedCamera, filters.dateRange, availableCameras, availableDates]);

  useEffect(() => {
    applyFilters();
  }, [violationCases, filters]);

  // Stats calculation for violation cases with AI processing data
  const updateViolationStats = (cases: ViolationCase[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCases = cases.filter(c => 
      c.date === today.toISOString().split('T')[0]
    );

    // Calculate stats including AI processing data
    const newStats: {[key: string]: number} = {
      total: cases.length,
      violations: cases.filter(c => c.verdict && c.verdict.decision === 'violation').length,
      noViolations: cases.filter(c => c.verdict && c.verdict.decision === 'no_violation').length,
      todayCount: todayCases.length,
      // AI Processing Stats
      aiEnabled: cases.filter(c => c.hasAI).length,
      aiProcessed: cases.filter(c => c.processed).length,
      totalPlatesDetected: cases.reduce((sum, c) => sum + (c.platesDetected || 0), 0),
      totalImages: cases.reduce((sum, c) => sum + (c.imageCount || 0), 0)
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
      filtered = filtered.filter(c => c.verdict && c.verdict.decision === filters.status);
    }

    // Camera filter is now handled by the main camera selection
    // No additional filtering needed here since data is loaded per camera selection

    // Case ID Search (primary search - exact match or partial)
    if (filters.search && filters.search.trim() !== '') {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c => {
        return c.eventId.toLowerCase().includes(searchLower) ||
               c.eventId.toLowerCase() === searchLower; // Exact match priority
      });
    }

    // Quick Filter (searches across multiple fields)
    if (filters.caseFilter && filters.caseFilter.trim() !== '') {
      const filterLower = filters.caseFilter.toLowerCase();
      filtered = filtered.filter(c => {
        return c.eventId.toLowerCase().includes(filterLower) ||
               (c.verdict && c.verdict.src_ip && c.verdict.src_ip.toLowerCase().includes(filterLower)) ||
               c.cameraId.toLowerCase().includes(filterLower) ||
               (c.verdict && c.verdict.speed && c.verdict.speed.toString().includes(filterLower)) ||
               (c.verdict && c.verdict.decision && c.verdict.decision.toLowerCase().includes(filterLower)) ||
               c.date.includes(filterLower);
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
    // loadAvailableCases(selectedCamera, filters.dateRange); // Disabled - using direct violation loading
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
      case 'unknown': return 'warning';
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
              Speed Violation Monitor - Radar Detection System
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {selectedCamera === 'all' ? 'ALL CAMERAS' : selectedCamera.toUpperCase()} - Speed Limit Enforcement
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
          <Button
            onClick={() => {
              console.log('🎯 Loading test data from 2025-10-06');
              setFilters(prev => ({ ...prev, dateRange: '2025-10-06' }));
              loadViolationCases('2025-10-06', selectedCamera === 'all' ? undefined : selectedCamera);
            }}
            disabled={loading}
            variant="outlined"
            color="info"
          >
            Load Test Data
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
        <Card sx={{ flex: '1 1 calc(20% - 8px)', minWidth: 120 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">Total Cases</Typography>
            <Typography variant="h4">{stats.total}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(20% - 8px)', minWidth: 120 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">🚨 Violations</Typography>
            <Typography variant="h4" color="error.main">{stats.violations || 0}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(20% - 8px)', minWidth: 120 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">✅ Compliant</Typography>
            <Typography variant="h4" color="success.main">{stats.noViolations || 0}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(20% - 8px)', minWidth: 120 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">📊 Violation Rate</Typography>
            <Typography variant="h4" color="warning.main">
              {stats.total > 0 ? Math.round((stats.violations / stats.total) * 100) : 0}%
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 calc(20% - 8px)', minWidth: 120 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">📷 Total Images</Typography>
            <Typography variant="h4">{stats.totalImages || 0}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Speed Violation Summary */}
      {stats.total > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🚗 Speed Violation Summary
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
              <Chip 
                label={`${stats.violations || 0} Speed Violations`}
                color={stats.violations > 0 ? 'error' : 'default'}
                size="small"
              />
              <Chip 
                label={`${stats.noViolations || 0} Compliant Vehicles`}
                color={stats.noViolations > 0 ? 'success' : 'default'}
                size="small"
              />
              <Chip 
                label={`${stats.total > 0 ? Math.round((stats.violations / stats.total) * 100) : 0}% Violation Rate`}
                color={stats.total > 0 && (stats.violations / stats.total) > 0.3 ? 'warning' : 'info'}
                size="small"
              />
              <Chip 
                label={`${stats.totalImages || 0} Evidence Photos`}
                color="default"
                size="small"
              />
            </Box>
            
            {/* Camera Breakdown */}
            {selectedCamera === 'all' && (
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  📊 Camera Breakdown:
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
              </Box>
            )}
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
            {/* DYNAMIC CAMERA SELECTION DROPDOWN */}
            {/* This dropdown is populated dynamically based on detected cameras */}
            {/* Supports unlimited cameras - automatically shows new cameras when added */}
            <TextField
              select
              label="Camera"
              value={selectedCamera}
              onChange={async (e) => {
                const newCamera = e.target.value;
                console.log(`🎯 Camera selection changed to: ${newCamera}`);
                console.log(`📊 Available cameras: ${availableCameras.join(', ')}`);
                
                // FORCE clear all data immediately to prevent cross-camera contamination
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
                // Reset stats for all detected cameras
                availableCameras.forEach(camera => {
                  emptyStats[camera] = 0;
                });
                setStats(emptyStats);
                
                // Add small delay to ensure UI updates
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (newCamera === 'all') {
                  console.log('📡 Loading data from ALL detected cameras:', availableCameras);
                  await loadViolationCases(filters.dateRange, undefined);
                } else {
                  console.log(`📡 Loading data from ${newCamera} ONLY - clearing other camera data`);
                  await loadViolationCases(filters.dateRange, newCamera);
                }
              }}
              sx={{ minWidth: 150 }}
              size="small"
              helperText={`Load data from camera(s) - ${availableCameras.length} detected`}
            >
              {/* "All Cameras" option - loads from ALL detected cameras */}
              <MenuItem value="all">All Cameras ({availableCameras.length})</MenuItem>
              {/* Dynamic camera list - automatically populated from filesystem scan */}
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
            <Autocomplete
              freeSolo
              options={violationCases.map(c => c.eventId)}
              value={filters.search}
              onInputChange={(event, newValue) => {
                setFilters({ ...filters, search: newValue || '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="🔍 Search Case ID"
                  placeholder="Type or select case ID..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                const caseData = violationCases.find(c => c.eventId === option);
                return (
                  <li key={key} {...otherProps}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {option}
                      </Typography>
                      {caseData && (
                        <Typography variant="caption" color="text.secondary">
                          {caseData.cameraId} • {caseData.verdict?.speed}km/h • {caseData.photos.length} photos
                        </Typography>
                      )}
                    </Box>
                  </li>
                );
              }}
              sx={{ minWidth: 300 }}
              size="small"
              filterOptions={(options, { inputValue }) => {
                return options.filter(option => 
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
              }}
            />
            <TextField
              label="🚀 Quick Filter"
              placeholder="Search by IP, speed, camera..."
              value={filters.caseFilter}
              onChange={(e) => setFilters({ ...filters, caseFilter: e.target.value })}
              InputProps={{
                startAdornment: <FilterList sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ minWidth: 250 }}
              size="small"
              helperText="Search in all fields"
            />
          </Box>
        </CardContent>
      </Card>


      {/* Violation Cases Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              🚗 Speed Violation Cases - {selectedCamera === 'all' ? 'ALL CAMERAS' : selectedCamera.toUpperCase()} ({filteredCases.length})
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
                      <TableCell>Case ID</TableCell>
                      <TableCell>Camera/Date</TableCell>
                      <TableCell><strong>Speed Limit</strong></TableCell>
                      <TableCell><strong>Detected Speed</strong></TableCell>
                      <TableCell><strong>Violation Status</strong></TableCell>
                      <TableCell>Images</TableCell>
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
                          {violationCase.eventId}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {violationCase.folderPath}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={violationCase.cameraId.toUpperCase()}
                          size="small"
                          color={
                            violationCase.cameraId === 'camera001' ? 'primary' :
                            violationCase.cameraId === 'camera002' ? 'secondary' : 'default'
                          }
                          variant={selectedCamera === 'all' ? 'filled' : 'outlined'}
                        />
                        <Typography variant="body2" fontWeight="bold">
                          {new Date(violationCase.date + 'T00:00:00').toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="h5" 
                          fontWeight="bold"
                          color="primary.main"
                          sx={{ fontSize: '1.5rem' }}
                        >
                          {violationCase.verdict?.limit || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          km/h limit
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="h5" 
                          fontWeight="bold"
                          color={
                            violationCase.verdict?.speed && violationCase.verdict?.limit && 
                            violationCase.verdict.speed > violationCase.verdict.limit 
                              ? 'error.main' 
                              : 'success.main'
                          }
                          sx={{ fontSize: '1.5rem' }}
                        >
                          {violationCase.verdict?.speed || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          km/h detected
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {violationCase.verdict ? (
                          <Chip 
                            label={violationCase.verdict.decision === 'violation' ? 'VIOLATION' : 'NO VIOLATION'}
                            color={violationCase.verdict.decision === 'violation' ? 'error' : 'success'}
                            size="medium"
                            sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                          />
                        ) : (
                          <Chip 
                            label="NO DATA"
                            color="default"
                            size="medium"
                          />
                        )}
                        {violationCase.verdict?.speed && violationCase.verdict?.limit && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                            {violationCase.verdict.speed > violationCase.verdict.limit 
                              ? `+${violationCase.verdict.speed - violationCase.verdict.limit} km/h over`
                              : `${violationCase.verdict.limit - violationCase.verdict.speed} km/h under`
                            }
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {violationCase.imageCount || 0} images
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          {violationCase.photos.slice(0, 3).map((photo, index) => (
                            <Avatar
                              key={`${violationCase.cameraId}-${violationCase.date}-${violationCase.eventId}-photo-${index}`}
                              src={photo.exists && photo.url ? photo.url : undefined}
                              variant="rounded"
                              sx={{ 
                                width: 24, 
                                height: 16, 
                                bgcolor: photo.exists ? 'success.light' : 'error.light',
                                fontSize: '0.7rem'
                              }}
                            >
                              {photo.exists ? (index + 1) : '✗'}
                            </Avatar>
                          ))}
                          {violationCase.photos.length > 3 && (
                            <Typography variant="caption" color="textSecondary">
                              +{violationCase.photos.length - 3}
                            </Typography>
                          )}
                        </Box>
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
              {violationCases.length === 0 ? (
                <div>
                  <strong>No violation cases found in {selectedCamera === 'all' ? 'ALL CAMERAS' : selectedCamera.toUpperCase()}</strong>
                  <br />
                  <small>Current date filter: {filters.dateRange}</small>
                  <br />
                  <small>Available dates: {availableDates.join(', ') || 'Loading...'}</small>
                  <br />
                  <small>Try selecting a different date from the filter above</small>
                </div>
              ) : 'No cases match the current filters'}
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
                    <Typography fontWeight="bold" color={selectedCase.verdict?.decision === 'violation' ? 'error.main' : 'success.main'}>
                      {selectedCase.verdict?.speed || 'N/A'} km/h
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Decision</Typography>
                    <Chip 
                      label={selectedCase.verdict?.decision === 'violation' ? 'VIOLATION' : 'NO VIOLATION'}
                      color={getStatusColor(selectedCase.verdict?.decision || 'unknown') as any}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Source IP Address</Typography>
                    <Typography>{selectedCase.verdict?.src_ip || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Event Time</Typography>
                    <Typography>{selectedCase.verdict?.event_ts ? new Date(selectedCase.verdict.event_ts * 1000).toLocaleString('en-US') : 'N/A'}</Typography>
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
                        src={photo.url || ''}
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
