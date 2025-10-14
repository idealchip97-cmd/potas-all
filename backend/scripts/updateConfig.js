#!/usr/bin/env node

/**
 * Configuration Update Script
 * 
 * This script provides an interactive way to update system configurations,
 * especially FTP credentials and server settings.
 * 
 * Usage: node scripts/updateConfig.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

function loadEnvFile() {
    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        log('✅ Loaded existing .env file', 'green');
    } else if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, 'utf8');
        log('📄 Created .env from .env.example template', 'yellow');
    } else {
        log('❌ No .env or .env.example file found', 'red');
        process.exit(1);
    }
    
    return envContent;
}

function parseEnvContent(content) {
    const env = {};
    const lines = content.split('\n');
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    
    return env;
}

function updateEnvContent(content, updates) {
    let updatedContent = content;
    
    Object.entries(updates).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;
        
        if (regex.test(updatedContent)) {
            updatedContent = updatedContent.replace(regex, newLine);
        } else {
            // Add new line if key doesn't exist
            updatedContent += `\n${newLine}`;
        }
    });
    
    return updatedContent;
}

function saveEnvFile(content) {
    const envPath = path.join(__dirname, '..', '.env');
    fs.writeFileSync(envPath, content);
    log('✅ Configuration saved to .env file', 'green');
}

async function updateFtpConfig() {
    log('\n📡 FTP Configuration Update', 'blue');
    log('============================', 'blue');
    
    const updates = {};
    
    log('\nCurrent FTP settings will be updated. Press Enter to keep current value.\n', 'cyan');
    
    const ftpHost = await question('FTP Host (192.186.1.55): ');
    if (ftpHost.trim()) updates.FTP_HOST = ftpHost.trim();
    
    const ftpPort = await question('FTP Port (21): ');
    if (ftpPort.trim()) updates.FTP_PORT = ftpPort.trim();
    
    const ftpUser = await question('FTP Username (camera001): ');
    if (ftpUser.trim()) updates.FTP_USER = ftpUser.trim();
    
    const ftpPassword = await question('FTP Password (RadarCamera01): ');
    if (ftpPassword.trim()) updates.FTP_PASSWORD = ftpPassword.trim();
    
    // Backup FTP settings
    log('\n📡 Backup FTP Server (Optional)', 'yellow');
    const backupHost = await question('Backup FTP Host (optional): ');
    if (backupHost.trim()) updates.FTP_BACKUP_HOST = backupHost.trim();
    
    const backupUser = await question('Backup FTP Username (optional): ');
    if (backupUser.trim()) updates.FTP_BACKUP_USER = backupUser.trim();
    
    const backupPassword = await question('Backup FTP Password (optional): ');
    if (backupPassword.trim()) updates.FTP_BACKUP_PASSWORD = backupPassword.trim();
    
    return updates;
}

async function updateRadarConfig() {
    log('\n🎯 Radar Configuration Update', 'blue');
    log('==============================', 'blue');
    
    const updates = {};
    
    const radarHost = await question('Radar Server IP (192.168.1.14): ');
    if (radarHost.trim()) updates.RADAR_SERVER_IP = radarHost.trim();
    
    const udpPort = await question('UDP Port (17081): ');
    if (udpPort.trim()) updates.UDP_PORT = udpPort.trim();
    
    const speedLimit = await question('Speed Limit in km/h (30): ');
    if (speedLimit.trim()) updates.SPEED_LIMIT = speedLimit.trim();
    
    return updates;
}

async function updateDatabaseConfig() {
    log('\n🗄️  Database Configuration Update', 'blue');
    log('=================================', 'blue');
    
    const updates = {};
    
    const dbHost = await question('Database Host (localhost): ');
    if (dbHost.trim()) updates.DB_HOST = dbHost.trim();
    
    const dbPort = await question('Database Port (3306): ');
    if (dbPort.trim()) updates.DB_PORT = dbPort.trim();
    
    const dbName = await question('Database Name (potassium_backend): ');
    if (dbName.trim()) updates.DB_NAME = dbName.trim();
    
    const dbUser = await question('Database Username (root): ');
    if (dbUser.trim()) updates.DB_USER = dbUser.trim();
    
    const dbPassword = await question('Database Password: ');
    if (dbPassword.trim()) updates.DB_PASSWORD = dbPassword.trim();
    
    return updates;
}

async function updateServerConfig() {
    log('\n🖥️  Server Configuration Update', 'blue');
    log('===============================', 'blue');
    
    const updates = {};
    
    const apiPort = await question('API Server Port (3000): ');
    if (apiPort.trim()) updates.PORT = apiPort.trim();
    
    const frontendPort = await question('Frontend Port (3001): ');
    if (frontendPort.trim()) updates.FRONTEND_PORT = frontendPort.trim();
    
    const imageServerPort = await question('Image Server Port (3003): ');
    if (imageServerPort.trim()) updates.IMAGE_SERVER_PORT = imageServerPort.trim();
    
    const environment = await question('Environment (development/production): ');
    if (environment.trim()) updates.NODE_ENV = environment.trim();
    
    return updates;
}

async function updateSecurityConfig() {
    log('\n🔒 Security Configuration Update', 'blue');
    log('================================', 'blue');
    
    const updates = {};
    
    const jwtSecret = await question('JWT Secret (leave empty to generate random): ');
    if (jwtSecret.trim()) {
        updates.JWT_SECRET = jwtSecret.trim();
    } else {
        // Generate random JWT secret
        const crypto = require('crypto');
        updates.JWT_SECRET = crypto.randomBytes(64).toString('hex');
        log('✅ Generated random JWT secret', 'green');
    }
    
    const jwtExpires = await question('JWT Expires In (24h): ');
    if (jwtExpires.trim()) updates.JWT_EXPIRES_IN = jwtExpires.trim();
    
    const accessPassword = await question('Local Access Password (idealchip123): ');
    if (accessPassword.trim()) updates.LOCAL_ACCESS_PASSWORD = accessPassword.trim();
    
    return updates;
}

async function showMenu() {
    log('\n🔧 Potassium Radar System - Configuration Manager', 'magenta');
    log('==================================================', 'magenta');
    log('1. Update FTP Configuration', 'cyan');
    log('2. Update Radar Configuration', 'cyan');
    log('3. Update Database Configuration', 'cyan');
    log('4. Update Server Configuration', 'cyan');
    log('5. Update Security Configuration', 'cyan');
    log('6. Update All Configurations', 'cyan');
    log('7. View Current Configuration', 'cyan');
    log('8. Validate Configuration', 'cyan');
    log('9. Exit', 'cyan');
    
    const choice = await question('\nSelect an option (1-9): ');
    return choice.trim();
}

async function viewCurrentConfig() {
    log('\n📋 Current Configuration', 'blue');
    log('========================', 'blue');
    
    try {
        const { SYSTEM_CONSTANTS } = require('../config/systemConstants');
        
        log('\n📡 FTP Configuration:', 'yellow');
        log(`   Host: ${SYSTEM_CONSTANTS.FTP.PRIMARY.HOST}`, 'cyan');
        log(`   Port: ${SYSTEM_CONSTANTS.FTP.PRIMARY.PORT}`, 'cyan');
        log(`   User: ${SYSTEM_CONSTANTS.FTP.PRIMARY.USER}`, 'cyan');
        log(`   Password: ${'*'.repeat(SYSTEM_CONSTANTS.FTP.PRIMARY.PASSWORD.length)}`, 'cyan');
        
        log('\n🎯 Radar Configuration:', 'yellow');
        log(`   Server: ${SYSTEM_CONSTANTS.RADAR.SERVER.HOST}`, 'cyan');
        log(`   UDP Port: ${SYSTEM_CONSTANTS.RADAR.SERVER.UDP_PORT}`, 'cyan');
        log(`   Speed Limit: ${SYSTEM_CONSTANTS.RADAR.SPEED.DEFAULT_LIMIT} km/h`, 'cyan');
        
        log('\n🗄️  Database Configuration:', 'yellow');
        log(`   Host: ${SYSTEM_CONSTANTS.DATABASE.MYSQL.HOST}`, 'cyan');
        log(`   Port: ${SYSTEM_CONSTANTS.DATABASE.MYSQL.PORT}`, 'cyan');
        log(`   Database: ${SYSTEM_CONSTANTS.DATABASE.MYSQL.DATABASE}`, 'cyan');
        log(`   User: ${SYSTEM_CONSTANTS.DATABASE.MYSQL.USERNAME}`, 'cyan');
        
        log('\n🖥️  Server Configuration:', 'yellow');
        log(`   API Port: ${SYSTEM_CONSTANTS.SERVER.API.PORT}`, 'cyan');
        log(`   Frontend Port: ${SYSTEM_CONSTANTS.SERVER.FRONTEND.PORT}`, 'cyan');
        log(`   Image Server Port: ${SYSTEM_CONSTANTS.SERVER.IMAGE_SERVER.PORT}`, 'cyan');
        log(`   Environment: ${SYSTEM_CONSTANTS.SERVER.API.ENVIRONMENT}`, 'cyan');
        
    } catch (error) {
        log(`❌ Error loading configuration: ${error.message}`, 'red');
    }
}

async function runValidation() {
    log('\n🔍 Running Configuration Validation...', 'blue');
    
    try {
        const { spawn } = require('child_process');
        const validationScript = path.join(__dirname, 'validateConfig.js');
        
        const child = spawn('node', [validationScript], { stdio: 'inherit' });
        
        child.on('close', (code) => {
            if (code === 0) {
                log('\n✅ Configuration validation completed successfully', 'green');
            } else {
                log('\n⚠️  Configuration validation found issues', 'yellow');
            }
        });
        
    } catch (error) {
        log(`❌ Error running validation: ${error.message}`, 'red');
    }
}

async function main() {
    try {
        while (true) {
            const choice = await showMenu();
            let updates = {};
            
            switch (choice) {
                case '1':
                    updates = await updateFtpConfig();
                    break;
                case '2':
                    updates = await updateRadarConfig();
                    break;
                case '3':
                    updates = await updateDatabaseConfig();
                    break;
                case '4':
                    updates = await updateServerConfig();
                    break;
                case '5':
                    updates = await updateSecurityConfig();
                    break;
                case '6':
                    log('\n🔄 Updating All Configurations...', 'yellow');
                    updates = {
                        ...await updateFtpConfig(),
                        ...await updateRadarConfig(),
                        ...await updateDatabaseConfig(),
                        ...await updateServerConfig(),
                        ...await updateSecurityConfig()
                    };
                    break;
                case '7':
                    await viewCurrentConfig();
                    continue;
                case '8':
                    await runValidation();
                    continue;
                case '9':
                    log('\n👋 Goodbye!', 'green');
                    rl.close();
                    return;
                default:
                    log('❌ Invalid choice. Please select 1-9.', 'red');
                    continue;
            }
            
            // Apply updates if any
            if (Object.keys(updates).length > 0) {
                const envContent = loadEnvFile();
                const updatedContent = updateEnvContent(envContent, updates);
                saveEnvFile(updatedContent);
                
                log(`\n✅ Updated ${Object.keys(updates).length} configuration(s)`, 'green');
                log('💡 Restart the server to apply changes', 'yellow');
                
                // Show what was updated
                log('\n📝 Updated configurations:', 'cyan');
                Object.entries(updates).forEach(([key, value]) => {
                    const displayValue = key.includes('PASSWORD') || key.includes('SECRET') 
                        ? '*'.repeat(value.length) 
                        : value;
                    log(`   ${key} = ${displayValue}`, 'cyan');
                });
            }
        }
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    log('\n\n👋 Configuration update cancelled', 'yellow');
    rl.close();
    process.exit(0);
});

// Run the configuration manager
main();
