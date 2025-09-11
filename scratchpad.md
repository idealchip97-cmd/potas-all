# Speed Detection Radar System - Backend API

## Task Overview
Create a Node.js server with MySQL for a speed detection system linked to radar devices in a potassium factory. The system includes:
- Internal radars for speed violations
- FTP server connection through Arduino + GSM
- API endpoints for radars, fines, authentication, and reports
- Demo data until real FTP server is ready
- Postman collection for testing

## Project Structure Plan
- [x] Initialize Node.js project with dependencies
- [x] Set up MySQL database schema
- [x] Create authentication system (JWT)
- [x] Implement radar management APIs
- [x] Implement fines management APIs
- [x] Create reports API
- [x] Add demo data seeding
- [x] Create Postman collection
- [x] Write unit tests
- [x] Create git branch and commit

## API Endpoints Required
### Authentication
- POST /api/auth/signup
- POST /api/auth/signin
- POST /api/auth/forgot-password

### Radars
- GET /api/radars (get all radars)
- GET /api/radars/:id (get radar by id)

### Fines
- GET /api/fines (get all fines)
- GET /api/fines/radar/:radarId (get fines by radar id)

### Reports
- GET /api/reports (various report endpoints)

## Database Schema
- users (id, email, password, role, created_at, updated_at)
- radars (id, name, location, ip_address, status, created_at, updated_at)
- fines (id, radar_id, vehicle_plate, speed_detected, speed_limit, fine_amount, timestamp, status)
- reports (aggregated data views)

## Technology Stack
- Node.js + Express.js
- MySQL with Sequelize ORM
- JWT for authentication
- bcrypt for password hashing
- multer for file uploads (future FTP integration)
- cors, helmet for security

## Lessons
(To be updated as we progress)
