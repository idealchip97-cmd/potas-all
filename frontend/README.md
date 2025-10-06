# 🚀 Potassium Factory Radar System

## 📁 Clean Project Structure

```
/home/rnd2/Desktop/radar_sys/
├── 🎨 potassium-frontend/          # React frontend application
├── 🖥️ potassium-backend-/          # Node.js backend services  
├── ⚙️ ftp-config.js               # Master FTP configuration
├── 📚 docs/                       # All documentation files
├── 🔧 system/                     # System scripts and services
├── 📋 config/                     # Configuration files
└── 📜 scripts/                    # Integration scripts
```

## 🎯 Key Directories

### 🎨 Frontend (`potassium-frontend/`)
- React application on port 3002
- Fines Images Monitor
- Radar Info Monitor  
- Real-time dashboards

### 🖥️ Backend (`potassium-backend-/`)
- Node.js services
- FTP image server
- UDP radar server
- Database models and APIs

### ⚙️ Master Configuration (`ftp-config.js`)
**SINGLE SOURCE OF TRUTH** for all FTP settings:
- FTP server credentials
- Camera IPs and paths
- Server configurations

## 🔧 Quick Start

### Start All Services
```bash
# Start backend services
cd potassium-backend-/
npm start

# Start frontend (new terminal)
cd potassium-frontend/
npm start

# Start image server (new terminal)
cd potassium-backend-/services/
sudo node local-image-server.js
```

### Access Applications
- **Frontend**: http://localhost:3002
- **Fines Images Monitor**: http://localhost:3002/fines-images-monitor
- **Radar Info Monitor**: http://localhost:3002/radar-info-monitor
- **Image Server**: http://localhost:3003

## 📝 Configuration Management

**To change FTP settings, edit ONLY:**
```
/home/rnd2/Desktop/radar_sys/ftp-config.js
```

All other files automatically inherit these settings.

## 📚 Documentation

All documentation moved to `docs/` directory:
- Setup guides
- Troubleshooting
- System status reports
- Integration documentation

## 🔧 System Files

System scripts and services in `system/` directory:
- Service files (*.service)
- Shell scripts (*.sh)
- System configurations

## 🎯 Current Status

✅ **Project Structure**: Clean and organized  
✅ **FTP Configuration**: Centralized  
✅ **Image Server**: Running on port 3003  
✅ **Frontend**: Running on port 3002 with proxy  
✅ **Backend**: Services organized  
✅ **Documentation**: Organized in docs/  

## 🚀 Next Steps

1. **Test all services** with new structure
2. **Update any hardcoded paths** in scripts
3. **Use centralized FTP config** for all changes
4. **Deploy with clean structure**
