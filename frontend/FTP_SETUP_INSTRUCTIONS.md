# FTP Image Server Setup Instructions

## Overview
This solution provides a bridge between the React frontend and the FTP server at `192.168.1.14` to display actual camera images in the FTP Monitor instead of placeholder images.

## 🔧 Setup Instructions

### 1. Prerequisites
- Network access to FTP server at `192.168.1.14:21`
- Node.js installed
- FTP credentials: `admin` / `idealchip123`

### 2. Start the FTP Image Server

```bash
cd ftp-server
npm install
node server.js
```

The server will start on port 3003 and attempt to connect to the FTP server.

### 3. Verify Connection

Check the health endpoint:
```bash
curl http://localhost:3003/health
```

Expected response when FTP is accessible:
```json
{
  "success": true,
  "message": "FTP Image Server is running",
  "ftp": {
    "connected": true,
    "host": "192.168.1.14",
    "port": 21,
    "user": "admin"
  }
}
```

### 4. Test Image Listing

```bash
curl "http://localhost:3003/api/ftp-images/list?camera=192.168.1.54&date=2025-09-27"
```

Expected response:
```json
{
  "success": true,
  "files": [
    {
      "filename": "2025092709_2042.jpg",
      "modified": "2025-09-27T09:25:00.000Z",
      "size": 123456,
      "url": "/api/ftp-images/camera001/192.168.1.54/2025-09-27/Common/2025092709_2042.jpg"
    }
  ],
  "total": 15,
  "path": "/srv/camera_uploads/camera001/192.168.1.54/2025-09-27/Common/"
}
```

### 5. Start the React Frontend

```bash
npm start
```

Navigate to the FTP Monitor page to see the actual camera images.

## 🚀 How It Works

### Architecture
```
React Frontend (port 3001)
    ↓ HTTP requests
FTP Image Server (port 3003)
    ↓ FTP protocol
FTP Server (192.168.1.14:21)
```

### API Endpoints

1. **List Images**: `GET /api/ftp-images/list?camera=192.168.1.54&date=2025-09-27`
   - Lists all image files in the specified camera/date directory
   - Returns metadata including filename, size, modification date

2. **Serve Image**: `GET /api/ftp-images/camera001/192.168.1.54/2025-09-27/Common/filename.jpg`
   - Downloads and serves individual images from FTP
   - Proper content-type headers and caching

3. **Health Check**: `GET /health`
   - Shows FTP connection status and server information

## 🔍 Troubleshooting

### Connection Issues

**Error: EHOSTUNREACH**
- Check network connectivity to 192.168.1.14
- Verify firewall settings
- Ensure VPN connection if required

**Error: ECONNREFUSED**
- Verify FTP service is running on port 21
- Check if port 21 is blocked by firewall

**Error: Authentication failed**
- Verify credentials: `admin` / `idealchip123`
- Check FTP user permissions

### Directory Access Issues

**Error: No such file or directory**
- Verify the path structure: `/srv/camera_uploads/camera001/192.168.1.54/2025-09-27/Common/`
- Check if the date folder exists
- Ensure camera IP is correct

**Error: Permission denied**
- Verify FTP user has read access to the directory
- Check directory permissions on FTP server

## 🛠️ Development Mode

When the FTP server is not accessible, the system automatically falls back to enhanced mock mode with:
- Realistic filenames based on actual FTP structure
- High-quality placeholder images
- Simulated processing states
- Sample plate numbers and vehicle types

## 📁 File Structure

```
ftp-server/
├── server.js          # Main FTP image server
├── package.json       # Dependencies
└── node_modules/      # Installed packages

src/services/
├── ftpClient.ts       # Updated FTP client with new endpoints
└── realTimeDataService.ts  # Real-time data integration
```

## 🔧 Configuration

### Environment Variables
- `REACT_APP_FTP_SERVER_URL`: FTP image server URL (default: http://localhost:3003)

### FTP Server Configuration
Edit `ftp-server/server.js` to modify:
- FTP host, port, credentials
- Server port
- CORS settings
- Cache settings

## 📊 Monitoring

The server provides detailed logging:
- ✅ Successful operations
- ❌ Errors with troubleshooting tips
- 📊 Performance metrics (download times, file sizes)
- 🔍 Debug information

## 🚀 Production Deployment

For production deployment:

1. **Update Configuration**:
   ```javascript
   const FTP_CONFIG = {
     host: 'your-ftp-server.com',
     port: 21,
     user: 'your-username',
     password: 'your-password'
   };
   ```

2. **Environment Variables**:
   ```bash
   export REACT_APP_FTP_SERVER_URL=http://your-server:3003
   ```

3. **Process Management**:
   ```bash
   # Using PM2
   pm2 start server.js --name ftp-image-server
   
   # Using systemd
   sudo systemctl enable ftp-image-server
   sudo systemctl start ftp-image-server
   ```

4. **Reverse Proxy** (optional):
   Configure nginx or Apache to proxy requests to the FTP image server.

## 📝 Notes

- Images are cached for 1 hour to improve performance
- The server handles multiple concurrent requests efficiently
- Automatic reconnection on FTP connection loss
- Graceful fallback to mock data when FTP is unavailable
