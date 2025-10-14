/**
 * 🔧 CENTRALIZED FTP CONFIGURATION - SINGLE SOURCE OF TRUTH
 * 
 * This file contains ALL FTP server credentials, IP addresses, and paths.
 * When you need to change FTP settings, edit ONLY this file.
 * 
 * 📁 Project Structure:
 * ├── /ftp-config.js (THIS FILE - Master config)
 * ├── /potassium-backend-/config/ftpConfig.js (imports from this file)
 * └── /potassium-frontend/src/config/ftpConfig.ts (TypeScript version)
 * 
 * Usage: 
 *   const FTP_CONFIG = require('./ftp-config.js');
 *   console.log(FTP_CONFIG.FTP_SERVER.host); // 192.168.1.55
 */

// FTP Server Configuration
const FTP_SERVER = {
  host: '192.168.1.55',
  port: 21,
  // Current working credentials (as of latest tests)
  username: 'camera001',
  password: 'RadarCamera01',
  // Legacy credentials (kept for reference)
  legacy: {
    username: 'admin',
    password: 'idealchip123'
  }
};

// Camera Configuration
const CAMERA_CONFIG = {
  // Primary camera IP
  defaultCamera: '192.168.1.54',
  // Camera folder structure
  cameraFolder: 'camera001/192.168.1.54',
  // Base camera path (without IP)
  cameraBasePath: 'camera001'
};

// Path Configuration
const PATHS = {
  // Local file system paths
  localBasePath: '/srv/camera_uploads/camera001/192.168.1.54',
  localCameraBase: '/srv/camera_uploads/camera001',
  
  // FTP server paths
  ftpBasePath: '/192.168.1.54',
  ftpCameraPath: '/srv/camera_uploads/camera001',
  
  // API URL patterns
  imageUrlPattern: '/api/ftp-images/camera001/{camera}/{date}/Common/{filename}',
  listApiPattern: '/api/ftp-images/list?camera={camera}&date={date}',
  datesApiPattern: '/api/ftp-images/dates?camera={camera}'
};

// Server Configuration
const SERVERS = {
  // Backend API server
  backend: {
    url: 'http://localhost:3000/api',
    port: 3000
  },
  
  // Local image server
  imageServer: {
    url: 'http://localhost:3003',
    port: 3003
  },
  
  // React development server
  frontend: {
    port: 3002, // Current port after restart
    proxyTarget: 'http://localhost:3003'
  }
};

// Export configuration
module.exports = {
  FTP_SERVER,
  CAMERA_CONFIG,
  PATHS,
  SERVERS,
  
  // Helper functions
  buildImageUrl: (camera, date, filename) => {
    return PATHS.imageUrlPattern
      .replace('{camera}', camera)
      .replace('{date}', date)
      .replace('{filename}', filename);
  },
  
  buildListApiUrl: (camera, date) => {
    return PATHS.listApiPattern
      .replace('{camera}', camera)
      .replace('{date}', date);
  },
  
  buildDatesApiUrl: (camera) => {
    return PATHS.datesApiPattern
      .replace('{camera}', camera);
  },
  
  // Get local path for camera and date
  getLocalPath: (camera, date) => {
    return `${PATHS.localCameraBase}/${camera}/${date}/Common`;
  },
  
  // Get FTP path for camera and date
  getFtpPath: (camera, date) => {
    return `${PATHS.ftpCameraPath}/${camera}/${date}/Common`;
  }
};
