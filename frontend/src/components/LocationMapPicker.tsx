import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Map as MapIcon,
  Close,
  MyLocation,
  Check,
} from '@mui/icons-material';

interface LocationMapPickerProps {
  open: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  open,
  onClose,
  onLocationSelect,
  initialLat = 31.5497,
  initialLng = 35.4732,
}) => {
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedLat(initialLat);
      setSelectedLng(initialLng);
      setError(null);
      loadGoogleMaps();
    }
  }, [open, initialLat, initialLng]);

  const loadGoogleMaps = () => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      initializeMap();
      return;
    }

    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setMapLoaded(true);
      initializeMap();
    };
    script.onerror = () => {
      setError('Failed to load Google Maps. Using OpenStreetMap instead.');
      initializeOpenStreetMap();
    };
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!window.google || !window.google.maps) {
      initializeOpenStreetMap();
      return;
    }

    const mapElement = document.getElementById('location-map');
    if (!mapElement) return;

    const map = new window.google.maps.Map(mapElement, {
      center: { lat: selectedLat, lng: selectedLng },
      zoom: 15,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    });

    const marker = new window.google.maps.Marker({
      position: { lat: selectedLat, lng: selectedLng },
      map: map,
      draggable: true,
      title: 'Radar Location',
    });

    // Update coordinates when marker is dragged
    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        setSelectedLat(position.lat());
        setSelectedLng(position.lng());
      }
    });

    // Update coordinates when map is clicked
    map.addListener('click', (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setSelectedLat(lat);
      setSelectedLng(lng);
      marker.setPosition({ lat, lng });
    });
  };

  const initializeOpenStreetMap = () => {
    // Fallback to a simple coordinate picker interface
    setMapLoaded(true);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setSelectedLat(lat);
          setSelectedLng(lng);
          
          // Re-initialize map with new location
          if (mapLoaded) {
            initializeMap();
          }
        },
        (error) => {
          setError('Unable to get your current location');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
    }
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLat, selectedLng);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            <MapIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Select Radar Location
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Click on the map or drag the marker to select the radar location.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<MyLocation />}
            onClick={getCurrentLocation}
            size="small"
          >
            Use Current Location
          </Button>
          <Box sx={{ flex: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2">
              <strong>Selected:</strong> {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
            </Typography>
          </Box>
        </Box>

        {/* Map Container */}
        <Box
          id="location-map"
          sx={{
            width: '100%',
            height: 400,
            border: '1px solid #ddd',
            borderRadius: 1,
            bgcolor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!mapLoaded ? (
            <Typography variant="body2" color="text.secondary">
              Loading map...
            </Typography>
          ) : !window.google ? (
            <Box textAlign="center" p={3}>
              <MapIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Interactive Map
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Map integration requires Google Maps API key.
                <br />
                Current coordinates: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button
                  size="small"
                  onClick={() => {
                    const lat = parseFloat(prompt('Enter latitude:') || selectedLat.toString());
                    const lng = parseFloat(prompt('Enter longitude:') || selectedLng.toString());
                    if (!isNaN(lat) && !isNaN(lng)) {
                      setSelectedLat(lat);
                      setSelectedLng(lng);
                    }
                  }}
                >
                  Manual Entry
                </Button>
              </Box>
            </Box>
          ) : null}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          startIcon={<Check />}
        >
          Use This Location
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

export default LocationMapPicker;
