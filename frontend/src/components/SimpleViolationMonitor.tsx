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
  Pagination,
  CardMedia,
  Tooltip,
} from '@mui/material';
import {
  CameraAlt,
  Gavel,
  Refresh,
  Visibility,
  Close,
  CheckCircle,
  LocationOn,
  MonetizationOn,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material';
import aiFtpService, { AIViolation } from '../services/aiFtpService';

interface SimpleViolationMonitorProps {
  refreshTrigger?: number;
  selectedCamera?: string;
  dateFilter?: string;
  statusFilter?: string;
  searchFilter?: string;
}

const SimpleViolationMonitor: React.FC<SimpleViolationMonitorProps> = ({ 
  refreshTrigger = 0,
  selectedCamera = 'all',
  dateFilter = '2025-10-06',
  statusFilter = 'all',
  searchFilter = ''
}) => {
  const [violations, setViolations] = useState<AIViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<AIViolation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Approval/Denial state with persistence
  const [processingViolations, setProcessingViolations] = useState<Set<string>>(new Set());
  const [approvedViolations, setApprovedViolations] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('approvedViolations');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [deniedViolations, setDeniedViolations] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('deniedViolations');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [approvedFromBackend, setApprovedFromBackend] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalViolations, setTotalViolations] = useState(0);
  const itemsPerPage = 5;

  // Statistics state
  const [stats, setStats] = useState({
    totalViolations: 0,
    totalPlates: 0,
    cameras: [] as string[],
    dates: [] as string[],
  });

  useEffect(() => {
    loadViolationCycles();
    loadApprovedViolations();
  }, [refreshTrigger, page, selectedCamera, dateFilter, statusFilter, searchFilter]);

  // Save approval/denial state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('approvedViolations', JSON.stringify(Array.from(approvedViolations)));
  }, [approvedViolations]);

  useEffect(() => {
    localStorage.setItem('deniedViolations', JSON.stringify(Array.from(deniedViolations)));
  }, [deniedViolations]);

  const loadApprovedViolations = async () => {
    try {
      const token = localStorage.getItem('token') || 'demo_token_1760447560349_liqy8nlhx';
      
      const response = await fetch('/api/fines?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.fines) {
          const approvedCases = new Set<string>();
          
          data.data.fines.forEach((fine: any) => {
            // Extract case information from notes
            const notesMatch = fine.notes?.match(/from (\w+) case (\w+)/);
            if (notesMatch) {
              const [, camera, caseId] = notesMatch;
              // Use the same format as violation IDs
              const violationId = `${camera}-${dateFilter}-${caseId}`;
              approvedCases.add(violationId);
            }
          });
          
          setApprovedFromBackend(approvedCases);
        }
      }
    } catch (error) {
      console.error('Error loading approved violations:', error);
    }
  };

  const loadViolationCycles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get violations with pagination
      const response = await aiFtpService.getViolationCycles(100); // Get more to paginate locally
      
      if (response.success) {
        // Apply filters
        let filteredViolations = response.violations;
        
        // Filter by camera
        if (selectedCamera && selectedCamera !== 'all') {
          filteredViolations = filteredViolations.filter(v => v.camera === selectedCamera);
        }
        
        // Filter by date
        if (dateFilter && dateFilter !== 'all') {
          filteredViolations = filteredViolations.filter(v => v.date === dateFilter);
        }
        
        // Filter by status
        if (statusFilter && statusFilter !== 'all') {
          if (statusFilter === 'violation') {
            filteredViolations = filteredViolations.filter(v => v.status === 'success');
          } else if (statusFilter === 'no_violation') {
            filteredViolations = filteredViolations.filter(v => v.status === 'no_plates_detected');
          }
        }
        
        // Filter by search (case ID or plate number)
        if (searchFilter) {
          filteredViolations = filteredViolations.filter(v => 
            v.case.toLowerCase().includes(searchFilter.toLowerCase()) ||
            v.plates.some(p => p.text.toLowerCase().includes(searchFilter.toLowerCase()))
          );
        }
        
        // For pagination, we'll slice the filtered results
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedViolations = filteredViolations.slice(startIndex, endIndex);
        
        setViolations(paginatedViolations);
        setTotalViolations(filteredViolations.length);
        
        // Update statistics
        setStats({
          totalViolations: response.summary.totalViolations,
          totalPlates: response.summary.totalPlates,
          cameras: response.summary.cameras,
          dates: response.summary.dates,
        });

        console.log(`✅ Loaded ${paginatedViolations.length} violations (page ${page})`);
      } else {
        setError('Failed to load violation data');
      }
    } catch (err: any) {
      console.error('❌ Error loading violations:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        error: err
      });
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const handleViewDetails = (violation: AIViolation) => {
    setSelectedViolation(violation);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedViolation(null);
  };

  const handleApproveViolation = async (violation: AIViolation) => {
    const violationId = `${violation.camera}-${violation.date}-${violation.case}`;
    
    try {
      setProcessingViolations(prev => new Set(prev).add(violationId));
      setError(null);

      const token = localStorage.getItem('token') || 'demo_token_1760447560349_liqy8nlhx';
      
      const response = await fetch('/api/fines/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          camera: violation.camera,
          date: violation.date,
          caseId: violation.case,
          plateNumber: violation.plates.length > 0 ? violation.plates[0].detected_characters : 'Unknown',
          imageUrl: violation.imageUrl
        })
      });

      const data = await response.json();

      if (data.success) {
        setApprovedViolations(prev => new Set(prev).add(violationId));
        setApprovedFromBackend(prev => new Set(prev).add(violationId));
        // Remove from denied if it was previously denied
        setDeniedViolations(prev => {
          const newSet = new Set(prev);
          newSet.delete(violationId);
          return newSet;
        });
        console.log(`✅ Approved violation for case ${violation.case}`);
      } else {
        throw new Error(data.message || 'Failed to approve violation');
      }
    } catch (error) {
      console.error('Error approving violation:', error);
      setError(`Failed to approve violation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingViolations(prev => {
        const newSet = new Set(prev);
        newSet.delete(violationId);
        return newSet;
      });
    }
  };

  const handleDenyViolation = async (violation: AIViolation) => {
    const violationId = `${violation.camera}-${violation.date}-${violation.case}`;
    
    try {
      setProcessingViolations(prev => new Set(prev).add(violationId));
      setError(null);

      const token = localStorage.getItem('token') || 'demo_token_1760447560349_liqy8nlhx';
      
      const response = await fetch('/api/fines/deny', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          camera: violation.camera,
          date: violation.date,
          caseId: violation.case,
          plateNumber: violation.plates.length > 0 ? violation.plates[0].detected_characters : 'Unknown'
        })
      });

      const data = await response.json();

      if (data.success) {
        setDeniedViolations(prev => new Set(prev).add(violationId));
        // Remove from approved if it was previously approved
        setApprovedViolations(prev => {
          const newSet = new Set(prev);
          newSet.delete(violationId);
          return newSet;
        });
        setApprovedFromBackend(prev => {
          const newSet = new Set(prev);
          newSet.delete(violationId);
          return newSet;
        });
        console.log(`❌ Denied violation for case ${violation.case}`);
      } else {
        throw new Error(data.message || 'Failed to deny violation');
      }
    } catch (error) {
      console.error('Error denying violation:', error);
      setError(`Failed to deny violation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingViolations(prev => {
        const newSet = new Set(prev);
        newSet.delete(violationId);
        return newSet;
      });
    }
  };

  const handleClearFines = async () => {
    try {
      setError(null);

      const token = localStorage.getItem('token') || 'demo_token_1760447560349_liqy8nlhx';
      
      const response = await fetch('/api/fines/clear-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // Clear all approval/denial states
        setApprovedViolations(new Set());
        setDeniedViolations(new Set());
        setApprovedFromBackend(new Set());
        
        // Clear localStorage
        localStorage.removeItem('approvedViolations');
        localStorage.removeItem('deniedViolations');
        
        console.log(`🗑️ Cleared all fines from database and reset approval states`);
        alert(`Successfully cleared all fines from the database and reset approval states`);
      } else {
        throw new Error(data.message || 'Failed to clear fines');
      }
    } catch (error) {
      console.error('Error clearing fines:', error);
      setError(`Failed to clear fines: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getImageUrl = (violation: AIViolation) => {
    return `${violation.imageUrl}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading detected violations...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6">Loading Error</Typography>
        <Typography>{error}</Typography>
        <Button 
          variant="contained" 
          onClick={loadViolationCycles} 
          sx={{ mt: 1 }}
          startIcon={<Refresh />}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Gavel color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">{stats.totalViolations}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Violations
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CameraAlt color="success" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">{stats.totalPlates}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Detected Plates
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationOn color="info" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">{stats.cameras.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Cameras
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircle color="success" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">{stats.dates.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Days Covered
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ThumbUp color="success" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">{approvedViolations.size + approvedFromBackend.size}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Approved
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ThumbDown color="error" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">{deniedViolations.size}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Denied
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Violations Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              AI-Detected Violations ({totalViolations} Total)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<Close />}
                onClick={handleClearFines}
                size="small"
              >
                Clear Fines Table
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadViolationCycles}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {/* Success/Error Messages */}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6">Operation Error</Typography>
              <Typography>{error}</Typography>
            </Alert>
          )}

          {violations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No Violations Detected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Violations will appear here when new license plates are detected
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Image</TableCell>
                      <TableCell>Camera</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Case ID</TableCell>
                      <TableCell>Plate Number</TableCell>
                      <TableCell>Plate Count</TableCell>
                      <TableCell>Highest Confidence</TableCell>
                      <TableCell>Approval Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {violations.map((violation, index) => (
                      <TableRow key={`${violation.camera}-${violation.date}-${violation.case}-${index}`}>
                        <TableCell>
                          <Avatar
                            src={getImageUrl(violation)}
                            variant="rounded"
                            sx={{ width: 80, height: 60 }}
                          >
                            <CameraAlt />
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={violation.camera} 
                            color="primary" 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {violation.date}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={violation.case} 
                            color="info" 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ maxWidth: 200 }}>
                            {violation.plates.length > 0 ? (
                              <Chip 
                                label={violation.plates[0].detected_characters}
                                color="primary"
                                size="medium"
                                sx={{ 
                                  fontWeight: 'bold',
                                  fontSize: '0.9rem',
                                  minWidth: '80px'
                                }}
                              />
                            ) : (
                              <Chip 
                                label="No Plates"
                                color="default"
                                size="small"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${violation.platesDetected} plates`} 
                            color="success" 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {violation.confidence.length > 0 && (
                            <Chip 
                              label={`${(Math.max(...violation.confidence) * 100).toFixed(1)}%`}
                              color={Math.max(...violation.confidence) > 0.7 ? 'success' : 'warning'}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {(() => {
                              const violationId = `${violation.camera}-${violation.date}-${violation.case}`;
                              const isProcessing = processingViolations.has(violationId);
                              const isApproved = approvedViolations.has(violationId) || approvedFromBackend.has(violationId);
                              const isDenied = deniedViolations.has(violationId);

                              if (isApproved) {
                                return (
                                  <>
                                    <Chip 
                                      label="Approved" 
                                      color="success" 
                                      size="small"
                                      icon={<CheckCircle />}
                                    />
                                    <Tooltip title="Deny this violation">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDenyViolation(violation)}
                                        disabled={isProcessing}
                                        color="error"
                                      >
                                        <ThumbDown />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                );
                              }

                              if (isDenied) {
                                return (
                                  <>
                                    <Chip 
                                      label="Denied" 
                                      color="error" 
                                      size="small"
                                      icon={<Close />}
                                    />
                                    <Tooltip title="Approve this violation">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleApproveViolation(violation)}
                                        disabled={isProcessing}
                                        color="success"
                                      >
                                        <ThumbUp />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                );
                              }

                              return (
                                <>
                                  <Tooltip title="Approve violation and save to fines">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleApproveViolation(violation)}
                                      disabled={isProcessing}
                                      color="success"
                                    >
                                      {isProcessing ? <CircularProgress size={16} /> : <ThumbUp />}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Deny this violation">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDenyViolation(violation)}
                                      disabled={isProcessing}
                                      color="error"
                                    >
                                      {isProcessing ? <CircularProgress size={16} /> : <ThumbDown />}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="View details and full image">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleViewDetails(violation)}
                                    >
                                      <Visibility />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              );
                            })()}
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
                  count={Math.ceil(totalViolations / itemsPerPage)}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
                <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
                  Page {page} of {Math.ceil(totalViolations / itemsPerPage)} | 
                  Showing 5 violations per page
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Violation Details - {selectedViolation?.camera} - {selectedViolation?.case}
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedViolation && (
            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
              {/* Image */}
              <Box sx={{ flex: 1 }}>
                <Card>
                  <CardMedia
                    component="img"
                    image={getImageUrl(selectedViolation)}
                    alt="Violation Image"
                    sx={{ maxHeight: 500, objectFit: 'contain' }}
                  />
                </Card>
              </Box>
              
              {/* Details */}
              <Box sx={{ flex: 1, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Violation Information
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Camera:
                  </Typography>
                  <Typography variant="body1">
                    {selectedViolation.camera}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Date:
                  </Typography>
                  <Typography variant="body1">
                    {selectedViolation.date}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status:
                  </Typography>
                  <Typography variant="body1">
                    {selectedViolation.case}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Processing Method:
                  </Typography>
                  <Typography variant="body1">
                    {selectedViolation.processingMethod}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Processing Time:
                  </Typography>
                  <Typography variant="body1">
                    {formatTimestamp(selectedViolation.processedAt)}
                  </Typography>
                </Box>
                
                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Detected Plates ({selectedViolation.platesDetected})
                </Typography>
                
                {selectedViolation.plates.map((plate, index) => (
                  <Card key={`${selectedViolation.camera}-${selectedViolation.date}-${selectedViolation.case}-plate-${index}-${plate.detected_characters}`} sx={{ mb: 2, p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Plate {index + 1}: {plate.detected_characters}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Confidence:</strong> {(plate.confidence * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Area:</strong> {plate.area} pixels
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Aspect Ratio:</strong> {plate.aspect_ratio}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Location:</strong> [{plate.bbox.join(', ')}]
                    </Typography>
                  </Card>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SimpleViolationMonitor;
