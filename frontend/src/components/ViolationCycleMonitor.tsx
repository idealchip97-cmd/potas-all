import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  Speed,
  CameraAlt,
  Gavel,
  Timeline,
  Refresh,
  Visibility,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  AccessTime,
  LocationOn,
} from '@mui/icons-material';
import apiService from '../services/api';
import realTimeDataService from '../services/realTimeDataService';

interface ViolationCycleData {
  id: string;
  radarId: number;
  radarName: string;
  location: string;
  plateNumber: string;
  confidence: number;
  speed: number;
  speedLimit: number;
  fineAmount: number;
  status: string;
  violationTime: string;
  processedAt: string;
  imagePath: string;
  hasImage: boolean;
  correlationId: string;
  rawRadarData: any;
  correlatedAt: string;
}

interface CycleStats {
  totalViolations: number;
  processedViolations: number;
  correlatedImages: number;
  averageProcessingTime: number;
  successRate: number;
}

const ViolationCycleMonitor: React.FC = () => {
  const [violations, setViolations] = useState<ViolationCycleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<ViolationCycleData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState<CycleStats>({
    totalViolations: 0,
    processedViolations: 0,
    correlatedImages: 0,
    averageProcessingTime: 0,
    successRate: 0,
  });
  const [tabValue, setTabValue] = useState(0);
  const [realTimeUpdates, setRealTimeUpdates] = useState(0);

  useEffect(() => {
    loadViolationCycles();
    setupRealTimeUpdates();
  }, []);

  const setupRealTimeUpdates = () => {
    // Listen for complete correlation cycles
    const unsubscribe = realTimeDataService.onCorrelationCycleComplete((cycleData) => {
      console.log('🎯 New correlation cycle completed:', cycleData);
      setRealTimeUpdates(prev => prev + 1);
      // Refresh data when new cycle completes
      loadViolationCycles();
    });

    return unsubscribe;
  };

  const loadViolationCycles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getViolationsCycle({ limit: 50 });
      
      if (response.success) {
        setViolations(response.data);
        
        // Calculate statistics
        const total = response.data.length;
        const processed = response.data.filter((v: ViolationCycleData) => v.processedAt).length;
        const withImages = response.data.filter((v: ViolationCycleData) => v.hasImage).length;
        const successRate = total > 0 ? (processed / total) * 100 : 0;

        setStats({
          totalViolations: total,
          processedViolations: processed,
          correlatedImages: withImages,
          averageProcessingTime: 2.5, // Mock value
          successRate,
        });
      } else {
        setError('Failed to load violation cycle data');
      }
    } catch (err: any) {
      console.error('Error loading violation cycles:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processed':
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatSpeed = (speed: number, limit: number) => {
    const excess = speed - limit;
    return {
      speed,
      limit,
      excess,
      color: excess > 20 ? '#ef4444' : excess > 10 ? '#f59e0b' : '#10b981'
    };
  };

  const viewDetails = (violation: ViolationCycleData) => {
    setSelectedViolation(violation);
    setShowDetails(true);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
              Complete Violation Cycle Monitor
            </Typography>
            <Typography variant="body1" sx={{ color: '#6b7280' }}>
              Real-time monitoring of the complete radar → database → frontend → plate recognition cycle
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge badgeContent={realTimeUpdates} color="primary">
              <Button
                onClick={loadViolationCycles}
                variant="outlined"
                startIcon={<Refresh />}
                disabled={loading}
              >
                Refresh
              </Button>
            </Badge>
          </Box>
        </Box>

        {/* Data Flow Visualization */}
        <Card sx={{ mb: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              🔄 Data Flow Pipeline
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: '#3b82f6', width: 32, height: 32 }}>
                  <Speed fontSize="small" />
                </Avatar>
                <Typography variant="body2">UDP Radar</Typography>
              </Box>
              <Typography variant="h6" sx={{ color: '#6b7280' }}>→</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: '#10b981', width: 32, height: 32 }}>
                  <CameraAlt fontSize="small" />
                </Avatar>
                <Typography variant="body2">FTP Images</Typography>
              </Box>
              <Typography variant="h6" sx={{ color: '#6b7280' }}>→</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: '#f59e0b', width: 32, height: 32 }}>
                  <Timeline fontSize="small" />
                </Avatar>
                <Typography variant="body2">Correlation</Typography>
              </Box>
              <Typography variant="h6" sx={{ color: '#6b7280' }}>→</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: '#8b5cf6', width: 32, height: 32 }}>
                  <Visibility fontSize="small" />
                </Avatar>
                <Typography variant="body2">Plate Recognition</Typography>
              </Box>
              <Typography variant="h6" sx={{ color: '#6b7280' }}>→</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: '#ef4444', width: 32, height: 32 }}>
                  <Gavel fontSize="small" />
                </Avatar>
                <Typography variant="body2">Fine Generation</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                  Total Violations
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.totalViolations}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#dbeafe' }}>
                <Speed sx={{ color: '#3b82f6' }} />
              </Avatar>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                  Processed
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.processedViolations}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#dcfce7' }}>
                <CheckCircle sx={{ color: '#16a34a' }} />
              </Avatar>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                  With Images
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.correlatedImages}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#fef3c7' }}>
                <CameraAlt sx={{ color: '#d97706' }} />
              </Avatar>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                  Success Rate
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.successRate.toFixed(1)}%
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#f3e8ff' }}>
                <Timeline sx={{ color: '#9333ea' }} />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Violations Table */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="All Violations" />
            <Tab label="Recent Activity" />
            <Tab label="Failed Processing" />
          </Tabs>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell>Radar</TableCell>
                <TableCell>Plate Number</TableCell>
                <TableCell>Speed</TableCell>
                <TableCell>Fine Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Violation Time</TableCell>
                <TableCell>Image</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {violations.map((violation) => {
                const speedInfo = formatSpeed(violation.speed, violation.speedLimit);
                return (
                  <TableRow key={violation.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {violation.radarName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          ID: {violation.radarId}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {violation.plateNumber}
                        </Typography>
                        {violation.confidence > 0 && (
                          <Chip
                            label={`${violation.confidence}%`}
                            size="small"
                            color={violation.confidence > 80 ? 'success' : 'warning'}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: speedInfo.color, fontWeight: 600 }}
                        >
                          {speedInfo.speed} km/h
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          Limit: {speedInfo.limit} km/h (+{speedInfo.excess})
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${violation.fineAmount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={violation.status}
                        color={getStatusColor(violation.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {formatDateTime(violation.violationTime)}
                        </Typography>
                        {violation.processedAt && (
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            Processed: {formatDateTime(violation.processedAt)}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {violation.hasImage ? (
                        <Chip label="Available" color="success" size="small" />
                      ) : (
                        <Chip label="Missing" color="error" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => viewDetails(violation)}
                        startIcon={<Visibility />}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {violations.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                No violation cycles found
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Violation cycles will appear here when radar data is correlated with images
              </Typography>
            </Box>
          )}
        </TableContainer>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Violation Cycle Details</Typography>
            <IconButton onClick={() => setShowDetails(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedViolation && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Radar Data</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Radar ID:</Typography>
                    <Typography variant="body2">{selectedViolation.radarId}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Location:</Typography>
                    <Typography variant="body2">{selectedViolation.location}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Speed Detected:</Typography>
                    <Typography variant="body2">{selectedViolation.speed} km/h</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Speed Limit:</Typography>
                    <Typography variant="body2">{selectedViolation.speedLimit} km/h</Typography>
                  </Box>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Processing Results</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Plate Number:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {selectedViolation.plateNumber}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Confidence:</Typography>
                    <Typography variant="body2">{selectedViolation.confidence}%</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Fine Amount:</Typography>
                    <Typography variant="body2">${selectedViolation.fineAmount}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Status:</Typography>
                    <Chip
                      label={selectedViolation.status}
                      color={getStatusColor(selectedViolation.status)}
                      size="small"
                    />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Timeline</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#3b82f6', width: 24, height: 24 }}>
                      <AccessTime fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body2">Violation Detected</Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {formatDateTime(selectedViolation.violationTime)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {selectedViolation.correlatedAt && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#10b981', width: 24, height: 24 }}>
                        <Timeline fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2">Image Correlated</Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {formatDateTime(selectedViolation.correlatedAt)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {selectedViolation.processedAt && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#8b5cf6', width: 24, height: 24 }}>
                        <CheckCircle fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2">Processing Complete</Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {formatDateTime(selectedViolation.processedAt)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViolationCycleMonitor;
