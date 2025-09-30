# 🔄 Complete Data Cycle Flow

## 📊 Dynamic Data Flow: UDP + FTP → Correlation → Plate Recognition → Fines & Radars

### 🎯 **Data Sources**
- **UDP Port 17081**: Radar speed violations (`ID: 1,Speed: 77, Time: 10:23:26.`)
- **FTP Server**: Camera images from `/srv/camera_uploads/camera001/192.168.1.54/`

### 🔄 **Complete Cycle**

```
1. UDP Radar Data     →  Backend UDP Service (Port 17081)
2. FTP Camera Images  →  Backend FTP Service (192.168.1.55:21)
3. Correlation        →  Match by timestamp (30-second window)
4. Plate Recognition  →  Extract plate numbers from images
5. Database Storage   →  Create complete violation records
6. Frontend Display   →  Show in Fines, Radars, Plate Recognition pages
```

## 🗂️ **Page Data Sources**

### 📋 **http://localhost:3001/fines**
**Data Source**: Dynamic from UDP + FTP correlation
- **Cleared**: All static data removed
- **Populated by**: Correlated violations with calculated fines
- **Fields**: Plate Number, Speed, Speed Limit, Fine Amount, Status, Violation Time, Location

### 📡 **http://localhost:3001/radars** 
**Data Source**: Dynamic from UDP radar messages
- **Cleared**: All static data removed  
- **Populated by**: Radar stations detected from UDP messages
- **Fields**: Radar ID, Name, Location, Status, Speed Limit, Last Activity

### 🔍 **http://localhost:3001/plate-recognition**
**Data Source**: Complete violation cycle data
- **New Endpoint**: `/api/plate-recognition/violations-cycle`
- **Shows**: Complete UDP→FTP→Correlation→Recognition→Fines cycle
- **Fields**: All violation data with correlation metadata

## 🧪 **Testing the Complete Cycle**

### 1. Clear Existing Data
```bash
# Clear all static fines and radars
curl -X DELETE http://localhost:3000/api/fines/clear-all \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X DELETE http://localhost:3000/api/radars/clear-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Start External Data Services
```bash
curl -X POST http://localhost:3000/api/external-data/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Send UDP Test Data
```bash
# Stop any existing nc process on port 17081
pkill -f "nc.*17081"

# Send test radar data
node /home/rnd2/Desktop/radar_sys/test-udp-radar.js
```

### 4. Run Complete Test
```bash
# Automated test script
node /home/rnd2/Desktop/radar_sys/clear-and-test-cycle.js
```

## 📊 **Data Correlation Process**

### UDP Message Processing
```javascript
// Input: "ID: 1,Speed: 77, Time: 10:23:26."
{
  radarId: 1,
  speed: 77,
  timestamp: "2025-09-30T10:23:26.000Z",
  needsImageCorrelation: true
}
```

### FTP Image Processing
```javascript
// Input: "/srv/camera_uploads/.../20250930102325.jpg"
{
  path: "/srv/camera_uploads/camera001/192.168.1.54/2025-09-30/Common/20250930102325.jpg",
  timestamp: "2025-09-30T10:23:25.000Z"
}
```

### Correlation Result
```javascript
{
  id: "violation_1_1727689406000",
  radarId: 1,
  speed: 77,
  images: [{
    path: "..../20250930102325.jpg",
    timeDifference: 1000  // 1 second difference
  }],
  hasImage: true,
  plateNumber: "ABC123",  // From OCR
  fineAmount: 100         // Calculated
}
```

## 🌐 **Frontend Pages Updated**

### ✅ **Fines Images Monitor** (`/fines-images-monitor`)
- **Renamed from**: FTP Monitor
- **Shows**: Camera images from FTP server
- **Data**: Real images from `/srv/camera_uploads/`

### ✅ **Radar Info Monitor** (`/radar-info-monitor`) 
- **Renamed from**: UDP Monitor
- **Shows**: Real-time radar data from UDP
- **Data**: Live UDP messages on port 17081

### ✅ **Plate Recognition** (`/plate-recognition`)
- **New Feature**: Complete violation cycle view
- **Endpoint**: `/violations-cycle`
- **Shows**: Full UDP→FTP→Correlation→Recognition→Fines flow

## 🎯 **Expected Results**

After running the complete cycle:

1. **UDP Data Received**: Radar violations logged
2. **FTP Images Found**: Camera images correlated by timestamp  
3. **Plates Recognized**: OCR extracts plate numbers
4. **Fines Generated**: Calculated based on speed violations
5. **Radars Created**: Dynamic radar records from UDP data

### 📋 **Plate Recognition Page Will Show**:
- **Plate Number**: Extracted from FTP images
- **Speed (km/h)**: From UDP radar data
- **Speed Limit**: From radar configuration  
- **Fine Amount**: Calculated ($50-$500 based on excess speed)
- **Status**: Processing status (pending/processed/paid)
- **Violation Time**: From UDP timestamp
- **Location**: From radar location data

## 🔧 **API Endpoints**

### Clear Data
- `DELETE /api/fines/clear-all` - Clear all fines
- `DELETE /api/radars/clear-all` - Clear all radars

### Cycle Data  
- `GET /api/plate-recognition/violations-cycle` - Complete cycle data
- `GET /api/external-data/correlation/stats` - Correlation statistics

### Control
- `POST /api/external-data/start` - Start UDP/FTP services
- `POST /api/external-data/correlation/trigger` - Manual correlation

## 🚨 **Troubleshooting**

### No UDP Data
1. Check if port 17081 is free: `netstat -ulpn | grep 17081`
2. Stop conflicting processes: `pkill -f "nc.*17081"`
3. Restart external data service

### No FTP Images
1. Verify path exists: `ls -la /srv/camera_uploads/camera001/192.168.1.54/`
2. Check permissions: `sudo chmod -R 755 /srv/camera_uploads/`
3. Restart local image server

### No Correlations
1. Check time synchronization between UDP and FTP
2. Verify correlation time window (30 seconds default)
3. Monitor correlation service logs

The system now provides a complete dynamic data cycle from UDP radar violations and FTP camera images to final violation records with plate recognition!
