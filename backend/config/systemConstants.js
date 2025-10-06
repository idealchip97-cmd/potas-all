/**
 * System Constants Configuration
 * 
 * Centralized configuration file for all system constants, credentials, and settings.
 * This file makes it easy to update FTP credentials, IP addresses, and other settings
 * without searching through multiple files.
 * 
 * Author: Eng. Bashar Zabadani
 * Last Updated: 2025-09-30
 */

require('dotenv').config();

// =============================================================================
// FTP CONFIGURATION
// =============================================================================
const FTP_CONFIG = {
    // Primary FTP Server (Camera System)
    PRIMARY: {
        HOST: process.env.FTP_HOST || '192.186.1.55',
        PORT: parseInt(process.env.FTP_PORT || '21', 10),
        USER: process.env.FTP_USER || 'camera001',
        PASSWORD: process.env.FTP_PASSWORD || 'RadarCamera001',
        
        // Connection Settings
        CONN_TIMEOUT: 60000,
        PASV_TIMEOUT: 60000,
        KEEPALIVE: 60000,
        
        // Remote Paths
        REMOTE_BASE_PATH: '/camera001',
        REMOTE_IMAGE_PATH: '/camera001/192.168.1.54',
        
        // Local Download Directory
        LOCAL_DOWNLOAD_DIR: process.env.IMAGE_BASE_DIR || '/srv/camera_uploads'
    },
    
    // Backup FTP Server (Optional)
    BACKUP: {
        HOST: process.env.FTP_BACKUP_HOST || '192.186.1.56',
        PORT: parseInt(process.env.FTP_BACKUP_PORT || '21', 10),
        USER: process.env.FTP_BACKUP_USER || 'camera001',
        PASSWORD: process.env.FTP_BACKUP_PASSWORD || 'RadarCamera001'
    }
};

// =============================================================================
// RADAR SYSTEM CONFIGURATION
// =============================================================================
const RADAR_CONFIG = {
    // Radar Server Settings
    SERVER: {
        HOST: process.env.RADAR_SERVER_IP || '192.168.1.14',
        UDP_PORT: parseInt(process.env.UDP_PORT || '17081', 10),
        FTP_PORT: parseInt(process.env.RADAR_FTP_PORT || '21', 10)
    },
    
    // Speed Detection Settings
    SPEED: {
        DEFAULT_LIMIT: parseInt(process.env.SPEED_LIMIT || '30', 10), // km/h
        VIOLATION_THRESHOLD: parseInt(process.env.VIOLATION_THRESHOLD || '5', 10), // km/h over limit
        MAX_RECORDABLE_SPEED: 200 // km/h
    },
    
    // Fine Calculation
    FINES: {
        // Fine amounts based on speed excess (km/h over limit)
        TIER_1: { MAX_EXCESS: 10, AMOUNT: 50 },   // 1-10 km/h over
        TIER_2: { MAX_EXCESS: 20, AMOUNT: 100 },  // 11-20 km/h over
        TIER_3: { MAX_EXCESS: 30, AMOUNT: 200 },  // 21-30 km/h over
        TIER_4: { MAX_EXCESS: 999, AMOUNT: 300 }, // 30+ km/h over
        
        CURRENCY: 'USD',
        TAX_RATE: 0.0 // No tax by default
    }
};

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================
const DATABASE_CONFIG = {
    MYSQL: {
        HOST: process.env.DB_HOST || 'localhost',
        PORT: parseInt(process.env.DB_PORT || '3306', 10),
        DATABASE: process.env.DB_NAME || 'potassium_backend',
        USERNAME: process.env.DB_USER || 'root',
        PASSWORD: process.env.DB_PASSWORD || '',
        
        // Connection Pool Settings
        POOL: {
            MAX: 10,
            MIN: 0,
            ACQUIRE: 30000,
            IDLE: 10000
        },
        
        // Character Set
        CHARSET: 'utf8mb4',
        COLLATE: 'utf8mb4_unicode_ci',
        TIMEZONE: '+03:00'
    }
};

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================
const SERVER_CONFIG = {
    // Main API Server
    API: {
        PORT: parseInt(process.env.PORT || '3000', 10),
        HOST: process.env.SERVER_HOST || 'localhost',
        ENVIRONMENT: process.env.NODE_ENV || 'development'
    },
    
    // Frontend Server
    FRONTEND: {
        PORT: parseInt(process.env.FRONTEND_PORT || '3001', 10),
        URL: process.env.FRONTEND_URL || 'http://localhost:3001'
    },
    
    // Local Image Server
    IMAGE_SERVER: {
        PORT: parseInt(process.env.IMAGE_SERVER_PORT || '3003', 10),
        BASE_DIR: process.env.IMAGE_BASE_DIR || '/srv/camera_uploads',
        ACCESS_PASSWORD: process.env.LOCAL_ACCESS_PASSWORD || 'idealchip123'
    },
    
    // WebSocket Configuration
    WEBSOCKET: {
        PORT: parseInt(process.env.WS_PORT || '18081', 10),
        HEARTBEAT_INTERVAL: 30000
    }
};

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================
const SECURITY_CONFIG = {
    // JWT Settings
    JWT: {
        SECRET: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
        EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
        ALGORITHM: 'HS256'
    },
    
    // Rate Limiting
    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100,
        SKIP_SUCCESSFUL_REQUESTS: false
    },
    
    // CORS Settings
    CORS: {
        ORIGIN: process.env.CORS_ORIGIN || '*',
        CREDENTIALS: true,
        METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    }
};

// =============================================================================
// AI SERVICES CONFIGURATION
// =============================================================================
const AI_CONFIG = {
    // OpenAI Configuration
    OPENAI: {
        API_KEY: process.env.OPENAI_API_KEY || '',
        MODEL: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
        MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
        TIMEOUT: parseInt(process.env.CHATGPT_TIMEOUT || '30000', 10)
    },
    
    // Tesseract OCR Configuration
    TESSERACT: {
        LANGUAGE: process.env.TESSERACT_LANG || 'eng',
        TIMEOUT: parseInt(process.env.TESSERACT_TIMEOUT || '30000', 10),
        PSM: 8, // Page Segmentation Mode
        OEM: 3  // OCR Engine Mode
    },
    
    // Plate Recognition Settings
    PLATE_RECOGNITION: {
        ENGINE: process.env.PLATE_RECOGNITION_ENGINE || 'enhanced',
        FALLBACK_TO_MOCK: process.env.FALLBACK_TO_MOCK === 'true',
        CONFIDENCE_THRESHOLD: 0.7,
        MAX_PROCESSING_TIME: 60000
    }
};

// =============================================================================
// MONITORING & LOGGING CONFIGURATION
// =============================================================================
const MONITORING_CONFIG = {
    // Health Check Settings
    HEALTH_CHECK: {
        INTERVAL: 60000, // 1 minute
        TIMEOUT: 5000,   // 5 seconds
        RETRIES: 3
    },
    
    // Statistics Collection
    STATS: {
        COLLECTION_INTERVAL: 30000, // 30 seconds
        RETENTION_DAYS: 30,
        CLEANUP_INTERVAL: 24 * 60 * 60 * 1000 // 24 hours
    },
    
    // Logging Configuration
    LOGGING: {
        LEVEL: process.env.LOG_LEVEL || 'info',
        FILE_PATH: process.env.LOG_FILE_PATH || './logs',
        MAX_FILE_SIZE: '10MB',
        MAX_FILES: 5
    }
};

// =============================================================================
// SYSTEM PATHS CONFIGURATION
// =============================================================================
const PATHS_CONFIG = {
    // Base Directories
    BASE: {
        ROOT: '/home/rnd2/Desktop/radar_sys',
        BACKEND: '/home/rnd2/Desktop/radar_sys/potassium-backend-',
        FRONTEND: '/home/rnd2/Desktop/radar_sys/potassium-frontend',
        IMAGES: process.env.IMAGE_BASE_DIR || '/srv/camera_uploads'
    },
    
    // Image Paths
    IMAGES: {
        CAMERA_BASE: '/srv/camera_uploads/camera001',
        CAMERA_IP_BASE: '/srv/camera_uploads/camera001/192.168.1.54',
        UPLOAD_DIR: './uploads',
        TEMP_DIR: './temp'
    },
    
    // Service Files
    SERVICES: {
        SYSTEMD_DIR: '/etc/systemd/system',
        LOG_DIR: '/var/log',
        PID_DIR: '/var/run'
    }
};

// =============================================================================
// CORRELATION SYSTEM CONFIGURATION
// =============================================================================
const CORRELATION_CONFIG = {
    // Time Windows
    TIME_WINDOWS: {
        RADAR_IMAGE_CORRELATION: 2000,  // 2 seconds
        VIOLATION_PROCESSING: 5000,     // 5 seconds
        DUPLICATE_PREVENTION: 10000     // 10 seconds
    },
    
    // Processing Settings
    PROCESSING: {
        MAX_CONCURRENT_CORRELATIONS: 5,
        BATCH_SIZE: 10,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    }
};

// =============================================================================
// EXPORT CONFIGURATION OBJECT
// =============================================================================
const SYSTEM_CONSTANTS = {
    FTP: FTP_CONFIG,
    RADAR: RADAR_CONFIG,
    DATABASE: DATABASE_CONFIG,
    SERVER: SERVER_CONFIG,
    SECURITY: SECURITY_CONFIG,
    AI: AI_CONFIG,
    MONITORING: MONITORING_CONFIG,
    PATHS: PATHS_CONFIG,
    CORRELATION: CORRELATION_CONFIG,
    
    // Version Information
    VERSION: {
        SYSTEM: '2.0.0',
        API: '1.5.0',
        DATABASE_SCHEMA: '1.2.0',
        LAST_UPDATED: '2025-09-30T18:15:00Z'
    }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get FTP configuration for primary server
 * @returns {Object} FTP configuration object
 */
function getFtpConfig() {
    return SYSTEM_CONSTANTS.FTP.PRIMARY;
}

/**
 * Get radar server configuration
 * @returns {Object} Radar configuration object
 */
function getRadarConfig() {
    return SYSTEM_CONSTANTS.RADAR.SERVER;
}

/**
 * Calculate fine amount based on speed excess
 * @param {number} speedExcess - Speed over the limit in km/h
 * @returns {number} Fine amount
 */
function calculateFineAmount(speedExcess) {
    const fines = SYSTEM_CONSTANTS.RADAR.FINES;
    
    if (speedExcess <= fines.TIER_1.MAX_EXCESS) return fines.TIER_1.AMOUNT;
    if (speedExcess <= fines.TIER_2.MAX_EXCESS) return fines.TIER_2.AMOUNT;
    if (speedExcess <= fines.TIER_3.MAX_EXCESS) return fines.TIER_3.AMOUNT;
    return fines.TIER_4.AMOUNT;
}

/**
 * Get database connection configuration
 * @returns {Object} Database configuration object
 */
function getDatabaseConfig() {
    return SYSTEM_CONSTANTS.DATABASE.MYSQL;
}

/**
 * Validate configuration completeness
 * @returns {Object} Validation result
 */
function validateConfiguration() {
    const issues = [];
    
    // Check critical FTP settings
    if (!SYSTEM_CONSTANTS.FTP.PRIMARY.HOST) {
        issues.push('FTP_HOST is not configured');
    }
    
    // Check database settings
    if (!SYSTEM_CONSTANTS.DATABASE.MYSQL.PASSWORD && 
        SYSTEM_CONSTANTS.SERVER.API.ENVIRONMENT === 'production') {
        issues.push('Database password should be set in production');
    }
    
    // Check JWT secret
    if (SYSTEM_CONSTANTS.SECURITY.JWT.SECRET === 'default_jwt_secret_change_in_production') {
        issues.push('JWT secret should be changed from default');
    }
    
    return {
        valid: issues.length === 0,
        issues: issues
    };
}

// Export the configuration and helper functions
module.exports = {
    SYSTEM_CONSTANTS,
    getFtpConfig,
    getRadarConfig,
    calculateFineAmount,
    getDatabaseConfig,
    validateConfiguration
};
