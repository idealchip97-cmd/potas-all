# 🎯 UDP-FTP Correlation System

This system correlates UDP radar data with FTP camera images based on timestamps to create complete violation records.

## 🔄 How It Works

### Data Flow
1. **UDP Channel** (Port 17081) - Receives radar speed violations
2. **FTP Channel** (Port 21) - Receives camera images with timestamps  
3. **Correlation Engine** - Matches UDP data with FTP images by timestamp
4. **Database Storage** - Creates complete violation records with images

### Message Format
UDP radar messages should follow this format:
```
ID: 1,Speed: 55, Time: 15:49:09.
ID: 1,Speed: 69, Time: 16:02:41.
ID: 1,Speed: 99, Time: 16:06:11.
```

## 🚀 System Components

### Backend Services
- **UDP Service** - Listens on port 17081 for radar data
- **FTP Service** - Connects to 192.168.1.55:21 for camera images
- **Correlation Service** - Matches radar data with images (30-second window)
- **Data Processor** - Creates violation records with plate recognition

### Frontend Pages (Updated Names)
- **Fines** (`/fines`) - View all processed violations and fines
- **Plate Recognition** (`/plate-recognition`) - Manage plate recognition
- **Fines Images Monitor** (`/fines-images-monitor`) - View camera images from FTP
- **Radar Info Monitor** (`/radar-info-monitor`) - View radar data from UDP

## 📋 Setup Instructions

### 1. Start Backend with Correlation
```bash
cd /home/rnd2/Desktop/radar_sys/potassium-backend-
npm run dev
```

### 2. Start External Data Services
```bash
# Via API (requires authentication)
curl -X POST http://localhost:3000/api/external-data/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Start Frontend
```bash
cd /home/rnd2/Desktop/radar_sys/potassium-frontend
npm start
```

### 4. Start Local Image Server
```bash
cd /home/rnd2/Desktop/radar_sys/potassium-frontend
node local-image-server.js
```

## 🧪 Testing the System

### Test UDP Radar Data
```bash
# Send test radar messages
cd /home/rnd2/Desktop/radar_sys
node test-udp-radar.js

# Or send custom message
node test-udp-radar.js "ID: 1,Speed: 85, Time: 16:30:15."
```

### Test FTP Images
Place images in: `/srv/camera_uploads/camera001/192.168.1.54/YYYY-MM-DD/Common/`
- Images should be named with timestamp: `YYYYMMDDHHMMSS.jpg`
- System will extract timestamp from filename for correlation

### Monitor Correlation
```bash
# Check correlation statistics
curl http://localhost:3000/api/external-data/correlation/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Trigger manual correlation
curl -X POST http://localhost:3000/api/external-data/correlation/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Correlation Logic

### Time Window Matching
- **Window Size**: 30 seconds (configurable)
- **Matching**: Finds closest timestamp between UDP and FTP data
- **Priority**: Closest time match wins if multiple candidates

### Example Correlation
```
UDP: "ID: 1,Speed: 75, Time: 16:05:30"  →  Timestamp: 2025-09-29T16:05:30
FTP: "20250929160532.jpg"               →  Timestamp: 2025-09-29T16:05:32
Difference: 2 seconds                   →  ✅ MATCH (within 30s window)
```

### Violation Record Created
```json
{
  "id": "violation_1_1727616330000",
  "radarId": 1,
  "speed": 75,
  "timestamp": "2025-09-29T16:05:30.000Z",
  "images": [{
    "path": "/srv/camera_uploads/camera001/192.168.1.54/2025-09-29/Common/20250929160532.jpg",
    "timeDifference": 2000
  }],
  "hasImage": true,
  "plateNumber": "ABC123",  // From OCR processing
  "fineAmount": 150         // Calculated based on speed excess
}
```

## 🌐 Frontend Access URLs

- **Main Dashboard**: http://localhost:3001/dashboard
- **Fines Management**: http://localhost:3001/fines  
- **Plate Recognition**: http://localhost:3001/plate-recognition
- **Fines Images Monitor**: http://localhost:3001/fines-images-monitor
- **Radar Info Monitor**: http://localhost:3001/radar-info-monitor

## 🔧 Configuration

### Environment Variables
```env
# Backend correlation settings
UDP_LOCAL_PORT=17081
FTP_HOST=192.168.1.55
FTP_PORT=21
FTP_USER=camera001
FTP_PASSWORD=RadarCamera01
IMAGE_BASE_DIR=/srv/camera_uploads

# Correlation time window (milliseconds)
CORRELATION_TIME_WINDOW=30000
```

### Fine Calculation
- **0-10 km/h over**: $50
- **11-20 km/h over**: $100  
- **21-30 km/h over**: $200
- **31+ km/h over**: $500

## 📊 Monitoring & Debugging

### Backend Logs
```bash
# View correlation service logs
sudo journalctl -u potassium-backend -f | grep -i correlation

# View UDP service logs  
sudo journalctl -u potassium-backend -f | grep -i udp

# View FTP service logs
sudo journalctl -u potassium-backend -f | grep -i ftp
```

### API Endpoints
```bash
# System health
GET /api/external-data/health

# Correlation statistics
GET /api/external-data/correlation/stats

# Manual correlation trigger
POST /api/external-data/correlation/trigger

# UDP test message
POST /api/external-data/udp/test
```

## 🚨 Troubleshooting

### No UDP Data Received
1. Check UDP service is listening: `netstat -ulpn | grep 17081`
2. Test UDP connectivity: `nc -u localhost 17081`
3. Verify message format matches: `ID: X,Speed: Y, Time: HH:MM:SS.`

### No FTP Images Found
1. Check FTP connection: `curl ftp://192.168.1.55/ --user camera001:RadarCamera01`
2. Verify image path exists: `/srv/camera_uploads/camera001/192.168.1.54/`
3. Check file permissions: `ls -la /srv/camera_uploads/`

### No Correlation Happening
1. Check time synchronization between UDP and FTP timestamps
2. Verify correlation time window (default 30 seconds)
3. Monitor correlation service logs for matching attempts

### Frontend Shows No Data
1. Ensure all services are running (backend, frontend, image server)
2. Check browser console for API errors
3. Verify authentication tokens are valid
4. Clear browser cache and refresh

## 🎯 Success Indicators

✅ **UDP Service**: Receiving and parsing radar messages  
✅ **FTP Service**: Connected and downloading images  
✅ **Correlation**: Matching UDP data with FTP images  
✅ **Database**: Creating violation records with images  
✅ **Frontend**: Displaying real data (no mock data)  
✅ **Plate Recognition**: Processing images and extracting plates  

The system is now fully configured for real-time correlation of UDP radar data with FTP camera images!
