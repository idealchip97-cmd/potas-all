/**
 * Centralized FTP Configuration (TypeScript)
 * 
 * This file contains all FTP server credentials, IP addresses, and paths.
 * When you need to change FTP settings, edit ONLY this file.
 */

// FTP Server Configuration
export const FTP_SERVER = {
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
} as const;

// Camera Configuration
export const CAMERA_CONFIG = {
  // Primary camera IP
  defaultCamera: '192.168.1.54',
  // Camera folder structure
  cameraFolder: 'camera001/192.168.1.54',
  // Base camera path (without IP)
  cameraBasePath: 'camera001'
} as const;

// Path Configuration
export const PATHS = {
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
} as const;

// Server Configuration
export const SERVERS = {
  // Backend API server
  backend: {
    url: 'http://localhost:3000/api',
    port: 3000
  },
  
  // Local image server
  imageServer: {
    url: process.env.REACT_APP_FTP_SERVER_URL || 'http://localhost:3003',
    port: 3003
  },
  
  // React development server
  frontend: {
    port: 3002, // Current port after restart
    proxyTarget: 'http://localhost:3003'
  }
} as const;

// Helper functions
export const buildImageUrl = (camera: string, date: string, filename: string): string => {
  return PATHS.imageUrlPattern
    .replace('{camera}', camera)
    .replace('{date}', date)
    .replace('{filename}', filename);
};

export const buildListApiUrl = (camera: string, date: string): string => {
  return PATHS.listApiPattern
    .replace('{camera}', camera)
    .replace('{date}', date);
};

export const buildDatesApiUrl = (camera: string): string => {
  return PATHS.datesApiPattern
    .replace('{camera}', camera);
};

// Get local path for camera and date
export const getLocalPath = (camera: string, date: string): string => {
  return `${PATHS.localCameraBase}/${camera}/${date}/Common`;
};

// Get FTP path for camera and date
export const getFtpPath = (camera: string, date: string): string => {
  return `${PATHS.ftpCameraPath}/${camera}/${date}/Common`;
};

// Default export for convenience
export default {
  FTP_SERVER,
  CAMERA_CONFIG,
  PATHS,
  SERVERS,
  buildImageUrl,
  buildListApiUrl,
  buildDatesApiUrl,
  getLocalPath,
  getFtpPath
};
