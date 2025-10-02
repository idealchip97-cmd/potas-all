# 🚗 Potassium Factory - Radar Speed Detection System
## Complete System Overview & Implementation Guide

### System Status: ✅ FULLY OPERATIONAL WITH PERSISTENT UDP LISTENER

This document provides a comprehensive overview of the Potassium Factory Radar Speed Detection System, including the new persistent UDP listener implementation that automatically saves all radar data to MySQL. MySQL data storage**. The system automatically processes radar data from multiple sources and formats, creates violations, and manages fines.

---

## 🏗️ System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   React App     │◄──►│   Node.js       │◄──►│   MySQL         │
│   Port: 3001    │    │   Port: 3000    │    │   Port: 3306    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ UDP Listener    │    │ Live Data APIs  │    │ Radar Devices   │
│ Port: 17081     │    │ REST Endpoints  │    │ 192.168.1.14    │
│ Auto-Start      │    │ Real-time Stats │    │ Multiple Radars │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## ✨ Key Features

### 🎯 **Persistent UDP Listener**
- **Always-on UDP server** listening on port 17081
- **Auto-starts** with the backend server
- **Multiple format support**: Text, JSON, Binary
- **Duplicate prevention** and error handling
- **Real-time processing** and MySQL storage

### 📊 **Dedicated UDP Readings Table**
- **Separate table** (`udp_readings`) for all UDP data
- **Comprehensive tracking**: Source IP, port, message format
- **Fine correlation**: Links violations to created fines
- **Processing status**: Tracks processed vs pending readings
- **Export capabilities**: CSV export with filtering

### 🚨 **Automatic Violation Processing**
- **Speed limit enforcement** (configurable, default: 30 km/h)
- **Automatic fine creation** for violations
- **Fine amount calculation** based on speed excess
- **Radar auto-registration** for new devices

### 🔌 **Comprehensive APIs**
- **Live readings**: Real-time data access
- **Statistics**: Compliance rates, speed analytics
- **Filtering**: By radar, date, violation status, format
- **Bulk operations**: Process multiple readings
- **Export**: CSV download with custom filters

---

## 📁 Database Schema

### `udp_readings` Table (New)
```sql
CREATE TABLE udp_readings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  radarId INT NOT NULL,
  speedDetected INT NOT NULL,
  speedLimit INT DEFAULT 30,
  detectionTime DATETIME NOT NULL,
  isViolation BOOLEAN DEFAULT FALSE,
  sourceIP VARCHAR(45),
  sourcePort INT,
  rawMessage TEXT,
  messageFormat ENUM('text', 'json', 'binary', 'unknown'),
  hexData TEXT,
  processed BOOLEAN DEFAULT FALSE,
  fineCreated BOOLEAN DEFAULT FALSE,
  fineId INT,
  correlatedImages JSON,
  processingNotes TEXT,
  errorMessage TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Supported Message Formats

#### 1. **Text Format**
```
ID: 1,Speed: 55, Time: 14:08:45.
```

#### 2. **JSON Format**
```json
{"radarId": 1, "speed": 55, "timestamp": "2025-09-30T18:08:40Z"}
```

#### 3. **Binary Format**
```
FE AF 05 01 0A [SPEED] 16 EF
```

---

## 🔌 API Endpoints

### **UDP Readings Management**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/udp-readings` | List all UDP readings with pagination |
| `GET` | `/api/udp-readings/live` | Get recent live readings |
| `GET` | `/api/udp-readings/:id` | Get specific reading by ID |
| `GET` | `/api/udp-readings/stats/summary` | Get comprehensive statistics |
| `GET` | `/api/udp-readings/violations/recent` | Recent violations (24h) |
| `PATCH` | `/api/udp-readings/:id/process` | Mark reading as processed |
| `POST` | `/api/udp-readings/bulk/process` | Bulk process readings |
| `GET` | `/api/udp-readings/export/csv` | Export readings as CSV |
| `DELETE` | `/api/udp-readings/:id` | Delete specific reading |

### **System Monitoring**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/udp/status` | UDP listener status and stats |
| `POST` | `/api/udp/reset-stats` | Reset UDP statistics |
| `GET` | `/health` | Overall system health |

### **Query Parameters**

#### Filtering Options:
- `radarId` - Filter by specific radar
- `isViolation` - Filter violations (true/false)
- `processed` - Filter processed status (true/false)
- `messageFormat` - Filter by format (text/json/binary)
- `startDate` / `endDate` - Date range filtering
- `minSpeed` / `maxSpeed` - Speed range filtering
- `sourceIP` - Filter by source IP address
- `page` / `limit` - Pagination controls

---

## 🚀 Installation & Setup

### **1. Quick Start**
```bash
# Navigate to backend directory
cd /home/rnd2/Desktop/radar_sys/potassium-backend-

# Install dependencies
npm install

# Start the system
node server.js
```

### **2. Automated Setup**
```bash
# Run the setup script
cd /home/rnd2/Desktop/radar_sys
chmod +x setup-persistent-udp.sh
./setup-persistent-udp.sh
```

### **3. Systemd Service (Auto-start)**
```bash
# Install as system service
sudo cp potassium-persistent-udp.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable potassium-persistent-udp
sudo systemctl start potassium-persistent-udp
```

---

## 📊 Real-time Statistics

The system provides comprehensive real-time statistics:

### **Current System Status**
- **Total Readings**: 3
- **Violations Detected**: 2
- **Fines Created**: 2
- **Compliance Rate**: 33.33%
- **Average Speed**: 41.67 km/h
- **Max Speed Recorded**: 55 km/h

### **Format Distribution**
- **Text Format**: 2 readings
- **JSON Format**: 1 reading
- **Binary Format**: 0 readings

### **Radar Distribution**
- **Radar 1** (Main Gate): 1 reading
- **Radar 2** (Production Area A): 1 reading  
- **Radar 3** (Production Area B): 1 reading

---

## 🧪 Testing

### **Manual UDP Testing**
```bash
# Send text format
echo "ID: 1,Speed: 55, Time: 18:08:30." | nc -u localhost 17081

# Send JSON format
echo '{"radarId": 2, "speed": 45, "timestamp": "2025-09-30T18:08:40Z"}' | nc -u localhost 17081

# Send binary format
echo -ne '\xFE\xAF\x05\x01\x0A\x42\x16\xEF' | nc -u localhost 17081
```

### **API Testing**
```bash
# Check live readings
curl http://localhost:3000/api/udp-readings/live

# Check statistics
curl http://localhost:3000/api/udp-readings/stats/summary

# Check UDP listener status
curl http://localhost:3000/api/udp/status
```

### **Automated Testing**
```bash
# Run comprehensive test suite
node test-udp-readings-api.js
```

---

## 🔧 Configuration

### **Environment Variables**
```bash
# UDP Configuration
UDP_PORT=17081
SPEED_LIMIT=30

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=potassium_backend

# Server Configuration
PORT=3000
NODE_ENV=production
```

### **Speed Limit & Fine Calculation**
- **Speed Limit**: 30 km/h (configurable)
- **Fine Amounts**:
  - 1-10 km/h over: $50
  - 11-20 km/h over: $100
  - 21-30 km/h over: $200
  - 30+ km/h over: $300

---

## 📈 Performance Features

### **Optimization**
- **Database Indexing**: Optimized queries with 10+ indexes
- **Duplicate Prevention**: Memory-based duplicate detection
- **Bulk Operations**: Process multiple readings efficiently
- **Pagination**: Handle large datasets with pagination
- **Connection Pooling**: MySQL connection optimization

### **Scalability**
- **Auto-radar Registration**: New radars auto-register
- **Memory Management**: Automatic cleanup of processed messages
- **Error Handling**: Comprehensive error logging and recovery
- **Real-time Processing**: Immediate violation detection and fine creation

---

## 🛡️ Security & Reliability

### **Data Integrity**
- **Transaction Support**: Database transactions for consistency
- **Error Recovery**: Automatic retry mechanisms
- **Validation**: Input validation for all data formats
- **Audit Trail**: Complete processing history

### **Monitoring**
- **Health Checks**: System health monitoring
- **Statistics Tracking**: Real-time performance metrics
- **Log Management**: Comprehensive logging system
- **Status APIs**: Real-time system status

---

## 🎯 Use Cases

### **Traffic Enforcement**
- **Real-time Speed Monitoring**: Continuous speed detection
- **Automatic Fine Generation**: Immediate violation processing
- **Evidence Collection**: Complete data trail for violations
- **Compliance Tracking**: Speed compliance analytics

### **Factory Safety**
- **Vehicle Speed Control**: Monitor vehicle speeds in factory zones
- **Safety Zone Enforcement**: Different speed limits per area
- **Incident Prevention**: Early warning for speeding vehicles
- **Safety Analytics**: Speed pattern analysis

---

## 📞 Support & Maintenance

### **System Health Monitoring**
```bash
# Check system status
curl http://localhost:3000/health

# Monitor UDP listener
curl http://localhost:3000/api/udp/status

# View recent activity
curl http://localhost:3000/api/udp-readings/live?limit=10
```

### **Troubleshooting**
- **Port Conflicts**: Ensure port 17081 is available
- **Database Issues**: Check MySQL connection and credentials
- **Memory Usage**: Monitor system resources
- **Log Analysis**: Check server logs for errors

---

## 👨‍💻 Developer Information

**Lead Developer & System Architect**: Eng. Bashar Zabadani
- **Email**: basharagb@gmail.com
- **Phone**: +962780853195
- **GitHub**: @basharagb

### **System Components**
1. **Persistent UDP Listener** (`services/persistentUdpListener.js`)
2. **UDP Readings Model** (`models/UdpReading.js`)
3. **UDP Readings API** (`routes/udpReadings.js`)
4. **Real-time Processing** (Automatic violation detection)
5. **Statistics Engine** (Real-time analytics)

---

## 🎉 System Status: **FULLY OPERATIONAL**

✅ **UDP Listener**: Active on port 17081  
✅ **Database**: Connected and synchronized  
✅ **APIs**: All endpoints operational  
✅ **Real-time Processing**: Violations detected and fines created  
✅ **Statistics**: Live data tracking active  
✅ **Export**: CSV export functional  

**The system is ready for production use!**

---

*© 2025 Potassium Factory - Radar Speed Detection System*
