# 🚗 Potassium Radar System - Auto-Start Setup

This guide explains how to set up the Potassium Radar System to automatically start when your PC boots up.

## 📋 Quick Setup

### 1. Install Auto-Start Services
```bash
cd /home/rnd2/Desktop/radar_sys
sudo ./install-auto-start.sh
```

### 2. Start Services Now (Optional)
```bash
sudo ./manage-radar-system.sh start
```

## 🎯 What Gets Auto-Started

The system will automatically start these services on boot:

1. **Backend API** (Port 3000)
   - Main radar system API
   - FTP connection to camera server
   - Database connectivity

2. **Frontend Dashboard** (Port 3001)
   - React web interface
   - Real-time monitoring dashboard
   - FTP image viewer

3. **Local Image Server** (Port 3003)
   - Serves camera images from local storage
   - Handles image file access and permissions

## 🔧 Management Commands

Use the management script for easy control:

```bash
# Check status of all services
./manage-radar-system.sh status

# Start all services
sudo ./manage-radar-system.sh start

# Stop all services
sudo ./manage-radar-system.sh stop

# Restart all services
sudo ./manage-radar-system.sh restart

# View live logs
sudo ./manage-radar-system.sh logs

# Enable auto-start on boot
sudo ./manage-radar-system.sh enable

# Disable auto-start on boot
sudo ./manage-radar-system.sh disable
```

## 🌐 Access URLs

After the system starts (automatically or manually):

- **Main Dashboard**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Image Server**: http://localhost:3003

## 🔍 Troubleshooting

### Check Service Status
```bash
sudo systemctl status potassium-backend
sudo systemctl status potassium-frontend
sudo systemctl status potassium-image-server
```

### View Service Logs
```bash
sudo journalctl -u potassium-backend -f
sudo journalctl -u potassium-frontend -f
sudo journalctl -u potassium-image-server -f
```

### Manual Service Control
```bash
# Start individual service
sudo systemctl start potassium-backend

# Stop individual service
sudo systemctl stop potassium-backend

# Restart individual service
sudo systemctl restart potassium-backend
```

### Remove Auto-Start (If Needed)
```bash
sudo systemctl disable potassium-backend
sudo systemctl disable potassium-frontend
sudo systemctl disable potassium-image-server
sudo rm /etc/systemd/system/potassium-*.service
sudo systemctl daemon-reload
```

## ⚙️ Configuration

The services use these environment variables:

### Backend Configuration
- Database: `potassium_backend` on localhost
- FTP Server: `192.168.1.55:21`
- Credentials: `camera001 / RadarCamera01`

### Frontend Configuration
- Port: `3001`
- Backend URL: `http://localhost:3000`

### Image Server Configuration
- Port: `3003`
- Image Path: `/srv/camera_uploads/camera001/192.168.1.54`

## 🔄 Boot Sequence

When your PC starts:

1. **Network** comes online
2. **MySQL** service starts
3. **Backend API** starts (waits for MySQL)
4. **Frontend** starts (waits for Backend)
5. **Image Server** starts
6. **System Ready** - Dashboard accessible at http://localhost:3001

## 📝 Notes

- Services automatically restart if they crash
- Logs are stored in systemd journal
- All services run as user `rnd2`
- Image server has access to `camera001` group for file permissions
- Services wait for network and dependencies before starting

## 🆘 Support

If you encounter issues:

1. Check service status: `./manage-radar-system.sh status`
2. View logs: `sudo ./manage-radar-system.sh logs`
3. Restart services: `sudo ./manage-radar-system.sh restart`
4. Check network connectivity to FTP server: `ping 192.168.1.55`
