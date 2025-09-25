# External Data Integration - FTP & UDP Services

## Overview

This document describes the integration of external FTP and UDP services to replace demo data with real-time data from external servers. The system now connects to:

- **FTP Server**: `192.186.1.14:21` for downloading images for plate recognition
- **UDP Server**: `192.186.1.14:17081` for receiving radar and fines data

## Architecture

### Services Structure

```
External Data Service (Coordinator)
├── FTP Service (Image Downloads)
├── UDP Service (Real-time Data Reception)
└── Data Processor Service (Data Integration)
```

### Data Flow

1. **FTP Service** connects to external FTP server and downloads new images
2. **Enhanced Vision Service** processes images for plate recognition
3. **UDP Service** listens for incoming radar/fines data
4. **Data Processor** integrates all data into the database
5. **API Endpoints** provide monitoring and control

## Services

### 1. FTP Service (`services/ftpService.js`)

**Purpose**: Downloads images from external FTP server for plate recognition

**Key Features**:
- Automatic connection management with reconnection logic
- Image file filtering (jpg, jpeg, png, bmp, gif)
- Batch download capabilities
- Health monitoring
- Event-driven architecture

**Configuration**:
```env
FTP_HOST=192.186.1.14
FTP_PORT=21
FTP_USER=anonymous
FTP_PASSWORD=anonymous@
```

**Events Emitted**:
- `connected` - FTP connection established
- `disconnected` - FTP connection lost
- `error` - Connection or operation error
- `imageDownloaded` - New image downloaded

### 2. UDP Service (`services/udpService.js`)

**Purpose**: Listens for real-time radar and fines data from external UDP server

**Key Features**:
- Flexible message parsing (JSON and delimited formats)
- Automatic data type detection (radar, fine, violation)
- Message deduplication
- Health monitoring
- Bidirectional communication support

**Configuration**:
```env
UDP_HOST=192.186.1.14
UDP_PORT=17081
UDP_LOCAL_PORT=17081
```

**Supported Data Formats**:

**JSON Format**:
```json
{
  "radarId": "R001",
  "location": "Main Gate",
  "status": "active",
  "lastPing": "2024-01-01T10:00:00Z"
}
```

**Delimited Format**:
```
fine,ABC123,80,50,R001
radar,R002,Highway 1,active
```

**Events Emitted**:
- `listening` - UDP server started
- `closed` - UDP server stopped
- `radarData` - Radar information received
- `fineData` - Fine/violation data received
- `violationData` - Violation data received
- `unknownData` - Unrecognized data format

### 3. Data Processor Service (`services/dataProcessorService.js`)

**Purpose**: Processes and integrates external data into the database

**Key Features**:
- Image processing with AI vision services
- Automatic radar creation/updates
- Fine calculation based on speed violations
- Message deduplication
- Statistics tracking

**Processing Logic**:
- **Images**: Enhanced vision service → PlateRecognition + Car records
- **Radar Data**: Create/update Radar records
- **Fine Data**: Create Fine + Violation records
- **Violation Data**: Create Violation records

### 4. External Data Service (`services/externalDataService.js`)

**Purpose**: Coordinates all external data services and provides unified interface

**Key Features**:
- Service lifecycle management
- Event coordination
- Scheduled tasks (cron jobs)
- Statistics collection
- Health monitoring

**Scheduled Tasks**:
- **Image Check**: Every 5 minutes
- **Cleanup**: Every hour (remove old processed messages)
- **Health Check**: Every 10 minutes

## API Endpoints

All endpoints require authentication. Admin role required for control operations.

### Service Management

#### Get Service Status
```http
GET /api/external-data/status
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "ftp": {
        "status": "healthy",
        "connected": true,
        "server": "192.186.1.14:21"
      },
      "udp": {
        "status": "healthy",
        "listening": true,
        "address": {"address": "0.0.0.0", "port": 17081}
      }
    },
    "stats": {
      "imagesProcessed": 15,
      "radarUpdates": 8,
      "finesReceived": 23,
      "errors": 0
    }
  }
}
```

#### Start Services (Admin Only)
```http
POST /api/external-data/start
Authorization: Bearer <admin-token>
```

#### Stop Services (Admin Only)
```http
POST /api/external-data/stop
Authorization: Bearer <admin-token>
```

### Manual Operations

#### Manual FTP Check (Admin Only)
```http
POST /api/external-data/ftp/check
Authorization: Bearer <admin-token>
```

#### Send Test UDP Message (Admin Only)
```http
POST /api/external-data/udp/test
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "message": "test,ABC123,75,50,R001"
}
```

### Monitoring

#### Get Statistics
```http
GET /api/external-data/stats
Authorization: Bearer <token>
```

#### Get Activity Log
```http
GET /api/external-data/activity
Authorization: Bearer <token>
```

#### Health Check (Public)
```http
GET /api/external-data/health
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# External Data Services Configuration
FTP_HOST=192.186.1.14
FTP_PORT=21
FTP_USER=anonymous
FTP_PASSWORD=anonymous@

UDP_HOST=192.186.1.14
UDP_PORT=17081
UDP_LOCAL_PORT=17081

# Auto-start external data service on server startup
AUTO_START_EXTERNAL_DATA=false
```

### Auto-Start Configuration

Set `AUTO_START_EXTERNAL_DATA=true` to automatically start external data services when the server starts.

## Usage Examples

### Starting the Services

1. **Manual Start via API**:
```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@potasfactory.com","password":"admin123"}'

# Start external data services
curl -X POST http://localhost:3000/api/external-data/start \
  -H "Authorization: Bearer <admin-token>"
```

2. **Auto-Start on Server Boot**:
```bash
# Set environment variable
export AUTO_START_EXTERNAL_DATA=true

# Start server
npm start
```

### Monitoring Services

```bash
# Check service health
curl http://localhost:3000/api/external-data/health

# Get detailed status (requires auth)
curl -X GET http://localhost:3000/api/external-data/status \
  -H "Authorization: Bearer <token>"

# Get statistics
curl -X GET http://localhost:3000/api/external-data/stats \
  -H "Authorization: Bearer <token>"
```

### Manual Operations

```bash
# Trigger manual FTP check
curl -X POST http://localhost:3000/api/external-data/ftp/check \
  -H "Authorization: Bearer <admin-token>"

# Send test UDP message
curl -X POST http://localhost:3000/api/external-data/udp/test \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"fine,TEST123,85,60,R001"}'
```

## Data Processing

### Image Processing Flow

1. FTP service downloads new images to `uploads/ftp-images/`
2. Enhanced vision service processes image:
   - ChatGPT Vision API (primary)
   - Tesseract OCR (fallback)
   - Mock recognition (development)
3. Creates `PlateRecognition` record with metadata
4. Creates `Car` record if vehicle details detected
5. Emits `imageProcessed` event

### UDP Data Processing Flow

1. UDP service receives message
2. Parses message (JSON or delimited format)
3. Identifies data type (radar/fine/violation)
4. Data processor creates/updates database records:
   - **Radar data** → `Radar` table
   - **Fine data** → `Fine` + `Violation` tables
   - **Violation data** → `Violation` table
5. Emits processing events

### Fine Calculation

Speed violations automatically calculate fines:

| Overspeed | Fine Amount |
|-----------|-------------|
| 1-10 km/h | $100 |
| 11-20 km/h | $200 |
| 21-30 km/h | $400 |
| 31-50 km/h | $800 |
| 50+ km/h | $1500 |

## Error Handling

### Connection Failures

- **FTP**: Automatic reconnection attempts with exponential backoff
- **UDP**: Service restart on critical errors
- **Database**: Transaction rollback on processing errors

### Data Validation

- **Images**: File type and size validation
- **UDP Messages**: Format validation and sanitization
- **Duplicates**: Message hash-based deduplication

### Monitoring

- Health checks every 10 minutes
- Error counting and reporting
- Service status tracking
- Performance metrics collection

## Testing

Run the comprehensive test suite:

```bash
# Run all external data tests
npm test tests/externalData.test.js

# Run specific test categories
npm test -- --testNamePattern="FTP Service"
npm test -- --testNamePattern="UDP Service"
npm test -- --testNamePattern="Data Processor"
```

## Troubleshooting

### Common Issues

1. **FTP Connection Failed**
   - Check network connectivity to `192.186.1.14:21`
   - Verify FTP credentials
   - Check firewall settings

2. **UDP Not Receiving Data**
   - Verify UDP port `17081` is not blocked
   - Check if another service is using the port
   - Confirm external server is sending to correct IP

3. **Images Not Processing**
   - Check `uploads/ftp-images/` directory permissions
   - Verify AI services (OpenAI API key) configuration
   - Check image file formats are supported

4. **Database Errors**
   - Ensure database connection is stable
   - Check for missing foreign key relationships
   - Verify table schemas are up to date

### Debug Mode

Enable detailed logging:

```env
NODE_ENV=development
DEBUG=external-data:*
```

### Service Status Check

```bash
# Quick health check
curl http://localhost:3000/api/external-data/health

# Detailed status
curl -X GET http://localhost:3000/api/external-data/status \
  -H "Authorization: Bearer <token>"
```

## Performance Considerations

### FTP Service
- Downloads are batched to avoid overwhelming the server
- Images are processed asynchronously
- Old processed images can be archived/deleted

### UDP Service
- Message parsing is optimized for high throughput
- Duplicate detection uses efficient hashing
- Background cleanup prevents memory leaks

### Database
- Bulk operations for multiple records
- Proper indexing on frequently queried fields
- Connection pooling for concurrent operations

## Security

### Network Security
- FTP uses standard authentication
- UDP messages should be validated and sanitized
- Consider VPN or secure network for production

### Data Security
- Uploaded images are stored securely
- Database access uses parameterized queries
- API endpoints require proper authentication

### Access Control
- Service management requires admin role
- Monitoring endpoints require authentication
- Health check endpoint is public (status only)

## Future Enhancements

### Planned Features
- SFTP support for secure file transfer
- Message encryption for UDP communications
- Advanced image preprocessing
- Real-time dashboard for monitoring
- Automated backup and archival
- Load balancing for high-volume scenarios

### Integration Possibilities
- Webhook notifications for processed data
- Integration with external notification systems
- Advanced analytics and reporting
- Machine learning for improved recognition accuracy
