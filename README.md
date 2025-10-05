<<<<<<< HEAD
# 🚀 Potassium Factory Radar Speed Detection System

Complete radar-based speed detection and fine management system with camera integration.

## 🎯 System Overview

This is a comprehensive radar speed detection system that:
- 📡 **Captures radar data** via UDP from serial bridge
- 📸 **Correlates with camera images** from FTP server
- ⚡ **Processes violations** in real-time
- 💰 **Generates fines** automatically
- 📊 **Provides monitoring dashboards** for operators

## 📁 Project Structure

```
/home/rnd2/Desktop/radar_sys/
├── 🎨 potassium-frontend/          # React frontend application
├── 🖥️ potassium-backend-/          # Node.js backend services  
├── ⚙️ ftp-config.js               # Master FTP configuration (EDIT THIS)
├── 📚 docs/                       # All documentation files
├── 🔧 system/                     # System scripts and services
├── 📋 config/                     # Configuration files
├── 📜 scripts/                    # Integration scripts
└── 🌍 .env                        # Environment variables
```

## 🚀 Quick Setup (New PC)

### 1. Clone Repository
```bash
git clone https://github.com/basharagb/potassium-frontend.git
cd potassium-frontend
```

### 2. Install Dependencies
```bash
# Backend dependencies
cd potassium-backend-/
npm install

# Frontend dependencies  
cd ../potassium-frontend/
npm install

# Root dependencies (if any)
cd ..
npm install
```

### 3. Configure Environment
```bash
# Copy and edit environment file
cp .env.example .env
# Edit .env with your specific settings
```

### 4. Configure FTP Settings
**Edit the master configuration file:**
```bash
nano ftp-config.js
```
Update:
- FTP server IP and credentials
- Camera IP addresses
- Local paths

### 5. Setup Database (MySQL)
```bash
cd potassium-backend-/
# Run database migrations
npm run migrate
# Seed initial data
npm run seed
```

## 🔧 Running the System

### Start All Services
```bash
# Terminal 1: Backend API Server
cd potassium-backend-/
npm start

# Terminal 2: Frontend React App
cd potassium-frontend/
npm start

# Terminal 3: Local Image Server
cd potassium-backend-/services/
sudo node local-image-server.js

# Terminal 4: UDP Radar Server
cd potassium-backend-/services/
node radar-udp-server.js

# Terminal 5: Serial to UDP Bridge (if using serial radar)
cd potassium-backend-/services/
node serial-to-udp-bridge.js
```

### Access Applications
- **🎨 Frontend Dashboard**: http://localhost:3002
- **📸 Fines Images Monitor**: http://localhost:3002/fines-images-monitor
- **📡 Radar Info Monitor**: http://localhost:3002/radar-info-monitor
- **🖼️ Image Server API**: http://localhost:3003
- **🔧 Backend API**: http://localhost:3000

## ⚙️ System Components

### 🎨 Frontend (`potassium-frontend/`)
- **React application** with Material-UI
- **Real-time dashboards** for monitoring
- **Fines management** interface
- **Image viewing** and correlation
- **Radar data visualization**

### 🖥️ Backend (`potassium-backend-/`)
- **Express.js API server** (port 3000)
- **MySQL database** integration
- **Authentication** and user management
- **Fine processing** logic
- **Report generation**

### 📡 Services (`potassium-backend-/services/`)
- **`local-image-server.js`**: Serves camera images (port 3003)
- **`radar-udp-server.js`**: Receives radar data via UDP (port 17081)
- **`serial-to-udp-bridge.js`**: Converts serial radar data to UDP
- **`ftp-image-server.js`**: FTP image processing

### 🗄️ Database Schema
- **`radars`**: Radar station configuration
- **`fines`**: Generated fines and violations
- **`radar_readings`**: All radar detections (persistent)
- **`users`**: System users and authentication

## 🔧 Configuration Management

### 🎯 Master FTP Configuration
**Edit ONLY this file for all FTP settings:**
```
/ftp-config.js
```

Contains:
- FTP server credentials
- Camera IP addresses  
- File paths and directory structure
- Server port configurations

### 🌍 Environment Variables (`.env`)
```bash
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=potassium_backend

# FTP Server
FTP_HOST=192.168.1.55
FTP_USER=camera001
FTP_PASSWORD=RadarCamera01

# Camera
CAMERA_IP=192.168.1.54
CAMERA_PATH=/srv/camera_uploads/camera001/192.168.1.54

# Ports
FRONTEND_PORT=3002
BACKEND_PORT=3000
IMAGE_SERVER_PORT=3003
UDP_PORT=17081
```

## 📊 System Workflow

1. **📡 Radar Detection**: Speed sensor sends data via serial/UDP
2. **📸 Image Capture**: Camera captures images to FTP server
3. **🔗 Correlation**: System matches radar data with images (±2 seconds)
4. **⚖️ Violation Check**: Speed > limit triggers violation
5. **💰 Fine Generation**: Automatic fine creation with evidence
6. **📱 Real-time Display**: Dashboards show live data
7. **📋 Reports**: Generate violation and compliance reports

## 🛠️ Development

### Adding New Features
1. **Backend**: Add routes in `potassium-backend-/routes/`
2. **Frontend**: Add components in `potassium-frontend/src/`
3. **Database**: Add migrations in `potassium-backend-/migrations/`

### Testing
```bash
# Backend tests
cd potassium-backend-/
npm test

# Frontend tests  
cd potassium-frontend/
npm test
```

## 📚 Documentation

Comprehensive documentation in `docs/` directory:
- **Setup guides**: Installation and configuration
- **API documentation**: Backend endpoints
- **Troubleshooting**: Common issues and solutions
- **System reports**: Status and performance
- **Integration guides**: Hardware setup

## 🔧 System Requirements

### Hardware
- **Radar sensor**: Serial or UDP output
- **Camera**: FTP-enabled with timestamp
- **Server**: Linux (Ubuntu recommended)
- **Network**: LAN access to camera and radar

### Software
- **Node.js**: 16+ 
- **MySQL**: 8.0+
- **Linux**: For `/srv/` camera access
- **Git**: For deployment

## 🚨 Troubleshooting

### Common Issues

**Image Server Connection Failed:**
```bash
# Check if server is running
sudo node potassium-backend-/services/local-image-server.js

# Check permissions
sudo chmod -R 755 /srv/camera_uploads/
```

**Radar Data Not Received:**
```bash
# Check UDP port
sudo netstat -tulpn | grep 17081

# Test UDP connection
echo "ID: 1,Speed: 55, Time: 10:30:00." | nc -u localhost 17081
```

**Database Connection Failed:**
```bash
# Check MySQL service
sudo systemctl status mysql

# Test connection
mysql -u root -p potassium_backend
```

## 📞 Support

- **Documentation**: `docs/` directory
- **Issues**: GitHub repository issues
- **Configuration**: `ftp-config.js` (master config)

## 🎯 Current Status

✅ **Project Structure**: Clean and organized  
✅ **FTP Configuration**: Centralized in `ftp-config.js`  
✅ **Image Server**: Serving from `/srv/camera_uploads/`  
✅ **Frontend**: React app with proxy to image server  
✅ **Backend**: API server with MySQL integration  
✅ **Radar System**: UDP server with persistent storage  
✅ **Camera Correlation**: 2-second time window matching  
✅ **Real-time Monitoring**: Live dashboards and updates  

**System is ready for deployment and operation!** 🚀
=======
# 🚀 Potassium Factory - Radar Speed Detection System

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://mysql.com/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-lightgrey.svg)](https://expressjs.com/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-orange.svg)](https://jwt.io/)
[![Sequelize](https://img.shields.io/badge/Sequelize-ORM-52B0E7.svg)](https://sequelize.org/)

**Designed & Developed by: Eng-Bashar Zabadani**

A comprehensive Node.js backend API system for managing speed detection radars in potassium factory environments. This enterprise-grade system monitors vehicle speeds through strategically placed radar devices connected via Arduino and GSM modules, providing real-time violation tracking, advanced reporting capabilities, and comprehensive audit trails.

## 🏭 System Overview

The Potassium Factory Radar Speed Detection System is an enterprise-level solution designed for comprehensive speed monitoring across factory premises. The system integrates physical radar devices with a centralized backend API to provide real-time violation tracking and advanced analytics.

### 🏗️ Physical Infrastructure
- **Radar Devices**: Strategic placement across factory roads and internal streets
- **Arduino Integration**: Each radar connected via Arduino microcontroller for data processing
- **GSM Connectivity**: GSM modules enable wireless data transmission to central servers
- **FTP Server Integration**: Automated file transfer for violation images and data packets
- **Real-time Monitoring**: Continuous speed detection with immediate violation processing

### 🔄 Data Flow Architecture
1. **Speed Detection**: Radar devices monitor vehicle speeds on factory premises
2. **Arduino Processing**: Local processing of speed data and violation detection
3. **GSM Transmission**: Wireless data transmission via GSM modules to FTP server
4. **FTP Integration**: Automated upload of violation images and metadata
5. **API Processing**: Backend system processes FTP data and generates violations
6. **Real-time Analytics**: Live dashboard updates and notification systems

### 🎯 Core Capabilities
- Monitor vehicle speeds across factory premises with high precision
- Automatically detect and record speed violations with image capture
- Generate comprehensive reports and analytics for safety management
- Provide real-time dashboard analytics with advanced filtering
- Support multiple radar devices with FTP integration and remote monitoring
- Manage user authentication with role-based access control
- Maintain detailed audit logs for compliance and security
- Schedule automated report generation and distribution
- Track system performance metrics and radar uptime

## ✨ Key Features

### 🔐 **Advanced Authentication & Security**
- JWT-based secure authentication with refresh tokens
- Role-based access control (Admin, Operator, Viewer)
- Password reset functionality with email verification
- Session management and audit logging
- IP-based access tracking and security monitoring

### 📡 **Comprehensive Radar Management**
- Complete CRUD operations for radar devices
- Real-time status monitoring (Active, Inactive, Maintenance, Error)
- GPS coordinate tracking and location-based mapping
- Performance analytics and uptime monitoring per radar
- Maintenance scheduling and alerts
- FTP path configuration for data reception

### 🚨 **Advanced Violation Management**
- Automatic fine calculation based on configurable speed limits
- Vehicle plate recognition with OCR support
- High-resolution image capture and storage
- Multi-status tracking (Pending, Processed, Paid, Cancelled)
- Bulk processing capabilities for operators
- Violation severity classification and escalation

### 📊 **Enterprise Reporting System**

#### 📋 Report Types Available

**1. Fines Reports**
- **All Fines Report**: Comprehensive listing of all violations with filtering options
- **Fines by Status**: Categorized reports (Pending, Processed, Paid, Cancelled)
- **Fines by Speed Range**: Violations grouped by speed thresholds
- **Fines by Date Range**: Time-based violation analysis
- **Outstanding Fines**: Unpaid violations requiring follow-up

**2. Fines by Radar ID Reports**
- **Single Radar Performance**: Detailed analysis per radar device
- **Radar Comparison**: Side-by-side performance metrics
- **Radar Efficiency**: Detection rates and accuracy statistics
- **Location-based Analysis**: Violations by specific factory areas

**3. Single Fine Reports**
- **Individual Violation Details**: Complete violation record with images
- **Processing History**: Violation lifecycle tracking
- **Evidence Package**: Comprehensive documentation for legal proceedings
- **Payment Status**: Financial tracking per violation

**4. Dashboard Analytics**
- **Real-time KPIs**: Live violation counts, revenue tracking
- **Trend Analysis**: Hourly, daily, weekly, monthly violation patterns
- **Speed Distribution**: Analytics on speed ranges and patterns
- **Peak Time Analysis**: High-violation periods identification
- **Revenue Metrics**: Financial performance and collection rates

**5. System Performance Reports**
- **Radar Uptime**: Device availability and maintenance schedules
- **API Performance**: Response times and system health metrics
- **User Activity**: Access logs and system usage patterns
- **Audit Trail**: Comprehensive security and compliance logs

### 🔄 **System Integration & Monitoring**
- Arduino + GSM module support with real-time data reception
- FTP server integration for image and data transfer
- System performance metrics collection and analysis
- Comprehensive audit logging for all user actions
- API response time monitoring and optimization
- Database performance tracking and alerts
- Automatic data synchronization
- Image file handling
- Real-time data processing

## 🏗️ System Architecture

### Database Schema Design

The system uses a carefully designed relational database schema optimized for performance and scalability:

#### Core Entities
- **Users**: Authentication and role management
- **Radars**: Physical radar device management
- **Fines**: Violation records and processing
- **Reports**: Generated report metadata
- **ReportTypes**: Configurable report templates
- **ReportSchedules**: Automated report scheduling
- **ReportData**: Structured report content storage
- **AuditLogs**: Comprehensive activity tracking
- **SystemMetrics**: Performance monitoring data

#### Relationships & Performance Optimization
- **Indexed Foreign Keys**: All relationships use properly indexed foreign keys
- **Composite Indexes**: Multi-column indexes for common query patterns
- **Query Optimization**: Optimized for high-frequency operations
- **Data Partitioning**: Time-based partitioning for large datasets

### API Architecture

The REST API follows enterprise-grade patterns:

- **Layered Architecture**: Controllers → Services → Models
- **Middleware Pipeline**: Authentication → Authorization → Validation
- **Error Handling**: Centralized error management with proper HTTP status codes
- **Response Standardization**: Consistent JSON response format
- **Rate Limiting**: API throttling for security and performance
- **Request Validation**: Input sanitization and validation

## 🛠 Technology Stack

- **Backend Framework**: Node.js + Express.js
- **Database**: MySQL 8.0+ (potassium_backend)
- **ORM**: Sequelize with advanced query optimization
- **Authentication**: JWT + bcrypt password hashing
- **Security**: Helmet.js, CORS, input validation
- **File Handling**: Multer for image uploads
- **Process Management**: PM2 for production deployment
- **Testing**: Jest for unit and integration tests
- **Documentation**: Comprehensive API documentation with examples
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator
- **Testing**: Jest + Supertest

## 📋 API Endpoints

### 🔐 Authentication
```
POST /api/auth/signup          - User registration
POST /api/auth/signin          - User login
POST /api/auth/forgot-password - Password reset
```

### 📡 Radar Management
```
GET    /api/radars             - Get all radars (with pagination & filtering)
GET    /api/radars/:id         - Get radar by ID with statistics
```

### 🚨 Fines Management
```
GET    /api/fines              - Get all fines (with advanced filtering)
GET    /api/fines/radar/:id    - Get fines by radar ID
GET    /api/fines/:id          - Get specific fine details
```

### 📊 Reports & Analytics
```
GET    /api/reports/dashboard       - Dashboard statistics & KPIs
GET    /api/reports/trends          - Violation trends analysis
GET    /api/reports/radar-performance - Radar performance metrics
```

### 🏥 System Health
```
GET    /health                 - System health check
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/basharagb/potassium-backend-.git
cd potassium-backend-
```

2. **Install dependencies**
```bash
npm install
```

3. **Database Setup**
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE potassium_backend;
```

4. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. **Initialize Database & Demo Data**
```bash
npm run seed
```

6. **Start the Server**
```bash
npm run dev
```

The server will be running at `http://localhost:3000`

## 🧪 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@potasfactory.com | admin123 |
| Operator | operator@potasfactory.com | operator123 |
| Viewer | viewer@potasfactory.com | viewer123 |

## 📊 Database Schema

### Users Table
- User authentication and role management
- Supports Admin, Operator, and Viewer roles

### Radars Table
- Radar device information and configuration
- Location mapping and status tracking
- Speed limit configuration per location

### Fines Table
- Violation records with detailed information
- Automatic fine calculation
- Image and evidence storage
- Processing workflow management

## 🔧 Configuration

### Environment Variables
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=potassium_backend
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development
```

## 📱 API Testing

### Using Postman
Import the `potas_collection.json` file into Postman for comprehensive API testing.

### Using cURL
```bash
# Health Check
curl http://localhost:3000/health

# User Login
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@potasfactory.com","password":"admin123"}'

# Get All Radars (with token)
curl -X GET http://localhost:3000/api/radars \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against API abuse
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers implementation
- **Input Validation**: Comprehensive request validation
- **Password Hashing**: bcrypt for secure password storage

## 📈 Performance Features

- **Database Indexing**: Optimized queries for large datasets
- **Pagination**: Efficient data loading
- **Caching**: Response caching for frequently accessed data
- **Connection Pooling**: Optimized database connections

## 🔄 FTP Integration (Future)

The system is designed to integrate with:
- Arduino-based radar devices
- GSM modules for data transmission
- FTP servers for image and data storage
- Real-time data synchronization

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

## 📦 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secret
4. Enable SSL/HTTPS
5. Configure reverse proxy (nginx)

### Docker Deployment
```bash
# Build image
docker build -t potassium-radar-api .

# Run container
docker run -p 3000:3000 potassium-radar-api
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

**Eng-Bashar Zabadani**
- System Architecture & Design
- Backend Development
- Database Design
- API Development
- Security Implementation

## 📞 Support

For technical support or questions:
- Create an issue in the GitHub repository
- Contact: Eng-Bashar Zabadani

## 🔄 Version History

- **v1.0.0** - Initial release with full API functionality
- **v1.1.0** - Enhanced reporting and analytics
- **v1.2.0** - FTP integration support

---

**© 2024 Potassium Factory Radar Speed Detection System - Designed by Eng-Bashar Zabadani**
>>>>>>> 3435d7c79933890682ffced682e272da8fd72d54
