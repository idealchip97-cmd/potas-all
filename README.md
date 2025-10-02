# 🚀 Potassium Factory Radar Speed Detection System

Complete radar-based speed detection and fine management system with camera integration.

## 🎯 System Overview

This is a comprehensive radar speed detection system that:
- 📡 **Captures radar data** via UDP from serial bridge
- 📸 **Correlates with camera images** from FTP server
- ⚡ **Processes violations** in real-time
- 💰 **Generates fines** automatically
- 📊 **Provides monitoring dashboards** for operators

## 📁 Project Structure

```
/home/rnd2/Desktop/radar_sys/
├── 🎨 potassium-frontend/          # React frontend application
├── 🖥️ potassium-backend-/          # Node.js backend services  
├── ⚙️ ftp-config.js               # Master FTP configuration (EDIT THIS)
├── 📚 docs/                       # All documentation files
├── 🔧 system/                     # System scripts and services
├── 📋 config/                     # Configuration files
├── 📜 scripts/                    # Integration scripts
└── 🌍 .env                        # Environment variables
```

## 🚀 Quick Setup (New PC)

### 1. Clone Repository
```bash
git clone https://github.com/basharagb/potassium-frontend.git
cd potassium-frontend
```

### 2. Install Dependencies
```bash
# Backend dependencies
cd potassium-backend-/
npm install

# Frontend dependencies  
cd ../potassium-frontend/
npm install

# Root dependencies (if any)
cd ..
npm install
```

### 3. Configure Environment
```bash
# Copy and edit environment file
cp .env.example .env
# Edit .env with your specific settings
```

### 4. Configure FTP Settings
**Edit the master configuration file:**
```bash
nano ftp-config.js
```
Update:
- FTP server IP and credentials
- Camera IP addresses
- Local paths

### 5. Setup Database (MySQL)
```bash
cd potassium-backend-/
# Run database migrations
npm run migrate
# Seed initial data
npm run seed
```

## 🔧 Running the System

### Start All Services
```bash
# Terminal 1: Backend API Server
cd potassium-backend-/
npm start

# Terminal 2: Frontend React App
cd potassium-frontend/
npm start

# Terminal 3: Local Image Server
cd potassium-backend-/services/
sudo node local-image-server.js

# Terminal 4: UDP Radar Server
cd potassium-backend-/services/
node radar-udp-server.js

# Terminal 5: Serial to UDP Bridge (if using serial radar)
cd potassium-backend-/services/
node serial-to-udp-bridge.js
```

### Access Applications
- **🎨 Frontend Dashboard**: http://localhost:3002
- **📸 Fines Images Monitor**: http://localhost:3002/fines-images-monitor
- **📡 Radar Info Monitor**: http://localhost:3002/radar-info-monitor
- **🖼️ Image Server API**: http://localhost:3003
- **🔧 Backend API**: http://localhost:3000

## ⚙️ System Components

### 🎨 Frontend (`potassium-frontend/`)
- **React application** with Material-UI
- **Real-time dashboards** for monitoring
- **Fines management** interface
- **Image viewing** and correlation
- **Radar data visualization**

### 🖥️ Backend (`potassium-backend-/`)
- **Express.js API server** (port 3000)
- **MySQL database** integration
- **Authentication** and user management
- **Fine processing** logic
- **Report generation**

### 📡 Services (`potassium-backend-/services/`)
- **`local-image-server.js`**: Serves camera images (port 3003)
- **`radar-udp-server.js`**: Receives radar data via UDP (port 17081)
- **`serial-to-udp-bridge.js`**: Converts serial radar data to UDP
- **`ftp-image-server.js`**: FTP image processing

### 🗄️ Database Schema
- **`radars`**: Radar station configuration
- **`fines`**: Generated fines and violations
- **`radar_readings`**: All radar detections (persistent)
- **`users`**: System users and authentication

## 🔧 Configuration Management

### 🎯 Master FTP Configuration
**Edit ONLY this file for all FTP settings:**
```
/ftp-config.js
```

Contains:
- FTP server credentials
- Camera IP addresses  
- File paths and directory structure
- Server port configurations

### 🌍 Environment Variables (`.env`)
```bash
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=potassium_backend

# FTP Server
FTP_HOST=192.168.1.55
FTP_USER=camera001
FTP_PASSWORD=RadarCamera01

# Camera
CAMERA_IP=192.168.1.54
CAMERA_PATH=/srv/camera_uploads/camera001/192.168.1.54

# Ports
FRONTEND_PORT=3002
BACKEND_PORT=3000
IMAGE_SERVER_PORT=3003
UDP_PORT=17081
```

## 📊 System Workflow

1. **📡 Radar Detection**: Speed sensor sends data via serial/UDP
2. **📸 Image Capture**: Camera captures images to FTP server
3. **🔗 Correlation**: System matches radar data with images (±2 seconds)
4. **⚖️ Violation Check**: Speed > limit triggers violation
5. **💰 Fine Generation**: Automatic fine creation with evidence
6. **📱 Real-time Display**: Dashboards show live data
7. **📋 Reports**: Generate violation and compliance reports

## 🛠️ Development

### Adding New Features
1. **Backend**: Add routes in `potassium-backend-/routes/`
2. **Frontend**: Add components in `potassium-frontend/src/`
3. **Database**: Add migrations in `potassium-backend-/migrations/`

### Testing
```bash
# Backend tests
cd potassium-backend-/
npm test

# Frontend tests  
cd potassium-frontend/
npm test
```

## 📚 Documentation

Comprehensive documentation in `docs/` directory:
- **Setup guides**: Installation and configuration
- **API documentation**: Backend endpoints
- **Troubleshooting**: Common issues and solutions
- **System reports**: Status and performance
- **Integration guides**: Hardware setup

## 🔧 System Requirements

### Hardware
- **Radar sensor**: Serial or UDP output
- **Camera**: FTP-enabled with timestamp
- **Server**: Linux (Ubuntu recommended)
- **Network**: LAN access to camera and radar

### Software
- **Node.js**: 16+ 
- **MySQL**: 8.0+
- **Linux**: For `/srv/` camera access
- **Git**: For deployment

## 🚨 Troubleshooting

### Common Issues

**Image Server Connection Failed:**
```bash
# Check if server is running
sudo node potassium-backend-/services/local-image-server.js

# Check permissions
sudo chmod -R 755 /srv/camera_uploads/
```

**Radar Data Not Received:**
```bash
# Check UDP port
sudo netstat -tulpn | grep 17081

# Test UDP connection
echo "ID: 1,Speed: 55, Time: 10:30:00." | nc -u localhost 17081
```

**Database Connection Failed:**
```bash
# Check MySQL service
sudo systemctl status mysql

# Test connection
mysql -u root -p potassium_backend
```

## 📞 Support

- **Documentation**: `docs/` directory
- **Issues**: GitHub repository issues
- **Configuration**: `ftp-config.js` (master config)

## 🎯 Current Status

✅ **Project Structure**: Clean and organized  
✅ **FTP Configuration**: Centralized in `ftp-config.js`  
✅ **Image Server**: Serving from `/srv/camera_uploads/`  
✅ **Frontend**: React app with proxy to image server  
✅ **Backend**: API server with MySQL integration  
✅ **Radar System**: UDP server with persistent storage  
✅ **Camera Correlation**: 2-second time window matching  
✅ **Real-time Monitoring**: Live dashboards and updates  

**System is ready for deployment and operation!** 🚀
