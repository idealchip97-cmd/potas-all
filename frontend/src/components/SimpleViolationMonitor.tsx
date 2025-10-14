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
} from '@mui/icons-material';
import aiFtpService, { AIViolation } from '../services/aiFtpService';

interface SimpleViolationMonitorProps {
  refreshTrigger?: number;
}

const SimpleViolationMonitor: React.FC<SimpleViolationMonitorProps> = ({ 
  refreshTrigger = 0 
}) => {
  const [violations, setViolations] = useState<AIViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<AIViolation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatingFines, setCreatingFines] = useState(false);
  const [finesCreated, setFinesCreated] = useState<number | null>(null);
  
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
  }, [refreshTrigger, page]);

  const loadViolationCycles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test AI FTP server connection first
      const isConnected = await aiFtpService.testConnection();
      if (!isConnected) {
        throw new Error('خادم AI FTP غير متاح');
      }

      // Get violations with pagination
      const response = await aiFtpService.getViolationCycles(100); // Get more to paginate locally
      
      if (response.success) {
        // For pagination, we'll slice the results
        const startIndex = (page - 1) * itemsPerPage;
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
        });

        console.log(`✅ تم تحميل ${paginatedViolations.length} مخالفة (الصفحة ${page})`);
      } else {
        setError('فشل في تحميل بيانات المخالفات');
      }
    } catch (err: any) {
      console.error('❌ خطأ في تحميل المخالفات:', err);
      setError(err.message || 'فشل في تحميل البيانات');
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

  const handleCreateFines = async () => {
    try {
      setCreatingFines(true);
      setError(null);

      const token = localStorage.getItem('token') || 'demo_token_1760447560349_liqy8nlhx';
      
      const response = await fetch('http://localhost:3001/api/ai-fines/create-from-violations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setFinesCreated(data.data.createdFines);
        console.log(`✅ تم إنشاء ${data.data.createdFines} غرامة من المخالفات المكتشفة`);
        
        // Show success message for a few seconds
        setTimeout(() => {
          setFinesCreated(null);
        }, 5000);
      } else {
        throw new Error(data.message || 'فشل في إنشاء الغرامات');
      }
    } catch (err: any) {
      console.error('❌ خطأ في إنشاء الغرامات:', err);
      setError(err.message || 'فشل في إنشاء الغرامات');
    } finally {
      setCreatingFines(false);
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
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 200, flex: 1 }}>
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
        
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CameraAlt color="success" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h4">{stats.totalPlates}</Typography>
                <Typography variant="body2" color="text.secondary">
                  اللوحات المكتشفة
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
                  الكاميرات النشطة
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
                  الأيام المغطاة
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
              المخالفات المكتشفة بالذكاء الاصطناعي ({totalViolations} إجمالي)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<MonetizationOn />}
                onClick={handleCreateFines}
                disabled={creatingFines || violations.length === 0}
              >
                {creatingFines ? 'جاري الإنشاء...' : 'إنشاء غرامات'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadViolationCycles}
              >
                تحديث
              </Button>
            </Box>
          </Box>

          {/* Success/Error Messages */}
          {finesCreated !== null && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6">تم إنشاء الغرامات بنجاح!</Typography>
              <Typography>تم إنشاء {finesCreated} غرامة من المخالفات المكتشفة</Typography>
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6">خطأ في العملية</Typography>
              <Typography>{error}</Typography>
            </Alert>
          )}

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
                      <TableCell>رقم اللوحة</TableCell>
                      <TableCell>عدد اللوحات</TableCell>
                      <TableCell>أعلى ثقة</TableCell>
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
                                label="لا توجد لوحات"
                                color="default"
                                size="small"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${violation.platesDetected} لوحة`} 
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
                          <Tooltip title="عرض التفاصيل والصورة الكاملة">
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
                <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
                  صفحة {page} من {Math.ceil(totalViolations / itemsPerPage)} | 
                  عرض 5 مخالفات لكل صفحة
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
              تفاصيل المخالفة - {selectedViolation?.camera} - {selectedViolation?.case}
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
                    alt="صورة المخالفة"
                    sx={{ maxHeight: 500, objectFit: 'contain' }}
                  />
                </Card>
              </Box>
              
              {/* Details */}
              <Box sx={{ flex: 1, p: 2 }}>
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
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    وقت المعالجة:
                  </Typography>
                  <Typography variant="body1">
                    {formatTimestamp(selectedViolation.processedAt)}
                  </Typography>
                </Box>
                
                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  اللوحات المكتشفة ({selectedViolation.platesDetected})
                </Typography>
                
                {selectedViolation.plates.map((plate, index) => (
                  <Card key={index} sx={{ mb: 2, p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      اللوحة {index + 1}: {plate.detected_characters}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>الثقة:</strong> {(plate.confidence * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>المساحة:</strong> {plate.area} بكسل
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>نسبة العرض للارتفاع:</strong> {plate.aspect_ratio}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>الموقع:</strong> [{plate.bbox.join(', ')}]
                    </Typography>
                  </Card>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained">
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SimpleViolationMonitor;
