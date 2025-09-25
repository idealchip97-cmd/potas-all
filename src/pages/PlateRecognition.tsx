import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  IconButton,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Refresh,
  CameraAlt,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

interface RecognitionResult {
  id: string;
  filename: string;
  plateNumber: string;
  confidence: number;
  timestamp: string;
  imageUrl: string;
  status: 'success' | 'failed' | 'processing';
  error?: string;
  color?: string;
  type?: string;
}

interface Statistics {
  totalInDatabase: number;
  totalCars: number;
  last24Hours: number;
  aiModel: string;
}

const PlateRecognition: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<RecognitionResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [statistics, setStatistics] = useState<Statistics>({
    totalInDatabase: 0,
    totalCars: 0,
    last24Hours: 0,
    aiModel: 'gpt-4o-mini'
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.gif']
    },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAllFiles = () => {
    uploadedFiles.forEach(file => URL.revokeObjectURL(file.preview));
    setUploadedFiles([]);
  };

  const processImages = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    const newResults: RecognitionResult[] = [];

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        setProcessingProgress((i / uploadedFiles.length) * 100);

        try {
          // Simulate OCR processing (replace with actual API call)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Mock plate recognition result
          const mockPlateNumber = `ABC${Math.floor(Math.random() * 9000) + 1000}`;
          const confidence = Math.floor(Math.random() * 30) + 70; // 70-100%
          const colors = ['white', 'black', 'silver', 'blue', 'red', 'green'];
          const types = ['sedan', 'suv', 'truck', 'hatchback', 'coupe'];

          const result: RecognitionResult = {
            id: file.id,
            filename: file.file.name,
            plateNumber: mockPlateNumber,
            confidence,
            timestamp: new Date().toISOString(),
            imageUrl: file.preview,
            status: confidence > 80 ? 'success' : 'failed',
            error: confidence <= 80 ? 'Low confidence detection' : undefined,
            color: colors[Math.floor(Math.random() * colors.length)],
            type: types[Math.floor(Math.random() * types.length)],
          };

          newResults.push(result);
        } catch (error) {
          const result: RecognitionResult = {
            id: file.id,
            filename: file.file.name,
            plateNumber: '',
            confidence: 0,
            timestamp: new Date().toISOString(),
            imageUrl: file.preview,
            status: 'failed',
            error: 'Processing failed',
          };
          newResults.push(result);
        }
      }

      setResults(prev => [...newResults, ...prev]);
      setProcessingProgress(100);
      
      // Update statistics
      setStatistics(prev => ({
        ...prev,
        totalInDatabase: prev.totalInDatabase + newResults.filter(r => r.status === 'success').length,
        totalCars: newResults.filter(r => r.status === 'success').length,
        last24Hours: prev.last24Hours + newResults.filter(r => r.status === 'success').length,
      }));
      
      // Clear uploaded files after processing
      setTimeout(() => {
        clearAllFiles();
        setProcessingProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const viewDetails = (result: RecognitionResult) => {
    setSelectedResult(result);
    setShowDetails(true);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle />;
      case 'failed': return <ErrorIcon />;
      case 'processing': return <CircularProgress size={16} />;
      default: return <Info />;
    }
  };

  const formatPlateNumber = (plateNumber: string) => {
    return plateNumber || 'N/A';
  };

  const capitalize = (str: string) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  };

  const getColorBadgeColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      white: '#f3f4f6',
      black: '#1f2937',
      silver: '#9ca3af',
      blue: '#3b82f6',
      red: '#ef4444',
      green: '#10b981',
    };
    return colorMap[color] || '#6b7280';
  };

  const getVehicleTypeIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      sedan: '🚗',
      suv: '🚙',
      truck: '🚚',
      hatchback: '🚗',
      coupe: '🏎️',
    };
    return iconMap[type] || '🚗';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const refreshData = () => {
    // Simulate refresh
    console.log('Refreshing data...');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
        <Box sx={{ maxWidth: '80rem', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: '#264878' }}>
                <CameraAlt />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#162c47', mb: 0.5 }}>
                  License Plate Recognition
                </Typography>
                <Typography variant="body2" sx={{ color: '#64829a' }}>
                  Powered by AI Vision Technology • Potassium Factory
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, bgcolor: '#A7034A', borderRadius: '50%' }} />
                <Typography variant="body2" sx={{ color: '#64829a' }}>
                  AI Vision • Connected
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: '80rem', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Statistics Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
          <Card sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid #e5e7eb', boxShadow: '0 2px 15px -3px rgba(0, 0, 0, 0.07)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Total Cars
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827' }}>
                    {statistics.totalInDatabase}
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, bgcolor: '#f0f4f8', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h4">🚗</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid #e5e7eb', boxShadow: '0 2px 15px -3px rgba(0, 0, 0, 0.07)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Today
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827' }}>
                    {statistics.totalCars}
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, bgcolor: '#dcfce7', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h4">📅</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid #e5e7eb', boxShadow: '0 2px 15px -3px rgba(0, 0, 0, 0.07)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Last 24h
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827' }}>
                    {statistics.last24Hours}
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, bgcolor: '#fef3c7', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h4">⏰</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid #e5e7eb', boxShadow: '0 2px 15px -3px rgba(0, 0, 0, 0.07)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    AI Model
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#264878' }}>
                    {statistics.aiModel}
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, bgcolor: '#fdf2f8', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h4">🤖</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' }, gap: 4 }}>
          {/* Upload Section */}
          <Card sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid #e5e7eb', boxShadow: '0 2px 15px -3px rgba(0, 0, 0, 0.07)' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                Upload Car Images
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Upload images to detect cars and extract license plates
              </Typography>
            </Box>
            <CardContent>
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed #d1d5db',
                  borderColor: isDragActive ? '#64829a' : '#d1d5db',
                  borderRadius: 3,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: isDragActive ? '#f0f4f8' : 'white',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: '#64829a',
                  },
                }}
              >
                <input {...getInputProps()} />
                <Box sx={{ width: 64, height: 64, bgcolor: '#f0f4f8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                  <Typography variant="h4">📸</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 500, color: '#111827', mb: 1 }}>
                  {isDragActive ? 'Drop images here' : 'Drop images here or click to select'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Supports JPG, PNG, WebP up to 10MB each
                </Typography>
              </Box>

              {uploadedFiles.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#111827' }}>
                      Selected Images ({uploadedFiles.length})
                    </Typography>
                  </Box>

                  {isProcessing && (
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress variant="determinate" value={processingProgress} sx={{ bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: '#264878' } }} />
                      <Typography variant="body2" sx={{ color: '#6b7280', mt: 1 }}>
                        Processing images... {Math.round(processingProgress)}%
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                    {uploadedFiles.map((file) => (
                      <Box key={file.id} sx={{ position: 'relative' }}>
                        <img
                          src={file.preview}
                          alt={file.file.name}
                          style={{
                            width: '100%',
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeFile(file.id)}
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            width: 24,
                            height: 24,
                            bgcolor: '#ef4444',
                            color: 'white',
                            fontSize: 12,
                            '&:hover': { bgcolor: '#dc2626' },
                          }}
                        >
                          ×
                        </IconButton>
                        <Box sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          fontSize: 10,
                          p: 0.5,
                          borderBottomLeftRadius: 8,
                          borderBottomRightRadius: 8,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {file.file.name}
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Recognize Button */}
                  <Box sx={{ mt: 3 }}>
                    <Button
                      onClick={processImages}
                      disabled={uploadedFiles.length === 0 || isProcessing}
                      fullWidth
                      sx={{
                        bgcolor: '#264878',
                        color: 'white',
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 500,
                        '&:hover': { bgcolor: '#1e3a5f' },
                        '&:disabled': { bgcolor: '#9ca3af', color: 'white' },
                      }}
                    >
                      {isProcessing ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={16} sx={{ color: 'white' }} />
                          Processing with AI Vision...
                        </Box>
                      ) : (
                        `Recognize Cars (${uploadedFiles.length})`
                      )}
                    </Button>
                  </Box>

                  {/* Recognition Results Summary */}
                  {results.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Box sx={{ p: 2, bgcolor: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#166534', mb: 0.5 }}>
                          Recognition Complete!
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#15803d' }}>
                          Detected {results.filter(r => r.status === 'success').length} cars from {results.length} images
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Cars Table */}
          <Card sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid #e5e7eb', boxShadow: '0 2px 15px -3px rgba(0, 0, 0, 0.07)' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                    Recognized Cars
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Click on any row to view details
                  </Typography>
                </Box>
                <Button
                  onClick={refreshData}
                  sx={{
                    border: '1px solid #d1d5db',
                    bgcolor: 'white',
                    color: '#374151',
                    '&:hover': { bgcolor: '#f9fafb' },
                  }}
                >
                  <Refresh sx={{ mr: 1 }} />
                  Refresh
                </Button>
              </Box>
            </Box>

            <Box sx={{ overflow: 'auto' }}>
              <TableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: '100%' }}>
                  <TableHead sx={{ bgcolor: '#f9fafb' }}>
                    <TableRow>
                      <TableCell sx={{ py: 1.5, px: 3, fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Image</TableCell>
                      <TableCell sx={{ py: 1.5, px: 3, fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plate Number</TableCell>
                      <TableCell sx={{ py: 1.5, px: 3, fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color</TableCell>
                      <TableCell sx={{ py: 1.5, px: 3, fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</TableCell>
                      <TableCell sx={{ py: 1.5, px: 3, fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</TableCell>
                      <TableCell sx={{ py: 1.5, px: 3, fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow
                        key={result.id}
                        onClick={() => viewDetails(result)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#f9fafb' },
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        <TableCell sx={{ py: 2, px: 3 }}>
                          <img
                            src={result.imageUrl}
                            alt={`Car ${result.plateNumber}`}
                            style={{
                              width: 64,
                              height: 48,
                              objectFit: 'cover',
                              borderRadius: 8,
                              border: '1px solid #e5e7eb',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2, px: 3 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#264878' }}>
                            {formatPlateNumber(result.plateNumber)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2, px: 3 }}>
                          <Chip
                            label={capitalize(result.color || 'unknown')}
                            size="small"
                            sx={{
                              bgcolor: getColorBadgeColor(result.color || 'unknown'),
                              color: result.color === 'black' ? 'white' : '#374151',
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2, px: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">{getVehicleTypeIcon(result.type || 'sedan')}</Typography>
                            <Typography variant="body2">{capitalize(result.type || 'sedan')}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2, px: 3 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', fontSize: 14 }}>
                            {formatTimestamp(result.timestamp)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2, px: 3 }}>
                          <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: 14 }}>
                            View Details
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {results.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Box sx={{ width: 64, height: 64, bgcolor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <Typography variant="h4">🚗</Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 500, color: '#111827', mb: 1 }}>
                      No cars detected yet
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Upload some car images to get started!
                    </Typography>
                  </Box>
                )}
              </TableContainer>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Car Details Modal */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            maxHeight: '90vh',
          },
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#111827' }}>
              Car Details
            </Typography>
            <IconButton onClick={() => setShowDetails(false)} sx={{ color: '#6b7280' }}>
              <Close />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ p: 3 }}>
          {selectedResult && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <img
                  src={selectedResult.imageUrl}
                  alt={`Car ${selectedResult.plateNumber}`}
                  style={{
                    width: '100%',
                    height: 256,
                    objectFit: 'cover',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Typography variant="caption" sx={{ color: '#6b7280', mt: 1, display: 'block' }}>
                  Image: {selectedResult.filename}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5, fontWeight: 500 }}>
                    Plate Number
                  </Typography>
                  <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#264878' }}>
                    {formatPlateNumber(selectedResult.plateNumber)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5, fontWeight: 500 }}>
                    Color
                  </Typography>
                  <Chip
                    label={capitalize(selectedResult.color || 'unknown')}
                    sx={{
                      bgcolor: getColorBadgeColor(selectedResult.color || 'unknown'),
                      color: selectedResult.color === 'black' ? 'white' : '#374151',
                      fontWeight: 500,
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5, fontWeight: 500 }}>
                    Vehicle Type
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h5">{getVehicleTypeIcon(selectedResult.type || 'sedan')}</Typography>
                    <Typography variant="h6">{capitalize(selectedResult.type || 'sedan')}</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5, fontWeight: 500 }}>
                    Detection Time
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#111827' }}>
                    {formatTimestamp(selectedResult.timestamp)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5, fontWeight: 500 }}>
                    Confidence
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#111827' }}>
                    {selectedResult.confidence}%
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5, fontWeight: 500 }}>
                    Status
                  </Typography>
                  <Chip
                    icon={getStatusIcon(selectedResult.status)}
                    label={selectedResult.status.toUpperCase()}
                    color={getStatusColor(selectedResult.status) as any}
                  />
                </Box>

                {selectedResult.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {selectedResult.error}
                  </Alert>
                )}
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ p: 3, borderTop: '1px solid #e5e7eb', bgcolor: '#f9fafb', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={() => setShowDetails(false)}
            sx={{
              border: '1px solid #d1d5db',
              bgcolor: 'white',
              color: '#374151',
              '&:hover': { bgcolor: '#f9fafb' },
            }}
          >
            Close
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default PlateRecognition;
