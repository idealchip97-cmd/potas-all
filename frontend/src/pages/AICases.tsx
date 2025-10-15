import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Container,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  Camera as CameraIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Visibility as EyeIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Image as ImageIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface AICase {
  camera_id: string;
  date: string;
  case_id: string;
  case_path: string;
  ai_folder: string;
  ai_images: string[];
  plate_number: string | null;
  confidence: number;
  processed_at: string;
  detection_count: number;
  ai_data: any;
}

interface AIStats {
  total_processed: number;
  total_pending: number;
  cameras: Record<string, number>;
  dates: Record<string, number>;
  plate_detections: number;
  average_confidence: number;
}

const AICases: React.FC = () => {
  const [cases, setCases] = useState<AICase[]>([]);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [cameraFilter, setCameraFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCase, setSelectedCase] = useState<AICase | null>(null);

  // Fetch AI cases with filters
  const fetchAICases = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (cameraFilter) params.append('camera', cameraFilter);
      if (dateFilter) params.append('date', dateFilter);
      if (searchFilter) params.append('search', searchFilter);
      params.append('limit', '100');
      
      const response = await fetch(`/api/ai-cases?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCases(data.data.cases || []);
      } else {
        setError(data.error || 'Failed to fetch AI cases');
      }
    } catch (err) {
      setError('Network error while fetching AI cases');
      console.error('Error fetching AI cases:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ai-cases/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch pending cases count
  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/api/ai-cases/pending');
      const data = await response.json();
      
      if (data.success) {
        setPendingCount(data.data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  };

  // Process all pending cases
  const processAllCases = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-cases/process', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully processed ${data.data.processed_count} cases`);
        // Refresh data
        await Promise.all([fetchAICases(), fetchStats(), fetchPendingCount()]);
      } else {
        setError(data.error || 'Failed to process cases');
      }
    } catch (err) {
      setError('Network error while processing cases');
      console.error('Error processing cases:', err);
    } finally {
      setProcessing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAICases();
    fetchStats();
    fetchPendingCount();
  }, []);

  // Reload when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAICases();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [cameraFilter, dateFilter, searchFilter]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            AI Cases Monitor
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            ALPR Processing for Cases with Verdict
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button 
            onClick={processAllCases} 
            disabled={processing || pendingCount === 0}
            variant="contained"
            color="primary"
            startIcon={processing ? <CircularProgress size={16} /> : <PlayIcon />}
          >
            {processing ? 'Processing...' : `Process All (${pendingCount})`}
          </Button>
          <Button 
            onClick={() => {
              fetchAICases();
              fetchStats();
              fetchPendingCount();
            }}
            variant="outlined"
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="textSecondary">Processed Cases</Typography>
                    <Typography variant="h4" color="success.main">{stats.total_processed}</Typography>
                  </Box>
                  <CheckCircleIcon color="success" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="textSecondary">Pending Cases</Typography>
                    <Typography variant="h4" color="warning.main">{pendingCount}</Typography>
                  </Box>
                  <ScheduleIcon color="warning" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="textSecondary">Plate Detections</Typography>
                    <Typography variant="h4" color="primary.main">{stats.plate_detections}</Typography>
                  </Box>
                  <ImageIcon color="primary" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="textSecondary">Avg Confidence</Typography>
                    <Typography variant="h4" color="secondary.main">
                      {(stats.average_confidence * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <CheckCircleIcon color="secondary" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <SearchIcon />
              <Typography variant="h6">Filters</Typography>
            </Box>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Camera"
                placeholder="e.g., camera001"
                value={cameraFilter}
                onChange={(e) => setCameraFilter(e.target.value)}
                InputProps={{
                  startAdornment: <CameraIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Plate number or case ID"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Cases List */}
      <Card>
        <CardHeader 
          title={<Typography variant="h6">AI Processed Cases ({cases.length})</Typography>}
        />
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={4}>
              <CircularProgress sx={{ mr: 2 }} />
              <Typography>Loading cases...</Typography>
            </Box>
          ) : cases.length === 0 ? (
            <Box textAlign="center" p={4}>
              <Typography color="textSecondary">No AI processed cases found</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {cases.map((caseItem, index) => (
                <Paper
                  key={`${caseItem.camera_id}-${caseItem.date}-${caseItem.case_id}`}
                  elevation={1}
                  sx={{ p: 2, '&:hover': { bgcolor: 'grey.50' } }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Box display="flex" gap={1} mb={1} flexWrap="wrap">
                        <Chip label={caseItem.case_id} variant="outlined" size="small" />
                        <Chip label={caseItem.camera_id} color="primary" size="small" />
                        <Chip label={caseItem.date} variant="outlined" size="small" />
                      </Box>
                      
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="body2" color="textSecondary">Plate Number:</Typography>
                          <Typography variant="h6" component="div" sx={{ fontFamily: 'monospace' }}>
                            {caseItem.plate_number || 'Not detected'}
                          </Typography>
                        </Grid>
                        
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="body2" color="textSecondary">Confidence:</Typography>
                          <Chip 
                            label={`${(caseItem.confidence * 100).toFixed(1)}%`}
                            color={getConfidenceColor(caseItem.confidence)}
                            size="small"
                          />
                        </Grid>
                        
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="body2" color="textSecondary">Images:</Typography>
                          <Typography>{caseItem.ai_images.length} processed</Typography>
                        </Grid>
                        
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="body2" color="textSecondary">Processed:</Typography>
                          <Typography variant="body2">{formatDate(caseItem.processed_at)}</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setSelectedCase(caseItem)}
                      startIcon={<EyeIcon />}
                    >
                      View Details
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Case Details Dialog */}
      <Dialog 
        open={!!selectedCase} 
        onClose={() => setSelectedCase(null)}
        maxWidth="lg"
        fullWidth
      >
        {selectedCase && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Case Details</Typography>
                <IconButton onClick={() => setSelectedCase(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={6}>
                  <Typography><strong>Case ID:</strong> {selectedCase.case_id}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography><strong>Camera:</strong> {selectedCase.camera_id}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography><strong>Date:</strong> {selectedCase.date}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography><strong>Plate Number:</strong> {selectedCase.plate_number || 'Not detected'}</Typography>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom>
                AI Images ({selectedCase.ai_images.length})
              </Typography>
              <Grid container spacing={2}>
                {selectedCase.ai_images.slice(0, 6).map((imagePath, idx) => {
                  const filename = imagePath.split('/').pop();
                  const imageUrl = `/api/ai-cases/${selectedCase.camera_id}/${selectedCase.date}/${selectedCase.case_id}/images/${filename}`;
                  
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                      <Paper elevation={2} sx={{ p: 1 }}>
                        <img
                          src={imageUrl}
                          alt={`AI processed ${filename}`}
                          style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 4 }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMnB4IiBmaWxsPSIjOTk5Ij5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
                          }}
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                          {filename}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
              
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                Detection Details
              </Typography>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
                <pre style={{ fontSize: '0.75rem', overflow: 'auto', margin: 0 }}>
                  {JSON.stringify(selectedCase.ai_data, null, 2)}
                </pre>
              </Paper>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedCase(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default AICases;
