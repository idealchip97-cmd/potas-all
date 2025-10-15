# 🚗 Potas Radar System - Project Structure

## 📋 Overview
This is a comprehensive **three-in-one project** that combines radar speed detection, automatic license plate recognition (ALPR), and violation management into a unified system.

## 🏗️ Project Architecture

```
radar_system_clean/
├── 🎨 frontend/                    # React Frontend Application
├── 🔧 backend/                     # Node.js Backend API
├── 🤖 Automatic-License-Plate-Recognition/  # AI ALPR System
├── 📊 ai-ftp-server.js            # AI Data Integration Server
├── 🔄 simple_alpr_processor.py    # Main ALPR Processing Script
├── 📁 start-all.sh               # System Startup Script
└── 📄 PROJECT_STRUCTURE.md       # This documentation
```

---

## 🎨 Frontend (`/frontend/`)

**Technology Stack**: React + TypeScript + Material-UI  
**Port**: 3004  
**Purpose**: User interface for radar violation management

### 📂 Frontend Structure
```
frontend/
├── public/
│   └── index.html              # Main HTML template
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── Layout/            # Navigation and layout
│   │   ├── EnhancedViolationCycleMonitor.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/                 # Main application pages
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── Fines.tsx         # Violation management
│   │   ├── FinesImagesMonitor.tsx  # AI-enhanced image viewer
│   │   ├── PlateRecognition.tsx    # ALPR integration page
│   │   ├── Reports.tsx       # Analytics and reports
│   │   └── Login.tsx         # Authentication
│   ├── services/             # API integration
│   │   ├── aiFtpService.ts   # AI data service
│   │   └── ftpClient.ts      # FTP data handling
│   ├── contexts/             # React contexts
│   │   ├── AuthContext.tsx   # Authentication state
│   │   └── ThemeContext.tsx  # UI theme management
│   └── App.tsx              # Main application component
├── package.json              # Dependencies and scripts
└── README.md                # Frontend documentation
```

### 🌟 Key Features
- **Multi-language Support**: Arabic/English interface
- **Real-time Monitoring**: Live violation detection
- **AI Integration**: Displays ALPR processing results
- **Responsive Design**: Works on desktop and mobile
- **Authentication**: Role-based access control

### 🚀 Frontend Startup
```bash
cd frontend/
npm install
npm start
# Runs on http://localhost:3004
```

---

## 🔧 Backend (`/backend/`)

**Technology Stack**: Node.js + Express + MySQL/SQLite  
**Port**: 3000  
**Purpose**: API server for data management and business logic

### 📂 Backend Structure
```
backend/
├── config/
│   ├── database.js           # Database configuration
│   └── ftpConfig.js         # FTP server settings
├── controllers/             # Request handlers
│   ├── authController.js    # Authentication logic
│   ├── fineController.js    # Violation management
│   └── optimizedCarController.js  # Vehicle data
├── routes/                  # API endpoints
│   ├── auth.js             # Authentication routes
│   ├── fines.js            # Violation CRUD operations
│   └── plateRecognitionSync.js  # ALPR integration
├── services/               # Business logic
│   ├── plateRecognitionToFinesSync.js  # AI-DB sync
│   └── ftpService.js       # File transfer handling
├── middleware/
│   └── auth.js             # JWT authentication
├── models/                 # Database models
├── scripts/                # Utility scripts
├── server.js              # Main server file
├── package.json           # Dependencies
└── .env                   # Environment variables
```

### 🌟 Key Features
- **RESTful API**: Complete CRUD operations
- **Authentication**: JWT-based security
- **Database Integration**: MySQL/SQLite support
- **FTP Integration**: File upload/download handling
- **AI Synchronization**: ALPR data integration
- **Real-time Processing**: Live violation detection

### 🚀 Backend Startup
```bash
cd backend/
npm install
node server.js
# Runs on http://localhost:3000
```

---

## 🤖 AI ALPR System (`/Automatic-License-Plate-Recognition/`)

**Technology Stack**: Python + OpenCV + Machine Learning  
**Purpose**: Automatic License Plate Recognition from vehicle images

### 📂 ALPR Structure
```
Automatic-License-Plate-Recognition/
├── assets/                 # Documentation images
├── collected_jordanian_plates/  # Training dataset
├── black_car_training_*/   # Specific training data
├── main.py                # Main ALPR application
├── plate_recognition.py   # Core recognition logic
├── utils/                 # Helper functions
├── models/                # ML model files
├── requirements.txt       # Python dependencies
└── README.md             # ALPR documentation
```

### 🌟 Key Features
- **Jordanian License Plates**: Specialized for local plates
- **Multiple Detection Methods**: Various ML approaches
- **High Accuracy**: Optimized recognition algorithms
- **Batch Processing**: Handle multiple images
- **JSON Output**: Structured results for integration

### 🚀 ALPR Startup
```bash
cd Automatic-License-Plate-Recognition/
pip install -r requirements.txt
python main.py
```

---

## 🔗 System Integration

### 📊 Data Flow
```
Camera/Radar → FTP Upload → Backend Processing → ALPR Analysis → Database Storage → Frontend Display
```

### 🔄 Integration Components

#### 1. **AI FTP Server** (`ai-ftp-server.js`)
- **Port**: 3003
- **Purpose**: Serves AI processing results
- **Endpoints**:
  - `/api/cameras` - List available cameras
  - `/api/ftp-images/violations-cycle` - Get violation data
  - `/api/cameras/{camera}/dates/{date}/cases` - Case-specific data

#### 2. **ALPR Processor** (`simple_alpr_processor.py`)
- **Purpose**: Process images for license plate detection
- **Input**: Vehicle images from FTP
- **Output**: JSON results with plate numbers and confidence
- **Integration**: Results stored in `ai/results/` folders

#### 3. **Synchronization Service**
- **File**: `/backend/services/plateRecognitionToFinesSync.js`
- **Purpose**: Sync ALPR results with violation database
- **Methods**: Timestamp correlation, fuzzy matching

---

## 🚀 Complete System Startup

### Option 1: Manual Startup
```bash
# Terminal 1: Backend
cd backend/
node server.js

# Terminal 2: Frontend  
cd frontend/
npm start

# Terminal 3: AI FTP Server
node ai-ftp-server.js

# Terminal 4: ALPR Processing
cd Automatic-License-Plate-Recognition/
python main.py
```

### Option 2: Automated Startup
```bash
# Use the provided startup script
./start-all.sh
```

---

## 🌐 Access URLs

| Component | URL | Purpose |
|-----------|-----|---------|
| **Frontend** | http://localhost:3004 | Main application interface |
| **Backend API** | http://localhost:3000 | REST API endpoints |
| **AI FTP Server** | http://localhost:3003 | AI data integration |
| **Login Page** | http://localhost:3004/login | Authentication |
| **Dashboard** | http://localhost:3004/dashboard | Main control panel |
| **Fines Management** | http://localhost:3004/fines | Violation management |
| **ALPR Monitor** | http://localhost:3004/plate-recognition | AI processing viewer |

---

## 📁 Data Directories

```
/srv/processing_inbox/      # Violation case processing
├── camera001/
│   ├── 2025-10-06/
│   │   ├── case001/
│   │   │   ├── ai/         # ALPR results
│   │   │   └── *.jpg       # Original images
│   │   └── case002/
│   └── 2025-10-05/
└── camera002/
    └── [similar structure]

/srv/camera_uploads/        # Raw FTP uploads
├── camera001/
└── camera002/
```

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `/backend/.env` | Database and API configuration |
| `/frontend/package.json` | Frontend dependencies and proxy |
| `/backend/config/database.js` | Database connection settings |
| `/backend/config/ftpConfig.js` | FTP server configuration |

---

## 🛠️ Development Workflow

1. **Frontend Development**: Modify React components in `/frontend/src/`
2. **Backend Development**: Add API endpoints in `/backend/routes/`
3. **AI Enhancement**: Improve ALPR algorithms in `/Automatic-License-Plate-Recognition/`
4. **Integration**: Use AI FTP server to connect components
5. **Testing**: Access system through browser at `http://localhost:3004`

---

## 📚 Documentation

- **Frontend**: `/frontend/README.md`
- **Backend**: `/backend/README.md`
- **ALPR**: `/Automatic-License-Plate-Recognition/README.md`
- **API Documentation**: `/backend/docs/`
- **Deployment**: `/DEPLOYMENT.md`

---

## 🎯 System Features

### ✅ **Implemented**
- Multi-camera radar detection
- Automatic license plate recognition
- Real-time violation monitoring
- AI-enhanced image processing
- Multi-language interface (Arabic/English)
- Role-based authentication
- Comprehensive reporting
- FTP integration for image uploads

### 🔄 **Integration Points**
- Frontend ↔ Backend: REST API communication
- Backend ↔ ALPR: File-based data exchange
- ALPR ↔ Database: Automated synchronization
- All Components ↔ AI FTP Server: Centralized data access

---

*This project represents a complete radar violation management system with integrated AI capabilities for automatic license plate recognition.*
