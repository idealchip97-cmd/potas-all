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
  Pagination,
  CardMedia,
  Tooltip,
  Grid,
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
  ZoomIn,
} from '@mui/icons-material';
import aiFtpService, { AIViolation } from '../services/aiFtpService';

interface EnhancedViolationCycleMonitorProps {
  refreshTrigger?: number;
}

const EnhancedViolationCycleMonitor: React.FC<EnhancedViolationCycleMonitorProps> = ({ 
  refreshTrigger = 0 
}) => {
  const [violations, setViolations] = useState<AIViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<AIViolation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalViolations, setTotalViolations] = useState(0);
  const itemsPerPage = 10;

  // Statistics state
  const [stats, setStats] = useState({
    totalViolations: 0,
    totalPlates: 0,
    cameras: [] as string[],
    dates: [] as string[],
    averageConfidence: 0,
  });

  useEffect(() => {
    loadViolationCycles();
  }, [refreshTrigger, page]);

  const loadViolationCycles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test AI FTP server connection first
      const isConnected = await aiFtpService.testConnection();
      if (!isConnected) {
        throw new Error('AI FTP Server not available');
      }

      // Calculate offset for pagination
      const offset = (page - 1) * itemsPerPage;
      
      // Get violations with pagination
      const response = await aiFtpService.getViolationCycles(itemsPerPage);
      
      if (response.success) {
        // For pagination, we'll slice the results
        const startIndex = offset;
        const endIndex = startIndex + itemsPerPage;
        const paginatedViolations = response.violations.slice(startIndex, endIndex);
        
        setViolations(paginatedViolations);
        setTotalViolations(response.total);
        
        // Update statistics
        setStats({
          totalViolations: response.summary.totalViolations,
          totalPlates: response.summary.totalPlates,
          cameras: response.summary.cameras,
          dates: response.summary.dates,
          averageConfidence: response.violations.length > 0 
            ? response.violations.reduce((sum, v) => {
                const avgConf = v.confidence.length > 0 
                  ? v.confidence.reduce((a, b) => a + b, 0) / v.confidence.length 
                  : 0;
                return sum + avgConf;
              }, 0) / response.violations.length
            : 0,
        });

        console.log(`✅ Loaded ${paginatedViolations.length} violations (page ${page})`);
      } else {
        setError('Failed to load AI violation data');
      }
    } catch (err: any) {
      console.error('❌ Error loading violation cycles:', err);
      setError(err.message || 'Failed to load AI data');
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'success';
      case 'no_plates_detected':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ar-SA', {
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
          جاري تحميل المخالفات المكتشفة...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6">خطأ في التحميل</Typography>
        <Typography>{error}</Typography>
        <Button 
          variant="contained" 
          onClick={loadViolationCycles} 
          sx={{ mt: 1 }}
          startIcon={<Refresh />}
        >
          إعادة المحاولة
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Card sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Gavel color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">{stats.totalViolations}</Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي المخالفات
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Timeline color="info" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">{stats.totalPlates}</Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي اللوحات
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CameraAlt color="success" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">{stats.cameras.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  الكاميرات النشطة
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Speed color="warning" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">
                  {((stats.totalPlates / Math.max(violations.length, 1)) * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  متوسط الثقة
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
              المخالفات المكتشفة بالذكاء الاصطناعي
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadViolationCycles}
            >
              تحديث
            </Button>
          </Box>

          {violations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                لا توجد مخالفات مكتشفة
              </Typography>
              <Typography variant="body2" color="text.secondary">
                سيتم عرض المخالفات هنا عند اكتشاف لوحات جديدة
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الصورة</TableCell>
                      <TableCell>الكاميرا</TableCell>
                      <TableCell>التاريخ</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>اللوحات المكتشفة</TableCell>
                      <TableCell>مستوى الثقة</TableCell>
                      <TableCell>وقت المعالجة</TableCell>
                      <TableCell>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {violations.map((violation) => (
                      <TableRow key={violation.id}>
                        <TableCell>
                          <Avatar
                            src={getImageUrl(violation)}
                            variant="rounded"
                            sx={{ width: 60, height: 40 }}
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
                        <TableCell>{violation.date}</TableCell>
                        <TableCell>{violation.case}</TableCell>
                        <TableCell>
                          <Chip 
                            label={violation.platesDetected} 
                            color="success" 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {violation.confidence.length > 0 && (
                            <Chip 
                              label={`${(violation.confidence[0] * 100).toFixed(1)}%`}
                              color={violation.confidence[0] > 0.7 ? 'success' : 'warning'}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatTimestamp(violation.processedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض التفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(violation)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
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
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              تفاصيل المخالفة - {selectedViolation?.camera}
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedViolation && (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
              {/* Image */}
              <Box sx={{ flex: 1 }}>
                <Card>
                  <CardMedia
                    component="img"
                    image={getImageUrl(selectedViolation)}
                    alt="صورة المخالفة"
                    sx={{ maxHeight: 400, objectFit: 'contain' }}
                  />
                </Card>
              </Box>
              
              {/* Details */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    معلومات المخالفة
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      الكاميرا:
                    </Typography>
                    <Typography variant="body1">
                      {selectedViolation.camera}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      التاريخ:
                    </Typography>
                    <Typography variant="body1">
                      {selectedViolation.date}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      الحالة:
                    </Typography>
                    <Typography variant="body1">
                      {selectedViolation.case}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      طريقة المعالجة:
                    </Typography>
                    <Typography variant="body1">
                      {selectedViolation.processingMethod}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    اللوحات المكتشفة ({selectedViolation.platesDetected})
                  </Typography>
                  
                  {selectedViolation.plates.map((plate, index) => (
                    <Card key={index} sx={{ mb: 1, p: 1 }}>
                      <Typography variant="body2">
                        <strong>اللوحة {index + 1}:</strong> {plate.detected_characters}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        الثقة: {(plate.confidence * 100).toFixed(1)}% | 
                        المساحة: {plate.area} | 
                        النسبة: {plate.aspect_ratio}
                      </Typography>
                    </Card>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedViolationCycleMonitor;
