import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  Refresh,
  Speed,
  PhotoCamera,
} from '@mui/icons-material';

interface ViolationPhoto {
  filename: string;
  sequence: number;
  timestamp: string;
  size: number;
  exists: boolean;
  url: string | null;
}

interface ViolationVerdict {
  event_id: string;
  camera_id: string;
  src_ip: string;
  event_ts: number;
  arrival_ts: number;
  decision: 'violation' | 'compliant';
  speed: number;
  limit: number;
  car_filter: string;
  photos: ViolationPhoto[];
  created_at: string;
  processing_status: string;
}

interface Violation {
  eventId: string;
  verdict: ViolationVerdict;
  photos: ViolationPhoto[];
  folderPath: string;
}

const ViolationMonitorSimple: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState('camera002');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const cameras = ['camera001', 'camera002', 'camera003'];
  
  const carFilterColors: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
    'compliant': 'success',
    'minor_violation': 'info',
    'moderate_violation': 'warning',
    'serious_violation': 'error',
    'severe_violation': 'error'
  };

  const fetchViolations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/violations/${selectedCamera}/${selectedDate}`);
      const data = await response.json();
      
      if (data.success) {
        setViolations(data.violations || []);
      } else {
        setError(data.error || 'Failed to fetch violations');
      }
    } catch (err) {
      setError('Failed to connect to violation API');
      console.error('Error fetching violations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [selectedCamera, selectedDate]);

  const formatSpeed = (speed: number) => `${speed} km/h`;
  const formatCarFilter = (filter: string) => filter.replace('_', ' ').toUpperCase();
  const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🚨 3-Photo Violation Monitor
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Monitor speed violations with 3-photo evidence and complete metadata
      </Typography>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              select
              label="Camera"
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              {cameras.map((camera) => (
                <MenuItem key={camera} value={camera}>
                  📷 {camera.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              type="date"
              label="Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchViolations}
              disabled={loading}
            >
              Refresh
            </Button>
            
            <Typography variant="body2" color="text.secondary">
              📊 {violations.length} violations found
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📈 Daily Statistics
          </Typography>
          <Stack direction="row" spacing={4} justifyContent="center">
            <Box textAlign="center">
              <Typography variant="h4" color="error.main">
                {violations.length}
              </Typography>
              <Typography variant="body2">Total Violations</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="primary.main">
                {selectedCamera.toUpperCase()}
              </Typography>
              <Typography variant="body2">Selected Camera</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                30
              </Typography>
              <Typography variant="body2">Speed Limit (km/h)</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                3
              </Typography>
              <Typography variant="body2">Photos per Violation</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No violations */}
      {!loading && violations.length === 0 && !error && (
        <Alert severity="info">
          No violations found for {selectedCamera} on {selectedDate}
        </Alert>
      )}

      {/* Violations List */}
      {violations.map((violation) => (
        <Card key={violation.eventId} sx={{ mb: 2 }}>
          <CardContent>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
              <Speed color="error" />
              <Typography variant="h6">
                {formatSpeed(violation.verdict.speed)}
              </Typography>
              <Chip
                label={formatCarFilter(violation.verdict.car_filter)}
                color={carFilterColors[violation.verdict.car_filter] || 'default'}
                size="small"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                {formatTimestamp(violation.verdict.created_at)}
              </Typography>
            </Stack>

            {/* Details */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              {/* Violation Info */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  📋 Violation Details
                </Typography>
                <Stack spacing={1}>
                  <Typography><strong>Event ID:</strong> {violation.verdict.event_id}</Typography>
                  <Typography><strong>Camera:</strong> {violation.verdict.camera_id}</Typography>
                  <Typography><strong>Speed:</strong> {formatSpeed(violation.verdict.speed)}</Typography>
                  <Typography><strong>Limit:</strong> {formatSpeed(violation.verdict.limit)}</Typography>
                  <Typography><strong>Excess:</strong> {formatSpeed(violation.verdict.speed - violation.verdict.limit)}</Typography>
                  <Typography><strong>Source IP:</strong> {violation.verdict.src_ip}</Typography>
                  <Typography>
                    <strong>Decision:</strong> 
                    <Chip 
                      label={violation.verdict.decision.toUpperCase()} 
                      color={violation.verdict.decision === 'violation' ? 'error' : 'success'}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Stack>
              </Box>

              {/* Photos */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  📷 Evidence Photos (3)
                </Typography>
                <Stack direction="row" spacing={1} mb={2}>
                  {violation.photos.map((photo) => (
                    <Card 
                      key={photo.filename}
                      sx={{ 
                        width: 80,
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: photo.exists ? 'pointer' : 'default',
                        opacity: photo.exists ? 1 : 0.5,
                        bgcolor: 'grey.200'
                      }}
                      onClick={() => {
                        if (photo.exists && photo.url) {
                          window.open(`${photo.url}`, '_blank');
                        }
                      }}
                    >
                      <Box textAlign="center">
                        <PhotoCamera color={photo.exists ? 'primary' : 'disabled'} />
                        <Typography variant="caption" display="block">
                          {photo.sequence}
                        </Typography>
                      </Box>
                    </Card>
                  ))}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Click photos to view full size
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default ViolationMonitorSimple;
