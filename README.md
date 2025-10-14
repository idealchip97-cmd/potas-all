# Radar Speed Detection System - Potassium Factory

## Overview
A comprehensive radar-based speed detection system with a web interface for monitoring violations and managing data. The system is specifically designed for the Potassium Factory to monitor vehicle speeds and record violations.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/basharagb/potassium-frontend.git
cd potassium-frontend

# Install dependencies and start all services
chmod +x start-all.sh
./start-all.sh
```

**Access the system**: http://localhost:3000

## 📋 System Requirements

### Hardware Requirements
- **OS**: Ubuntu 20.04+ or any Linux distribution
- **Node.js**: Version 18.0.0 or newer
- **MySQL**: Version 8.0 or newer
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 10GB minimum
- **Network**: Ethernet connection for camera integration

### Software Dependencies
- Git (for cloning the project)
- curl (for API testing)
- PM2 (optional, for production deployment)

## 🛠️ Installation Guide

### 1. System Prerequisites

#### Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### Install Node.js & npm
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Install MySQL
```bash
# Install MySQL Server
sudo apt install mysql-server -y

# Secure MySQL installation
sudo mysql_secure_installation

# Login to MySQL
sudo mysql -u root -p
```

#### Create Database
```sql
-- In MySQL shell
CREATE DATABASE potassium_backend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'root'@'localhost' IDENTIFIED BY 'RootPass2025';
GRANT ALL PRIVILEGES ON potassium_backend.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Project Installation

#### Clone Repository
```bash
git clone https://github.com/basharagb/potassium-frontend.git
cd potassium-frontend
```

#### Install Dependencies

**Backend Dependencies:**
```bash
cd backend
npm install
cd ..
```

**Frontend Dependencies:**
```bash
cd frontend
npm install
cd ..
```

#### Database Setup
```bash
# Import database structure
mysql -u root -p potassium_backend < backend/potassium_backend.sql

# Run seeders (create test data)
cd backend
npm run seed
cd ..
```

#### Create Required Directories
```bash
# Create system directories
sudo mkdir -p /srv/processing_inbox
sudo mkdir -p /srv/camera_uploads
sudo chown -R $USER:$USER /srv/processing_inbox
sudo chown -R $USER:$USER /srv/camera_uploads

# Create test data for demonstration
mkdir -p /srv/processing_inbox/camera001/2025-10-06/case001
mkdir -p /srv/processing_inbox/camera002/2025-10-06/case001
mkdir -p /srv/processing_inbox/camera002/2025-10-06/case002
```

## 🚀 Running the System

### Method 1: Automated Start (Recommended)
```bash
# Make scripts executable
chmod +x start-all.sh stop-all.sh

# Start all services
./start-all.sh
```

### Method 2: Manual Start

#### Start Backend Server
```bash
cd backend
npm start
# Runs on port 3001
```

#### Start Image Server
```bash
# In new terminal
cd frontend
node local-image-server.js
# Runs on port 3003
```

#### Start Frontend
```bash
# In new terminal
cd frontend
npm start
# Runs on port 3000
```

## 🌐 System Access

### Access URLs
- **Main Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Image Server**: http://localhost:3003

### Test Login Credentials
```
Administrator:
Email: admin@potasfactory.com
Password: admin123

Operator:
Email: operator@potasfactory.com
Password: operator123

Viewer:
Email: viewer@potasfactory.com
Password: viewer123
```

## 📁 Project Structure

```
radar_system_clean/
├── backend/                    # Backend server
│   ├── config/                # Database configuration
│   ├── controllers/           # Business logic controllers
│   ├── models/               # Database models
│   ├── routes/               # API routes
│   ├── seeders/              # Test data seeders
│   ├── services/             # Business services
│   ├── .env                  # Environment variables
│   ├── server.js             # Main server file
│   └── package.json          # Node.js dependencies
│
├── frontend/                  # Frontend application
│   ├── src/                  # React source code
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── utils/           # Utility functions
│   ├── public/              # Static files
│   ├── local-image-server.js # Image processing server
│   └── package.json         # React dependencies
│
├── start-all.sh              # Start all services script
├── stop-all.sh               # Stop all services script
├── install.sh                # Installation script
└── README.md                 # This documentation
```

## ✨ Key Features

### 1. Real-time Violation Monitoring
- **Multi-camera Support**: Monitor violations from multiple radar cameras (camera001, camera002, etc.)
- **Live Dashboard**: Real-time updates of speed violations
- **Multi-photo System**: 4-9 photos per violation case for comprehensive evidence
- **Speed Analysis**: Detailed speed measurements with timestamps
- **Date-based Filtering**: View violations by specific dates or date ranges

### 2. User Management & Security
- **Role-based Access Control**: Three permission levels (Admin, Operator, Viewer)
- **JWT Authentication**: Secure token-based authentication
- **Audit Logging**: Track all user actions and system events
- **Session Management**: Automatic logout and session timeout

### 3. Data Analytics & Reporting
- **Violation Statistics**: Real-time statistics and trends
- **Daily/Monthly Reports**: Comprehensive reporting system
- **Interactive Charts**: Visual data representation
- **Export Functionality**: Export data in various formats

### 4. Image Processing System
- **Automatic Image Reception**: FTP-based image receiving from cameras
- **Image Classification**: Automatic sorting and categorization
- **Secure Storage**: Encrypted storage with backup capabilities
- **Multi-format Support**: Support for various image formats

### 5. API Integration
- **RESTful API**: Complete REST API for external integrations
- **Real-time Updates**: WebSocket support for live updates
- **Camera Discovery**: Automatic detection of available cameras
- **Date Discovery**: Dynamic date range detection

## 🔧 API Endpoints

### Authentication
```
POST /api/auth/signin          # User login
POST /api/auth/signout         # User logout
GET  /api/auth/verify          # Verify token
```

### Violations
```
GET  /api/violations/:cameraId/:date                    # Get violations
GET  /api/violations/:cameraId/:date/:eventId          # Get specific violation
GET  /api/violations/:cameraId/:date/:eventId/:photo   # Get violation photo
GET  /api/violations/stats/:date                       # Get violation statistics
```

### Discovery
```
GET  /api/discover/cameras     # Get available cameras
GET  /api/discover/dates       # Get available dates
```

### Health Check
```
GET  /health                   # System health status
```

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Database Connection Error
```bash
# Check MySQL status
sudo systemctl status mysql

# Restart MySQL
sudo systemctl restart mysql

# Check connection settings
cat backend/.env
```

#### 2. Port Already in Use
```bash
# Check which processes are using ports
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :3003

# Kill processes
sudo kill -9 [PID]

# Or use the stop script
./stop-all.sh
```

#### 3. Permission Issues
```bash
# Fix directory permissions
sudo chown -R $USER:$USER /srv/processing_inbox
sudo chown -R $USER:$USER /srv/camera_uploads
sudo chmod -R 755 /srv/processing_inbox
sudo chmod -R 755 /srv/camera_uploads
```

#### 4. Node.js Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 5. Frontend Connection Issues
```bash
# Check if all servers are running
ps aux | grep node

# Test API endpoints
curl http://localhost:3001/health
curl http://localhost:3003/health

# Check browser console for errors
```

## 🛑 Stopping the System

### Automated Stop
```bash
./stop-all.sh
```

### Manual Stop
```bash
# Stop all Node.js processes
pkill -f node

# Or stop each service individually
# Use Ctrl+C in each terminal
```

## 🔄 Maintenance & Backup

### Database Backup
```bash
# Create backup
mysqldump -u root -p potassium_backend > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u root -p potassium_backend < backup_file.sql
```

### Log Cleanup
```bash
# Remove old logs
rm -f *.log

# Keep only last 7 days
find . -name "*.log" -mtime +7 -delete
```

### System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd backend && npm update
cd ../frontend && npm update
```

## 📊 Monitoring & Logs

### Log Files
- `backend_server.log` - Backend server logs
- `ftp_image_server.log` - Image server logs  
- `frontend_dashboard.log` - Frontend application logs

### System Monitoring
```bash
# Check system resources
htop
df -h
free -m

# Monitor logs in real-time
tail -f backend_server.log
tail -f ftp_image_server.log
```

## 🚀 Production Deployment

### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start services with PM2
pm2 start backend/server.js --name "radar-backend"
pm2 start frontend/local-image-server.js --name "radar-image-server"

# Monitor services
pm2 status
pm2 logs

# Auto-start on system boot
pm2 startup
pm2 save
```

### Environment Configuration
```bash
# Production environment variables
cp backend/.env.example backend/.env.production

# Edit production settings
nano backend/.env.production
```

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Change default passwords
- [ ] Configure firewall rules
- [ ] Enable HTTPS/SSL
- [ ] Set up regular backups
- [ ] Monitor system logs
- [ ] Update dependencies regularly
- [ ] Configure rate limiting
- [ ] Set up intrusion detection

### Firewall Configuration
```bash
# Allow required ports
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 3001/tcp  # Backend API
sudo ufw allow 3003/tcp  # Image Server

# Enable firewall
sudo ufw enable
```

## 📞 Support & Contact

### System Information
- **Developer**: Jarvis AI Assistant
- **Version**: 2.0.0
- **License**: MIT
- **Last Updated**: October 2025

### Getting Help
1. Check the troubleshooting section
2. Review log files for error messages
3. Verify all services are running
4. Check system requirements
5. Consult the API documentation

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 Changelog

### Version 2.0.0 (October 2025)
- ✅ Fixed connection issues with local image server
- ✅ Improved multi-camera support
- ✅ Enhanced violation detection system
- ✅ Added comprehensive API documentation
- ✅ Implemented proper error handling
- ✅ Updated authentication system
- ✅ Added real-time monitoring capabilities

### Version 1.0.0 (Initial Release)
- Basic radar speed detection
- Web interface for monitoring
- Database integration
- User authentication

---

## 🎯 Important Notes

1. **Security**: Always change default passwords in production
2. **Network**: Ensure required ports are open in firewall
3. **Backup**: Perform regular database backups
4. **Monitoring**: Monitor log files regularly for system health
5. **Updates**: Keep system and dependencies updated

**This documentation was created in October 2025 - Radar Speed Detection System for Potassium Factory**

---

## 🏁 Quick Reference

### Start System
```bash
./start-all.sh
```

### Stop System  
```bash
./stop-all.sh
```

### Access Dashboard
```
http://localhost:3000
```

### Test Login
```
admin@potasfactory.com / admin123
```

### Check Status
```bash
curl http://localhost:3001/health
curl http://localhost:3003/health
```
