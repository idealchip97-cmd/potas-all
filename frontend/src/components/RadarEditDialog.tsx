import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardMedia,
} from '@mui/material';
import {
  PhotoCamera,
  Close,
  Save,
  LocationOn,
  Speed,
  Wifi,
  CameraAlt,
  Map as MapIcon,
} from '@mui/icons-material';
import { Radar } from '../types';
import LocationMapPicker from './LocationMapPicker';

interface RadarEditDialogProps {
  open: boolean;
  radar: Radar | null;
  onClose: () => void;
  onSave: (radarData: FormData) => Promise<void>;
}

const RadarEditDialog: React.FC<RadarEditDialogProps> = ({
  open,
  radar,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    ipAddress: '',
    serialNumber: '',
    speedLimit: 50,
    status: 'active',
    latitude: 31.5497,
    longitude: 35.4732,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  useEffect(() => {
    if (radar) {
      setFormData({
        name: radar.name || '',
        location: radar.location || '',
        ipAddress: radar.ipAddress || '',
        serialNumber: radar.serialNumber || '',
        speedLimit: radar.speedLimit || 50,
        status: radar.status || 'active',
        latitude: typeof radar.latitude === 'number' && !isNaN(radar.latitude) ? radar.latitude : 31.5497,
        longitude: typeof radar.longitude === 'number' && !isNaN(radar.longitude) ? radar.longitude : 35.4732,
      });
      setImagePreview(radar.imageUrl ? `http://localhost:3001${radar.imageUrl}` : null);
    } else {
      // Reset form for new radar
      setFormData({
        name: '',
        location: '',
        ipAddress: '',
        serialNumber: '',
        speedLimit: 50,
        status: 'active',
        latitude: 31.5497,
        longitude: 35.4732,
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setError(null);
  }, [radar, open]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create FormData for file upload
      const data = new FormData();
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value.toString());
      });

      // Add image file if selected
      if (imageFile) {
        data.append('image', imageFile);
      }

      await onSave(data);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to save radar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {radar ? 'Edit Radar' : 'Add New Radar'}
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Image Upload Section */}
          <Box sx={{ flex: { xs: 1, md: '0 0 300px' } }}>
            <Box textAlign="center">
              <Typography variant="subtitle2" gutterBottom>
                Radar Image
              </Typography>
              
              {imagePreview ? (
                <Card sx={{ mb: 2 }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={imagePreview}
                    alt="Radar preview"
                  />
                </Card>
              ) : (
                <Box
                  sx={{
                    height: 200,
                    border: '2px dashed #ccc',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    bgcolor: '#f9f9f9'
                  }}
                >
                  <Box textAlign="center">
                    <CameraAlt sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                    <Typography variant="body2" color="textSecondary">
                      No image uploaded
                    </Typography>
                  </Box>
                </Box>
              )}

              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                type="file"
                onChange={handleImageChange}
              />
              <label htmlFor="image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoCamera />}
                  fullWidth
                >
                  Upload Image
                </Button>
              </label>
            </Box>
          </Box>

          {/* Form Fields */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Radar Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />

              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                required
                InputProps={{
                  startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="IP Address"
                  value={formData.ipAddress}
                  onChange={(e) => handleInputChange('ipAddress', e.target.value)}
                  placeholder="192.168.1.60"
                />

                <TextField
                  fullWidth
                  label="Serial Number"
                  value={formData.serialNumber}
                  onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Speed Limit (km/h)"
                  type="number"
                  value={formData.speedLimit}
                  onChange={(e) => handleInputChange('speedLimit', parseInt(e.target.value) || 50)}
                  InputProps={{
                    startAdornment: <Speed sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />

                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <MenuItem value="active">
                      <Box display="flex" alignItems="center">
                        <Wifi sx={{ mr: 1, color: 'success.main' }} />
                        Active
                      </Box>
                    </MenuItem>
                    <MenuItem value="inactive">
                      <Box display="flex" alignItems="center">
                        <Wifi sx={{ mr: 1, color: 'text.secondary' }} />
                        Inactive
                      </Box>
                    </MenuItem>
                    <MenuItem value="maintenance">
                      <Box display="flex" alignItems="center">
                        <Wifi sx={{ mr: 1, color: 'warning.main' }} />
                        Maintenance
                      </Box>
                    </MenuItem>
                    <MenuItem value="error">
                      <Box display="flex" alignItems="center">
                        <Wifi sx={{ mr: 1, color: 'error.main' }} />
                        Error
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  label="Latitude"
                  type="number"
                  value={formData.latitude}
                  onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value) || 0)}
                  inputProps={{ step: 0.000001 }}
                />

                <TextField
                  fullWidth
                  label="Longitude"
                  type="number"
                  value={formData.longitude}
                  onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value) || 0)}
                  inputProps={{ step: 0.000001 }}
                />

                <Button
                  variant="outlined"
                  startIcon={<MapIcon />}
                  onClick={() => setMapPickerOpen(true)}
                  sx={{ minWidth: 120, height: 56 }}
                >
                  Map
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <Save />}
          disabled={loading || !formData.name || !formData.location}
        >
          {loading ? 'Saving...' : 'Save Radar'}
        </Button>
      </DialogActions>

      {/* Location Map Picker */}
      <LocationMapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onLocationSelect={handleLocationSelect}
        initialLat={formData.latitude}
        initialLng={formData.longitude}
      />
    </Dialog>
  );
};

export default RadarEditDialog;
