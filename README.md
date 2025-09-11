# 🚀 Potassium Factory - Radar Speed Detection System

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://mysql.com/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-lightgrey.svg)](https://expressjs.com/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-orange.svg)](https://jwt.io/)
[![Sequelize](https://img.shields.io/badge/Sequelize-ORM-52B0E7.svg)](https://sequelize.org/)

**Designed & Developed by: Eng-Bashar Zabadani**

A comprehensive Node.js backend API system for managing speed detection radars in potassium factory environments. This enterprise-grade system monitors vehicle speeds through strategically placed radar devices connected via Arduino and GSM modules, providing real-time violation tracking, advanced reporting capabilities, and comprehensive audit trails.

## 🏭 System Overview

The Potassium Factory Radar Speed Detection System is an enterprise-level solution designed to:
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
- **Real-time Dashboard**: Live KPIs, violation counts, revenue tracking
- **Trend Analysis**: Hourly, daily, weekly, monthly violation patterns
- **Radar Performance**: Individual radar statistics and comparisons
- **Speed Analytics**: Distribution analysis and peak time identification
- **Financial Reports**: Revenue tracking, collection rates, outstanding fines
- **Compliance Reports**: Regulatory compliance and audit trail reports
- **Custom Reports**: Configurable report templates with advanced filtering
- **Scheduled Reports**: Automated report generation and email distribution

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
