# Radar Speed Detection System - Backend API

A Node.js backend API for managing speed detection radars in a potassium factory environment.

## Features

- **Authentication System**: JWT-based authentication with signup, signin, and password reset
- **Radar Management**: CRUD operations for radar devices
- **Fine Management**: Track and manage speed violations
- **Reports**: Generate various reports on violations and radar performance
- **Demo Data**: Pre-populated test data for development

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/forgot-password` - Password reset

### Radars
- `GET /api/radars` - Get all radars
- `GET /api/radars/:id` - Get radar by ID

### Fines
- `GET /api/fines` - Get all fines
- `GET /api/fines/radar/:radarId` - Get fines by radar ID

### Reports
- `GET /api/reports` - Get system reports

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure your database
4. Run the server: `npm run dev`

## Database Setup

Make sure you have MySQL installed and create a database named `radar_speed_detection`.

## Testing

Use the provided Postman collection to test all API endpoints.

## Future Integration

The system is designed to integrate with FTP servers receiving data from Arduino-based radar devices with GSM connectivity.
# potassium-backend-
