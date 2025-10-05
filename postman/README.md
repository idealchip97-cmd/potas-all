# Potassium Factory API - Postman Collection

This directory contains the complete Postman collection for the Potassium Factory API, which includes both Radar Speed Detection and License Plate Recognition systems.

## 📁 Files

- `Potassium_Factory_Complete_API.postman_collection.json` - Main API collection
- `Potassium_Factory_Environment.postman_environment.json` - Environment variables
- `README.md` - This documentation file

## 🚀 Quick Setup

### 1. Import Collection
1. Open Postman
2. Click "Import" button
3. Select `Potassium_Factory_Complete_API.postman_collection.json`
4. Import `Potassium_Factory_Environment.postman_environment.json`

### 2. Configure Environment
1. Select "Potassium Factory - Development Environment" from the environment dropdown
2. Ensure `baseUrl` is set to `http://localhost:3000` (or your server URL)
3. The authentication token will be automatically set when you sign in

### 3. Start Testing
1. Ensure your server is running (`npm run dev`)
2. Run the "Sign In" request first to get authentication token
3. The token will be automatically saved for subsequent requests

## 📋 API Categories

### 🔐 Authentication
- **Sign Up** - Register new user accounts
- **Sign In** - Authenticate and get JWT token (auto-saves token)

### 📡 Radar Management
- **Get All Radars** - List all radar devices with pagination
- **Get Radar by ID** - Get specific radar details
- **Create Radar** - Add new radar device
- **Update Radar** - Modify radar information
- **Delete Radar** - Remove radar device

### 🚨 Fines Management
- **Get All Fines** - List fines with filtering and pagination
- **Get Fine by ID** - Get specific fine details
- **Get Fines by Radar** - Get all fines for a specific radar
- **Create Fine** - Record new speed violation
- **Update Fine Status** - Update fine status and information

### 🔍 License Plate Recognition
- **Process Images** - Upload and process images for plate recognition
- **Get All Recognition Results** - List all recognition results
- **Get Recognition Result by ID** - Get specific result details
- **Delete Recognition Result** - Remove result and associated image
- **Get Recognition Statistics** - View processing statistics

### 📊 Reports & Analytics
- **Radar Performance Report** - Performance metrics for radars
- **Violations by Location Report** - Location-based violation statistics
- **Speed Distribution Report** - Speed distribution analytics
- **Daily Violations Trend** - Daily trend analysis

### 🔧 System Health
- **Health Check** - API health status (no auth required)
- **System Statistics** - Overall system statistics

## 🔑 Authentication

Most endpoints require authentication. The collection includes:

### Demo Accounts
- **Admin**: `admin@potasfactory.com` / `admin123`
- **Operator**: `operator@potasfactory.com` / `operator123`
- **Viewer**: `viewer@potasfactory.com` / `viewer123`

### Auto-Token Management
The "Sign In" request automatically:
1. Extracts the JWT token from response
2. Saves it to the `authToken` environment variable
3. Makes it available for all subsequent requests

## 📝 Usage Examples

### Basic Workflow
1. **Sign In** with admin credentials
2. **Get All Radars** to see available devices
3. **Get All Fines** to see violation records
4. **Process Images** to test plate recognition
5. **Get Recognition Statistics** to view processing stats

### File Upload (Plate Recognition)
For the "Process Images" endpoint:
1. Select the request
2. Go to "Body" tab
3. Select "form-data"
4. Set key as "images" and type as "File"
5. Choose image files to upload

## 🛠️ Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API server URL | `http://localhost:3000` |
| `authToken` | JWT authentication token | Auto-set on sign in |
| `userId` | Current user ID | Auto-set on sign in |
| `adminEmail` | Admin account email | `admin@potasfactory.com` |
| `adminPassword` | Admin account password | `admin123` |

## 🔧 Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Ensure you've signed in and token is set
   - Check if token has expired (sign in again)

2. **Server Connection Error**
   - Verify server is running on correct port
   - Check `baseUrl` in environment variables

3. **File Upload Issues**
   - Ensure images are in supported formats (jpg, png, bmp, gif)
   - Check file size limits (10MB max)

### Server Setup
```bash
# Start the server
npm run dev

# Seed database with demo data
npm run seed

# Run tests
npm test
```

## 📊 Response Examples

### Successful Authentication
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@potasfactory.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin"
    }
  }
}
```

### Radar List Response
```json
{
  "success": true,
  "data": {
    "radars": [
      {
        "id": 1,
        "deviceId": "RADAR-001",
        "location": "Main Gate",
        "speedLimit": 30,
        "status": "active",
        "fineCount": 15
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

## 🔄 Updates

This collection is automatically updated when new endpoints are added to the API. Check the modification date of the collection file for the latest version.

---

**Note**: This collection covers all current API endpoints. For the most up-to-date API documentation, refer to the main project README.md file.
