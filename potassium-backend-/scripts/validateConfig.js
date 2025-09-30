#!/usr/bin/env node

/**
 * Configuration Validation Script
 * 
 * This script validates all system configurations and credentials,
 * helping to identify missing or incorrect settings before deployment.
 * 
 * Usage: node scripts/validateConfig.js
 */

const { validateConfiguration, SYSTEM_CONSTANTS } = require('../config/systemConstants');
const fs = require('fs');
const path = require('path');

console.log('🔍 Potassium Radar System - Configuration Validation');
console.log('====================================================');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateFtpConfig() {
    log('\n📡 FTP Configuration Validation', 'blue');
    log('================================', 'blue');
    
    const ftp = SYSTEM_CONSTANTS.FTP.PRIMARY;
    const issues = [];
    
    // Check required fields
    if (!ftp.HOST || ftp.HOST === 'localhost') {
        issues.push('FTP_HOST should be set to actual FTP server IP');
    } else {
        log(`✅ FTP Host: ${ftp.HOST}`, 'green');
    }
    
    if (!ftp.USER || ftp.USER === 'anonymous') {
        issues.push('FTP_USER should be set to actual username');
    } else {
        log(`✅ FTP User: ${ftp.USER}`, 'green');
    }
    
    if (!ftp.PASSWORD || ftp.PASSWORD === 'anonymous@') {
        issues.push('FTP_PASSWORD should be set to actual password');
    } else {
        log(`✅ FTP Password: ${'*'.repeat(ftp.PASSWORD.length)}`, 'green');
    }
    
    log(`✅ FTP Port: ${ftp.PORT}`, 'green');
    log(`✅ Download Directory: ${ftp.LOCAL_DOWNLOAD_DIR}`, 'green');
    
    // Check if download directory exists
    if (!fs.existsSync(ftp.LOCAL_DOWNLOAD_DIR)) {
        issues.push(`Download directory does not exist: ${ftp.LOCAL_DOWNLOAD_DIR}`);
    }
    
    return issues;
}

function validateRadarConfig() {
    log('\n🎯 Radar Configuration Validation', 'blue');
    log('==================================', 'blue');
    
    const radar = SYSTEM_CONSTANTS.RADAR;
    const issues = [];
    
    log(`✅ Radar Server Host: ${radar.SERVER.HOST}`, 'green');
    log(`✅ UDP Port: ${radar.SERVER.UDP_PORT}`, 'green');
    log(`✅ Speed Limit: ${radar.SPEED.DEFAULT_LIMIT} km/h`, 'green');
    
    // Validate fine tiers
    log(`✅ Fine Tiers:`, 'green');
    log(`   • 1-${radar.FINES.TIER_1.MAX_EXCESS} km/h over: $${radar.FINES.TIER_1.AMOUNT}`, 'cyan');
    log(`   • ${radar.FINES.TIER_1.MAX_EXCESS + 1}-${radar.FINES.TIER_2.MAX_EXCESS} km/h over: $${radar.FINES.TIER_2.AMOUNT}`, 'cyan');
    log(`   • ${radar.FINES.TIER_2.MAX_EXCESS + 1}-${radar.FINES.TIER_3.MAX_EXCESS} km/h over: $${radar.FINES.TIER_3.AMOUNT}`, 'cyan');
    log(`   • ${radar.FINES.TIER_3.MAX_EXCESS + 1}+ km/h over: $${radar.FINES.TIER_4.AMOUNT}`, 'cyan');
    
    return issues;
}

function validateDatabaseConfig() {
    log('\n🗄️  Database Configuration Validation', 'blue');
    log('=====================================', 'blue');
    
    const db = SYSTEM_CONSTANTS.DATABASE.MYSQL;
    const issues = [];
    
    log(`✅ Database Host: ${db.HOST}`, 'green');
    log(`✅ Database Port: ${db.PORT}`, 'green');
    log(`✅ Database Name: ${db.DATABASE}`, 'green');
    log(`✅ Database User: ${db.USERNAME}`, 'green');
    
    if (!db.PASSWORD && SYSTEM_CONSTANTS.SERVER.API.ENVIRONMENT === 'production') {
        issues.push('Database password should be set in production environment');
    } else if (db.PASSWORD) {
        log(`✅ Database Password: ${'*'.repeat(db.PASSWORD.length)}`, 'green');
    } else {
        log(`⚠️  Database Password: Not set (OK for development)`, 'yellow');
    }
    
    log(`✅ Connection Pool Max: ${db.POOL.MAX}`, 'green');
    log(`✅ Timezone: ${db.TIMEZONE}`, 'green');
    
    return issues;
}

function validateServerConfig() {
    log('\n🖥️  Server Configuration Validation', 'blue');
    log('===================================', 'blue');
    
    const server = SYSTEM_CONSTANTS.SERVER;
    const issues = [];
    
    log(`✅ API Port: ${server.API.PORT}`, 'green');
    log(`✅ Frontend Port: ${server.FRONTEND.PORT}`, 'green');
    log(`✅ Image Server Port: ${server.IMAGE_SERVER.PORT}`, 'green');
    log(`✅ WebSocket Port: ${server.WEBSOCKET.PORT}`, 'green');
    log(`✅ Environment: ${server.API.ENVIRONMENT}`, 'green');
    
    // Check if ports are different
    const ports = [server.API.PORT, server.FRONTEND.PORT, server.IMAGE_SERVER.PORT, server.WEBSOCKET.PORT];
    const uniquePorts = [...new Set(ports)];
    
    if (ports.length !== uniquePorts.length) {
        issues.push('Some server ports are conflicting');
    }
    
    return issues;
}

function validateSecurityConfig() {
    log('\n🔒 Security Configuration Validation', 'blue');
    log('====================================', 'blue');
    
    const security = SYSTEM_CONSTANTS.SECURITY;
    const issues = [];
    
    if (security.JWT.SECRET === 'default_jwt_secret_change_in_production') {
        issues.push('JWT secret should be changed from default value');
        log(`⚠️  JWT Secret: Using default (CHANGE IN PRODUCTION!)`, 'yellow');
    } else {
        log(`✅ JWT Secret: Custom secret configured`, 'green');
    }
    
    log(`✅ JWT Expires In: ${security.JWT.EXPIRES_IN}`, 'green');
    log(`✅ Rate Limit: ${security.RATE_LIMIT.MAX_REQUESTS} requests per ${security.RATE_LIMIT.WINDOW_MS / 60000} minutes`, 'green');
    
    return issues;
}

function validatePathsConfig() {
    log('\n📁 Paths Configuration Validation', 'blue');
    log('==================================', 'blue');
    
    const paths = SYSTEM_CONSTANTS.PATHS;
    const issues = [];
    
    // Check if critical directories exist
    const criticalPaths = [
        { path: paths.BASE.BACKEND, name: 'Backend Directory' },
        { path: paths.BASE.FRONTEND, name: 'Frontend Directory' },
        { path: paths.IMAGES.CAMERA_BASE, name: 'Camera Base Directory' }
    ];
    
    criticalPaths.forEach(({ path: dirPath, name }) => {
        if (fs.existsSync(dirPath)) {
            log(`✅ ${name}: ${dirPath}`, 'green');
        } else {
            issues.push(`${name} does not exist: ${dirPath}`);
            log(`❌ ${name}: ${dirPath} (NOT FOUND)`, 'red');
        }
    });
    
    return issues;
}

async function testDatabaseConnection() {
    log('\n🔌 Database Connection Test', 'blue');
    log('============================', 'blue');
    
    try {
        const sequelize = require('../config/database');
        await sequelize.authenticate();
        log('✅ Database connection successful', 'green');
        await sequelize.close();
        return [];
    } catch (error) {
        log(`❌ Database connection failed: ${error.message}`, 'red');
        return [`Database connection failed: ${error.message}`];
    }
}

function validateEnvironmentFile() {
    log('\n📄 Environment File Validation', 'blue');
    log('===============================', 'blue');
    
    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    const issues = [];
    
    if (fs.existsSync(envPath)) {
        log('✅ .env file exists', 'green');
    } else {
        issues.push('.env file not found - copy from .env.example');
        log('❌ .env file not found', 'red');
    }
    
    if (fs.existsSync(envExamplePath)) {
        log('✅ .env.example file exists', 'green');
    } else {
        log('⚠️  .env.example file not found', 'yellow');
    }
    
    return issues;
}

async function main() {
    const allIssues = [];
    
    // Run all validations
    allIssues.push(...validateEnvironmentFile());
    allIssues.push(...validateFtpConfig());
    allIssues.push(...validateRadarConfig());
    allIssues.push(...validateDatabaseConfig());
    allIssues.push(...validateServerConfig());
    allIssues.push(...validateSecurityConfig());
    allIssues.push(...validatePathsConfig());
    
    // Test database connection
    allIssues.push(...await testDatabaseConnection());
    
    // Run system validation
    const systemValidation = validateConfiguration();
    allIssues.push(...systemValidation.issues);
    
    // Display results
    log('\n📊 Validation Summary', 'blue');
    log('====================', 'blue');
    
    if (allIssues.length === 0) {
        log('🎉 All configurations are valid!', 'green');
        log('✅ System is ready for deployment', 'green');
    } else {
        log(`⚠️  Found ${allIssues.length} configuration issues:`, 'yellow');
        allIssues.forEach((issue, index) => {
            log(`   ${index + 1}. ${issue}`, 'red');
        });
        
        log('\n💡 Recommendations:', 'cyan');
        log('   • Update your .env file with correct values', 'cyan');
        log('   • Ensure all directories exist and have proper permissions', 'cyan');
        log('   • Change default passwords and secrets for production', 'cyan');
        log('   • Verify network connectivity to FTP and database servers', 'cyan');
    }
    
    // Display current configuration summary
    log('\n📋 Current Configuration Summary', 'blue');
    log('===============================', 'blue');
    log(`FTP Server: ${SYSTEM_CONSTANTS.FTP.PRIMARY.HOST}:${SYSTEM_CONSTANTS.FTP.PRIMARY.PORT}`, 'cyan');
    log(`Radar Server: ${SYSTEM_CONSTANTS.RADAR.SERVER.HOST}:${SYSTEM_CONSTANTS.RADAR.SERVER.UDP_PORT}`, 'cyan');
    log(`Database: ${SYSTEM_CONSTANTS.DATABASE.MYSQL.HOST}:${SYSTEM_CONSTANTS.DATABASE.MYSQL.PORT}/${SYSTEM_CONSTANTS.DATABASE.MYSQL.DATABASE}`, 'cyan');
    log(`API Server: localhost:${SYSTEM_CONSTANTS.SERVER.API.PORT}`, 'cyan');
    log(`Speed Limit: ${SYSTEM_CONSTANTS.RADAR.SPEED.DEFAULT_LIMIT} km/h`, 'cyan');
    
    process.exit(allIssues.length > 0 ? 1 : 0);
}

// Run validation
main().catch(error => {
    log(`❌ Validation script error: ${error.message}`, 'red');
    process.exit(1);
});
