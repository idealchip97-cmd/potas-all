# Google Maps Integration Setup (Optional)

The radar location picker includes Google Maps integration for enhanced user experience. This is optional - the system works without it.

## Setup Instructions

1. **Get Google Maps API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable "Maps JavaScript API"
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

2. **Configure API Key**:
   - Open `frontend/src/components/LocationMapPicker.tsx`
   - Replace `YOUR_API_KEY` with your actual API key on line 43:
   ```typescript
   script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&libraries=places`;
   ```

3. **Alternative: Environment Variable**:
   - Add to `.env` file:
   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
   - Update the component to use:
   ```typescript
   script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
   ```

## Features

- **Interactive Map**: Click to select location
- **Draggable Marker**: Drag marker to precise position  
- **Current Location**: Use GPS to get current coordinates
- **Fallback Mode**: Works without API key (manual coordinate entry)
- **Coordinate Display**: Shows selected lat/lng in real-time

## Without Google Maps

If you don't set up Google Maps API, the system will:
- Show a fallback interface
- Allow manual coordinate entry
- Still function completely for radar management
- Use current location via browser geolocation API

The radar management system is fully functional without Google Maps integration.
