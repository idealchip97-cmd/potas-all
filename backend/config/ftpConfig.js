/**
 * Centralized FTP Configuration (Backend)
 * 
 * This file contains all FTP server credentials, IP addresses, and paths.
 * When you need to change FTP settings, edit ONLY this file.
 * 
 * Usage: 
 *   const FTP_CONFIG = require('./config/ftpConfig.js');
 *   console.log(FTP_CONFIG.FTP_SERVER.host); // 192.168.1.55
 */

// Import from root config to maintain single source of truth
const rootConfig = require('../../ftp-config.js');

// Re-export everything from root config
module.exports = rootConfig;
