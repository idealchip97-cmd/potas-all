# 🔧 Potassium Radar System - Configuration Management Guide

## Overview

This guide explains how to manage all system configurations, credentials, and settings in a centralized way. All FTP credentials, IP addresses, and other settings are now managed through a single configuration system.

---

## 📁 Configuration Files Structure

```
potassium-backend-/
├── config/
│   ├── systemConstants.js     # 🎯 MAIN CONFIGURATION FILE
│   └── database.js            # Database connection (uses systemConstants)
├── scripts/
│   ├── validateConfig.js      # Configuration validation tool
│   └── updateConfig.js        # Interactive configuration manager
├── .env                       # Environment variables
└── .env.example              # Environment template
```

---

## 🎯 Main Configuration File

**Location**: `/home/rnd2/Desktop/radar_sys/potassium-backend-/config/systemConstants.js`

This is the **central configuration hub** containing all system settings:

### 📡 FTP Configuration
```javascript
FTP_CONFIG = {
    PRIMARY: {
        HOST: '192.186.1.55',        // FTP server IP
        PORT: 21,                    // FTP port
        USER: 'camera001',           // FTP username
        PASSWORD: 'RadarCamera01',   // FTP password
        // ... connection settings
    },
    BACKUP: {
        HOST: '192.186.1.56',        // Backup FTP server
        // ... backup settings
    }
}
```

### 🎯 Radar Configuration
```javascript
RADAR_CONFIG = {
    SERVER: {
        HOST: '192.168.1.14',        // Radar server IP
        UDP_PORT: 17081,             // UDP listening port
    },
    SPEED: {
        DEFAULT_LIMIT: 30,           // Speed limit (km/h)
    },
    FINES: {
        TIER_1: { MAX_EXCESS: 10, AMOUNT: 50 },   // Fine amounts
        TIER_2: { MAX_EXCESS: 20, AMOUNT: 100 },
        TIER_3: { MAX_EXCESS: 30, AMOUNT: 200 },
        TIER_4: { MAX_EXCESS: 999, AMOUNT: 300 },
    }
}
```

---

## 🛠️ Configuration Management Tools

### 1. **Interactive Configuration Manager**

```bash
cd /home/rnd2/Desktop/radar_sys/potassium-backend-
node scripts/updateConfig.js
```

**Features:**
- Interactive menu-driven interface
- Update FTP credentials easily
- Change radar server settings
- Modify database configuration
- Update security settings
- Generate random JWT secrets
- View current configuration

**Menu Options:**
1. Update FTP Configuration
2. Update Radar Configuration  
3. Update Database Configuration
4. Update Server Configuration
5. Update Security Configuration
6. Update All Configurations
7. View Current Configuration
8. Validate Configuration
9. Exit

### 2. **Configuration Validation Tool**

```bash
cd /home/rnd2/Desktop/radar_sys/potassium-backend-
node scripts/validateConfig.js
```

**Validates:**
- ✅ FTP server credentials and connectivity
- ✅ Database connection and settings
- ✅ Server port configurations
- ✅ Security settings (JWT, passwords)
- ✅ File system paths and permissions
- ✅ All required environment variables

---

## 📝 Environment Variables (.env file)

### Current FTP Settings
```bash
# FTP Server for Image Downloads (Camera System)
FTP_HOST=192.186.1.55
FTP_PORT=21
FTP_USER=camera001
FTP_PASSWORD=RadarCamera01

# Backup FTP Server (Optional)
FTP_BACKUP_HOST=192.186.1.56
FTP_BACKUP_PORT=21
FTP_BACKUP_USER=camera001
FTP_BACKUP_PASSWORD=RadarCamera01
```

### Radar Server Settings
```bash
# UDP Server for Radar/Fines Data
RADAR_SERVER_IP=192.168.1.14
UDP_PORT=17081
SPEED_LIMIT=30
```

### Database Configuration
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=potassium_backend
DB_USER=root
DB_PASSWORD=your_password
```

---

## 🔄 How to Update Configurations

### Method 1: Interactive Script (Recommended)
```bash
# Run the interactive configuration manager
cd /home/rnd2/Desktop/radar_sys/potassium-backend-
node scripts/updateConfig.js

# Select option 1 for FTP configuration
# Enter new values when prompted
# Press Enter to keep current values
```

### Method 2: Direct .env File Edit
```bash
# Edit the .env file directly
nano /home/rnd2/Desktop/radar_sys/potassium-backend-/.env

# Update the values:
FTP_HOST=192.186.1.55
FTP_USER=camera001
FTP_PASSWORD=RadarCamera01

# Save and restart the server
```

### Method 3: Environment Variables
```bash
# Set environment variables before starting
export FTP_HOST=192.186.1.55
export FTP_USER=camera001
export FTP_PASSWORD=RadarCamera01

# Start the server
node server.js
```

---

## 🚀 Quick Configuration Updates

### Update FTP Server IP
```bash
# Method 1: Interactive
node scripts/updateConfig.js
# Select option 1, enter new IP

# Method 2: Direct edit
sed -i 's/FTP_HOST=.*/FTP_HOST=192.186.1.60/' .env
```

### Update FTP Credentials
```bash
# Method 1: Interactive
node scripts/updateConfig.js
# Select option 1, enter new credentials

# Method 2: Direct edit
sed -i 's/FTP_USER=.*/FTP_USER=newuser/' .env
sed -i 's/FTP_PASSWORD=.*/FTP_PASSWORD=newpassword/' .env
```

### Update Speed Limit
```bash
# Method 1: Interactive
node scripts/updateConfig.js
# Select option 2, enter new speed limit

# Method 2: Direct edit
sed -i 's/SPEED_LIMIT=.*/SPEED_LIMIT=40/' .env
```

---

## 🔍 Configuration Validation

### Before Deployment
```bash
# Always validate configuration before deployment
node scripts/validateConfig.js

# Check for issues:
# ✅ All configurations valid = Ready for deployment
# ⚠️  Issues found = Fix before deployment
```

### Validation Checklist
- [ ] FTP server accessible
- [ ] FTP credentials correct
- [ ] Database connection working
- [ ] All required directories exist
- [ ] No port conflicts
- [ ] Security settings configured
- [ ] JWT secret changed from default

---

## 📋 Configuration Templates

### Production Environment
```bash
# Production .env template
NODE_ENV=production
FTP_HOST=192.186.1.55
FTP_USER=camera001
FTP_PASSWORD=RadarCamera01
DB_PASSWORD=secure_production_password
JWT_SECRET=random_64_character_secret
```

### Development Environment
```bash
# Development .env template
NODE_ENV=development
FTP_HOST=192.186.1.55
FTP_USER=camera001
FTP_PASSWORD=RadarCamera01
DB_PASSWORD=dev_password
JWT_SECRET=dev_jwt_secret
```

### Testing Environment
```bash
# Testing .env template
NODE_ENV=test
FTP_HOST=localhost
FTP_USER=testuser
FTP_PASSWORD=testpass
DB_NAME=potassium_backend_test
```

---

## 🔧 Troubleshooting

### FTP Connection Issues
```bash
# 1. Validate FTP configuration
node scripts/validateConfig.js

# 2. Test FTP connection manually
ftp 192.186.1.55
# Enter username: camera001
# Enter password: RadarCamera01

# 3. Check network connectivity
ping 192.186.1.55
telnet 192.186.1.55 21
```

### Configuration Not Loading
```bash
# 1. Check .env file exists
ls -la /home/rnd2/Desktop/radar_sys/potassium-backend-/.env

# 2. Validate configuration syntax
node scripts/validateConfig.js

# 3. Restart server after changes
pkill -f "node server.js"
node server.js
```

### Database Connection Issues
```bash
# 1. Test database connection
mysql -h localhost -u root -p potassium_backend

# 2. Validate database configuration
node scripts/validateConfig.js

# 3. Check database service
systemctl status mysql
```

---

## 📚 Best Practices

### Security
- ✅ **Never commit .env files** to version control
- ✅ **Use strong passwords** for production
- ✅ **Change default JWT secrets**
- ✅ **Rotate credentials regularly**
- ✅ **Use environment-specific configurations**

### Maintenance
- ✅ **Validate configuration** before deployment
- ✅ **Backup .env files** before changes
- ✅ **Document configuration changes**
- ✅ **Test after configuration updates**
- ✅ **Monitor system after changes**

### Development
- ✅ **Use .env.example** as template
- ✅ **Keep configurations centralized**
- ✅ **Use validation scripts** regularly
- ✅ **Update documentation** when adding new configs

---

## 📞 Support

### Configuration Issues
1. **Run validation script**: `node scripts/validateConfig.js`
2. **Check system logs**: `tail -f /var/log/syslog | grep potassium`
3. **Verify network connectivity**: `ping 192.186.1.55`
4. **Test database connection**: `mysql -h localhost -u root -p`

### Quick Commands
```bash
# View current configuration
node scripts/updateConfig.js
# Select option 7

# Update FTP settings
node scripts/updateConfig.js
# Select option 1

# Validate all settings
node scripts/validateConfig.js

# Restart system
sudo systemctl restart potassium-persistent-udp
```

---

## 🎯 Summary

The Potassium Radar System now uses a **centralized configuration management system** that makes it easy to:

- ✅ **Update FTP credentials** without searching multiple files
- ✅ **Change server IPs** in one place
- ✅ **Validate configurations** before deployment
- ✅ **Manage environment-specific settings**
- ✅ **Ensure security best practices**

**Key Files:**
- `config/systemConstants.js` - Main configuration hub
- `.env` - Environment variables
- `scripts/updateConfig.js` - Interactive configuration manager
- `scripts/validateConfig.js` - Configuration validation tool

**Remember**: Always run `node scripts/validateConfig.js` after making configuration changes!

---

*© 2025 Potassium Factory - Radar Speed Detection System*
