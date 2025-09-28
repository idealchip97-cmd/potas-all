# 🚗 Potassium Factory - Radar Speed Detection System

A comprehensive radar-based speed detection and traffic monitoring system with real-time data processing, license plate recognition, and fine management capabilities.

![System Status](https://img.shields.io/badge/Status-Active-green)
![Version](https://img.shields.io/badge/Version-0.1.0-blue)
![React](https://img.shields.io/badge/React-19.1.1-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue)
![Material-UI](https://img.shields.io/badge/Material--UI-7.3.2-0081cb)

## 📋 Table of Contents

- [System Overview](#-system-overview)
- [System Architecture](#-system-architecture)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Installation & Setup](#-installation--setup)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Security Implementation](#-security-implementation)
- [Database Design](#-database-design)
- [Development](#-development)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Developer Information](#-developer-information)

## 🎯 System Overview

Potassium Factory is an advanced radar speed detection system designed for traffic monitoring and enforcement. The system integrates multiple technologies including radar sensors, camera systems, and license plate recognition to provide comprehensive traffic management solutions.

### Key Capabilities
- **Real-time Speed Detection**: Monitor vehicle speeds using radar technology
- **License Plate Recognition**: Automated plate detection and OCR processing
- **Fine Management**: Complete violation tracking and fine processing
- **Multi-Camera Support**: Integration with multiple camera feeds
- **Data Analytics**: Comprehensive reporting and analytics dashboard
- **Real-time Monitoring**: Live data streams via FTP and UDP protocols

## 🏗️ System Architecture

The system follows a modern microservices architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   React App     │◄──►│   Node.js       │◄──►│   MySQL         │
│   Port: 3001    │    │   Port: 3000    │    │   Port: 3306    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Local Image     │    │ Plate Recognition│    │ Radar Server    │
│ Server          │    │ Service         │    │ 192.168.1.14    │
│ Port: 3003      │    │ Port: 3002      │    │ FTP: 21         │
└─────────────────┘    └─────────────────┘    │ UDP: 17081      │
                                              └─────────────────┘
```

### Core Components

#### 1. Frontend Application (React/TypeScript)
- **Dashboard**: Main overview with statistics and real-time monitoring
- **Radars**: Device management and configuration
- **Fines**: Violation tracking and fine management
- **Reports**: Analytics and data visualization
- **PlateRecognition**: Image processing and OCR management
- **FTPMonitor**: Real-time FTP image monitoring
- **UDPMonitor**: Live radar data stream monitoring

#### 2. Backend Services
- **Main API Server** (Port 3000): Core business logic and data management
- **Local Image Server** (Port 3003): Serves camera images from local storage
- **Plate Recognition Service** (Port 3002): OCR and image processing
- **FTP Service** (Port 21): Camera image uploads
- **UDP Service** (Port 17081): Real-time radar data streams

#### 3. Data Layer
- **MySQL Database**: Primary data storage
- **File System**: Image and document storage
- **Real-time Streams**: FTP and UDP data feeds

## ✨ Features

### 🚀 Core Features
- **Real-time Speed Monitoring**: Live radar data processing
- **Automated License Plate Recognition**: AI-powered OCR system
- **Fine Management System**: Complete violation lifecycle management
- **Multi-Camera Integration**: Support for multiple camera feeds
- **Data Analytics Dashboard**: Comprehensive reporting and insights
- **User Authentication**: JWT-based secure authentication
- **Role-based Access Control**: Different permission levels
- **Real-time Notifications**: Instant alerts for violations

### 📊 Advanced Features
- **Historical Data Analysis**: Trend analysis and reporting
- **Export Capabilities**: Data export in multiple formats
- **Image Gallery**: Organized violation evidence management
- **Date-based Filtering**: Advanced search and filtering options
- **Responsive Design**: Mobile and desktop compatibility
- **Dark/Light Theme**: User preference themes
- **Drag & Drop Upload**: Intuitive file upload interface

## 🛠️ Technology Stack

### Frontend
- **React 19.1.1**: Modern React with latest features
- **TypeScript 4.9.5**: Type-safe development
- **Material-UI 7.3.2**: Modern component library
- **React Router 7.9.1**: Client-side routing
- **Axios**: HTTP client for API calls
- **Recharts**: Data visualization library
- **React Dropzone**: File upload component
- **Emotion**: CSS-in-JS styling

### Backend
- **Node.js**: JavaScript runtime
- **Express 5.1.0**: Web application framework
- **MySQL**: Relational database
- **JWT**: Authentication tokens
- **Multer**: File upload handling
- **CORS**: Cross-origin resource sharing
- **Basic-FTP**: FTP client library

### Development Tools
- **TypeScript**: Static type checking
- **ESLint**: Code linting
- **Jest**: Testing framework
- **React Testing Library**: Component testing
- **Nodemon**: Development server

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MySQL Server
- Git

### Quick Start

1. **Clone the Repository**
```bash
git clone https://github.com/basharagb/potassium-frontend.git
cd potassium-frontend
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Database Setup**
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE potassium_factory;
```

5. **Start All Services**
```bash
npm run start:all
```

### Manual Service Start
```bash
# Frontend (Port 3001)
npm start

# Backend API (Port 3000)
node server.js

# Local Image Server (Port 3003)
node local-image-server.js
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Backend API Configuration
REACT_APP_BACKEND_URL=http://localhost:3000

# React Dev Server Port
PORT=3001

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Root!Pass#2025
DB_NAME=potassium_factory

# Local Images Access Password
LOCAL_ACCESS_PASSWORD=idealchip123

# Radar Server Configuration
RADAR_SERVER_IP=192.168.1.14
FTP_PORT=21
UDP_PORT=17081
```

### Database Configuration

The system uses MySQL with the following key tables:
- `users`: User authentication and roles
- `radars`: Radar device configuration
- `fines`: Traffic violations and fines
- `images`: Camera image metadata
- `reports`: Generated reports and analytics

## 📖 Usage

### Starting the System

1. **Start All Services**
```bash
./start-all-systems.sh
```

2. **Access the Application**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Local Images: http://localhost:3003

3. **Default Login**
- Username: admin
- Password: admin123

### Main Modules

#### Dashboard
- Real-time system overview
- Key performance indicators
- Recent violations summary
- System health monitoring

#### Radar Management
- Add/edit radar devices
- Configure detection parameters
- Monitor device status
- View device statistics

#### Fine Management
- View all traffic violations
- Process fines
- Generate violation reports
- Export fine data

#### Plate Recognition
- Upload images for processing
- View OCR results
- Manage recognition accuracy
- Batch processing capabilities

#### Monitoring
- **FTP Monitor**: Real-time camera image feeds
- **UDP Monitor**: Live radar data streams
- **System Logs**: Application monitoring

## 🔌 API Documentation

### Authentication Endpoints
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/verify
```

### Radar Endpoints
```
GET    /api/radars
POST   /api/radars
PUT    /api/radars/:id
DELETE /api/radars/:id
```

### Fine Endpoints
```
GET    /api/fines
POST   /api/fines
PUT    /api/fines/:id
DELETE /api/fines/:id
GET    /api/fines/export
```

### Image Endpoints
```
GET    /api/images
POST   /api/images/upload
GET    /api/images/:id
DELETE /api/images/:id
```

## 🔒 Security Implementation

### Authentication & Authorization
- **JWT Tokens**: Secure session management
- **Role-based Access**: Different permission levels
- **Password Hashing**: bcrypt encryption
- **Session Timeout**: Automatic logout

### Data Security
- **Input Validation**: Server-side validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Content sanitization
- **CORS Configuration**: Controlled cross-origin access

### File Security
- **Upload Restrictions**: File type and size limits
- **Path Traversal Protection**: Secure file access
- **Image Validation**: Content verification

## 🗄️ Database Design

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'operator', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Radars Table
```sql
CREATE TABLE radars (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    ip_address VARCHAR(15) NOT NULL,
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    speed_limit INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Fines Table
```sql
CREATE TABLE fines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    radar_id INT NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    speed_detected DECIMAL(5,2) NOT NULL,
    speed_limit DECIMAL(5,2) NOT NULL,
    fine_amount DECIMAL(10,2) NOT NULL,
    image_path VARCHAR(500),
    status ENUM('pending', 'processed', 'paid', 'cancelled') DEFAULT 'pending',
    detected_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (radar_id) REFERENCES radars(id)
);
```

## 👨‍💻 Development

### Project Structure
```
potassium-frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable components
│   ├── pages/            # Main application pages
│   ├── services/         # API service layer
│   ├── contexts/         # React contexts
│   ├── types/           # TypeScript type definitions
│   └── App.tsx          # Main application component
├── ftp-server/          # FTP server implementation
├── local-image-server.js # Local image serving
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

### Development Scripts
```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Start all services
npm run start:all

# Stop all services
npm run stop:all
```

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Material-UI design system
- Functional components with hooks

## 🚀 Deployment

### Production Build
```bash
# Build the application
npm run build

# Serve static files
serve -s build -l 3001
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Setup
1. Configure production environment variables
2. Set up MySQL database
3. Configure radar server connections
4. Set up SSL certificates
5. Configure reverse proxy (nginx)

## 🔧 Troubleshooting

### Common Issues

#### Connection Issues
```bash
# Check if services are running
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
netstat -tulpn | grep :3003
```

#### Database Issues
```bash
# Check MySQL connection
mysql -u root -p -e "SHOW DATABASES;"

# Reset database
mysql -u root -p < database/schema.sql
```

#### Image Loading Issues
```bash
# Check image server
curl http://localhost:3003/health

# Verify image directory permissions
ls -la /srv/camera_uploads/camera001/192.168.1.54/
```

### Log Files
- Frontend logs: `frontend_dashboard.log`
- Application logs: Check browser console
- Server logs: Check terminal output

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards
- Follow TypeScript best practices
- Use Material-UI components
- Write comprehensive tests
- Document new features
- Follow existing code patterns

## 👨‍💻 Developer Information

**Lead Developer & System Architect**

**Eng. Bashar Zabadani**
- **Email**: basharagb@gmail.com
- **Phone**: +962780853195
- **GitHub**: [@basharagb](https://github.com/basharagb)

### Expertise Areas
- **System Architecture & Design**: Microservices architecture, scalable system design
- **Backend Development**: Node.js, Express, RESTful APIs, database design
- **Database Design**: MySQL optimization, schema design, data modeling
- **API Development**: RESTful services, real-time data processing, WebSocket integration
- **Security Implementation**: JWT authentication, role-based access control, data encryption

### Project Contributions
- Complete system architecture and design
- Frontend development with React/TypeScript
- Backend API development and integration
- Real-time data processing implementation
- Security framework implementation
- Database schema design and optimization
- FTP/UDP integration for radar data
- License plate recognition system integration

---

## 📄 License

This project is proprietary software developed for traffic monitoring and enforcement systems.

## 📞 Support

For technical support or inquiries:
- **Developer**: Eng. Bashar Zabadani
- **Email**: basharagb@gmail.com
- **Phone**: +962780853195

---

**© 2025 Potassium Factory - Radar Speed Detection System**
