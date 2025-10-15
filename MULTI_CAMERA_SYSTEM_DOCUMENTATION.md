# Multi-Camera Radar Speed Detection System Documentation

## Overview
This system provides a comprehensive radar speed detection and violation monitoring solution that supports multiple cameras dynamically. The system automatically detects available cameras from the filesystem and processes violation cases with AI-powered license plate recognition.

## System Architecture

### Core Components

1. **Frontend React Application** (Port 3004/3005)
   - Fines Images Monitor page: `http://localhost:3005/fines-images-monitor`
   - Real-time monitoring and case management
   - Dynamic multi-camera support

2. **AI FTP Server** (Port 3003)
   - Serves processed violation data from `/srv/processing_inbox`
   - Dynamic camera discovery
   - AI processing results integration

3. **Multi-Camera Server** (Port 3003 - Alternative)
   - Enhanced multi-camera support
   - Serves from both `/srv/processing_inbox` and `/srv/camera_uploads`
   - Backward compatibility with legacy systems

## Directory Structure

```
/srv/processing_inbox/
├── camera001/
│   ├── 2025-10-05/
│   │   ├── case001/
│   │   │   ├── photo1.jpg
│   │   │   ├── photo2.jpg
│   │   │   ├── verdict.json
│   │   │   └── ai/
│   │   │       ├── processed/
│   │   │       ├── results/
│   │   │       └── logs/
│   │   └── case002/
│   └── 2025-10-06/
├── camera002/
│   ├── 2025-10-05/
│   └── 2025-10-06/
└── camera003/ (automatically detected when added)
```

## Dynamic Camera Detection

### How It Works
The system automatically discovers cameras by:

1. **Filesystem Scanning**: Scans `/srv/processing_inbox` for directories starting with "camera"
2. **API Endpoint**: `GET /api/cameras` returns all detected cameras
3. **Frontend Integration**: React app fetches and displays available cameras dynamically
4. **Fallback Support**: Defaults to camera001 and camera002 if no cameras detected

### Adding New Cameras
To add a new camera (e.g., camera003):

1. **Create Directory Structure**:
   ```bash
   sudo mkdir -p /srv/processing_inbox/camera003/2025-10-15
   sudo mkdir -p /srv/processing_inbox/camera003/2025-10-15/case001
   ```

2. **Add Sample Data**:
   ```bash
   # Copy some violation photos
   sudo cp /path/to/photos/* /srv/processing_inbox/camera003/2025-10-15/case001/
   
   # Create verdict.json
   sudo tee /srv/processing_inbox/camera003/2025-10-15/case001/verdict.json << EOF
   {
     "event_id": "case001",
     "camera_id": "camera003",
     "decision": "violation",
     "speed": 45,
     "limit": 30,
     "event_ts": $(date +%s),
     "arrival_ts": $(date +%s)
   }
   EOF
   ```

3. **System Auto-Detection**: The system will automatically detect camera003 on next refresh

## API Endpoints

### Camera Discovery
- `GET /api/cameras` - List all available cameras
- `GET /api/cameras/:camera/dates` - List dates for specific camera
- `GET /api/cameras/:camera/dates/:date/cases` - List cases for camera/date

### Data Retrieval
- `GET /api/cameras/:camera/dates/:date/cases/:case/results` - AI processing results
- `GET /api/cameras/:camera/dates/:date/cases/:case/images/:image` - Serve images
- `GET /api/violations/:camera/:date/:eventId/:filename` - Serve violation photos

### Legacy Support
- `GET /api/ftp-images/cameras` - Multi-source camera discovery
- `GET /api/ftp-images/dates?camera=:camera` - Date listing with camera filter
- `GET /api/ftp-images/cases/:camera/:date` - Case listing for camera/date

## Frontend Features

### Multi-Camera Interface
- **Camera Selection Dropdown**: Dynamically populated with detected cameras
- **"All Cameras" Option**: View data from all cameras simultaneously
- **Camera-Specific Filtering**: Filter cases by individual camera
- **Real-time Updates**: Auto-refresh with camera selection preservation

### Statistics Dashboard
- **Per-Camera Breakdown**: Shows case counts for each camera
- **AI Processing Stats**: Displays AI-enabled and processed cases
- **Violation Metrics**: Tracks violation vs compliant cases
- **Image Counts**: Total images processed per camera

### Data Management
- **Dynamic Loading**: Loads cases based on camera and date selection
- **Intelligent Caching**: Preserves camera selection during refreshes
- **Error Handling**: Graceful fallback when cameras are unavailable
- **Auto-Discovery**: Automatically detects new cameras without restart

## Configuration

### Environment Variables
```bash
# Processing inbox path (where violation cases are stored)
PROCESSING_INBOX_PATH=/srv/processing_inbox

# Camera uploads path (FTP data)
CAMERA_BASE_PATH=/srv/camera_uploads

# Server port
PORT=3003
```

### Camera Configuration
Cameras are configured by directory structure only. No configuration files needed.

### AI Processing Setup
Each case directory can have an `ai/` folder for AI processing:
```
case001/
├── photo1.jpg
├── photo2.jpg
├── verdict.json
└── ai/
    ├── processed/    # Processed images
    ├── results/      # AI analysis results (JSON)
    └── logs/         # Processing logs
```

## Scaling to More Cameras

### Adding Camera004, Camera005, etc.
1. **Create Directory**: `sudo mkdir -p /srv/processing_inbox/camera004`
2. **Add Date Folders**: `sudo mkdir -p /srv/processing_inbox/camera004/$(date +%Y-%m-%d)`
3. **System Detection**: Camera appears automatically in frontend dropdown

### Performance Considerations
- **API Calls**: System optimizes API calls per camera
- **Memory Usage**: Loads data incrementally per camera selection
- **Refresh Intervals**: Configurable auto-refresh (default: 2 minutes)
- **Concurrent Processing**: Supports multiple cameras processing simultaneously

## Troubleshooting

### Camera Not Appearing
1. Check directory exists: `ls -la /srv/processing_inbox/`
2. Verify permissions: `sudo chmod 755 /srv/processing_inbox/camera*`
3. Check server logs: Look for "Found processing camera:" messages
4. Refresh frontend: Use "Refresh" button or reload page

### No Cases Loading
1. Verify date directories exist: `ls -la /srv/processing_inbox/camera001/`
2. Check case folders: `ls -la /srv/processing_inbox/camera001/2025-10-15/`
3. Verify API server running: `curl http://localhost:3003/health`
4. Check browser console for API errors

### AI Processing Issues
1. Verify AI folders exist: `ls -la /srv/processing_inbox/camera001/2025-10-15/case001/ai/`
2. Check processing results: `ls -la /srv/processing_inbox/camera001/2025-10-15/case001/ai/results/`
3. Review processing logs: `cat /srv/processing_inbox/camera001/2025-10-15/case001/ai/logs/*.log`

## Future Enhancements

### Planned Features
- **Camera Metadata**: Store camera location, IP, configuration
- **Real-time Streaming**: Live camera feed integration
- **Advanced Filtering**: Filter by camera location, IP range, etc.
- **Camera Health Monitoring**: Track camera uptime and connectivity
- **Bulk Operations**: Process multiple cameras simultaneously

### Extensibility
- **Plugin Architecture**: Support for camera-specific processing plugins
- **Custom AI Models**: Per-camera AI model configuration
- **Integration APIs**: REST APIs for external system integration
- **Notification System**: Alerts for camera failures or violations

## Technical Notes

### Camera Detection Logic
```javascript
// Frontend: loadAvailableCameras()
const response = await fetch('/api/cameras');
const data = await response.json();
setAvailableCameras(data.cameras); // Automatically updates dropdown

// Backend: /api/cameras endpoint
const cameras = await fs.readdir('/srv/processing_inbox');
const cameraList = cameras.filter(item => item.startsWith('camera'));
```

### Data Flow
1. **Camera Discovery**: Frontend fetches available cameras from API
2. **Date Loading**: For each camera, fetch available dates
3. **Case Loading**: Load violation cases for selected camera/date combination
4. **AI Integration**: Fetch AI processing results for each case
5. **Image Serving**: Serve violation photos through dedicated endpoints

### Performance Optimization
- **Lazy Loading**: Cases loaded only when camera/date selected
- **Caching**: API responses cached for 2 minutes
- **Batch Processing**: Multiple API calls processed in parallel
- **Memory Management**: Old data cleared when switching cameras

---

**Last Updated**: October 15, 2025
**System Version**: Multi-Camera v2.0
**Maintainer**: Radar Speed Detection System Team
