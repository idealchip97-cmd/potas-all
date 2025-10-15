# 🚀 Radar System Startup Guide

## Quick Start (Every Time You Boot Your PC)

1. **Start XAMPP MySQL** (if not auto-started):
   ```bash
   sudo /opt/lampp/lampp start mysql
   ```

2. **Start All Services**:
   ```bash
   cd /home/rnd2/Desktop/radar_system_clean
   ./start-all.sh
   ```

3. **Access Main Dashboard**:
   - Open browser: http://localhost:3000
   - Login page will appear first
   - After login, you'll see the Speed Violation Monitor

## 🔧 Automatic Fixes Applied

The system now includes automatic fixes for:
- ✅ Database connection issues
- ✅ FTP server endpoint corrections  
- ✅ Camera discovery and case loading
- ✅ Service startup verification

## 📱 Important URLs

- **Main Dashboard**: http://localhost:3000 (Login first)
- **Backend API**: http://localhost:3001
- **Image Server**: http://localhost:3003
- **AI Results**: http://localhost:3004
- **Plate Recognition**: http://localhost:36555

## 🛠️ If Issues Occur

1. **Run verification script**:
   ```bash
   ./verify-and-fix-startup.sh
   ```

2. **Check service status**:
   ```bash
   lsof -i :3000  # Frontend
   lsof -i :3001  # Backend  
   lsof -i :3003  # Image Server
   ```

3. **Restart specific service**:
   ```bash
   # Stop all first
   ./stop-all.sh
   
   # Then start all
   ./start-all.sh
   ```

## 🎯 Main Page Features

The Speed Violation Monitor page now automatically:
- Connects to AI FTP server
- Loads available cameras (camera001, camera002)
- Shows violation cases with images
- Displays real-time connection status
- Updates data automatically

## 📊 Database

- **Type**: MySQL (via XAMPP)
- **Database**: potassium_backend
- **Access**: phpMyAdmin at http://127.0.0.1/phpmyadmin/

---
*This guide ensures the radar system works perfectly every time you start your PC!*
