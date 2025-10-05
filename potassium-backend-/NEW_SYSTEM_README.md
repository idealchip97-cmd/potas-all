# New Speeding Car Processing System

## Overview

This document describes the radical changes implemented in the radar speed detection system. The new system processes speeding cars with a completely different approach:

**For every speeding car, 3 photos are taken and saved in a special folder, with each folder containing three photos and a JSON file containing information about the car, speed, and ticket decision.**

## Key Changes

### 1. Static Speed Limit
- **Speed limit is now static: 30 km/h**
- No longer retrieved from external APIs
- Configured in system constants and processing services

### 2. New Folder Structure
```
/srv/processing_inbox/
├── camera002/
│   ├── 2025-10-05/
│   │   ├── camera002:2025-10-05T11:31:48Z:70/
│   │   │   ├── camera002:2025-10-05T11:31:48Z:70_photo_1.jpg
│   │   │   ├── camera002:2025-10-05T11:31:48Z:70_photo_2.jpg
│   │   │   ├── camera002:2025-10-05T11:31:48Z:70_photo_3.jpg
│   │   │   └── verdict.json
│   │   └── [other events...]
│   └── [other dates...]
└── [other cameras...]
```

### 3. Verdict JSON File Structure
Each event folder contains a `verdict.json` file with comprehensive information:

```json
{
  "event_id": "camera002:2025-10-05T11:31:48Z:70",
  "camera_id": "camera002",
  "src_ip": "192.168.1.60",
  "event_ts": 1759663908.0,
  "arrival_ts": 1759663908.1469595,
  "decision": "violation",
  "speed": 70,
  "limit": 30,
  "speed_excess": 40,
  "fine_amount": 200,
  "deserves_ticket": true,
  "plate_number": "ABC123",
  "plate_confidence": 0.95,
  "photos": [
    {
      "photo_number": 1,
      "file_name": "camera002:2025-10-05T11:31:48Z:70_photo_1.jpg",
      "file_size": 1024,
      "plate_detected": "ABC123",
      "confidence": 0.95,
      "processed": true
    },
    {
      "photo_number": 2,
      "file_name": "camera002:2025-10-05T11:31:48Z:70_photo_2.jpg",
      "file_size": 1024,
      "plate_detected": "ABC123",
      "confidence": 0.90,
      "processed": true
    },
    {
      "photo_number": 3,
      "file_name": "camera002:2025-10-05T11:31:48Z:70_photo_3.jpg",
      "file_size": 1024,
      "plate_detected": null,
      "confidence": 0,
      "processed": false
    }
  ],
  "processing_info": {
    "processed_at": "2025-10-05T11:31:50.000Z",
    "processing_version": "2.0.0",
    "speed_limit_source": "static_configuration",
    "total_photos": 3,
    "successful_recognitions": 2
  },
  "payload": {
    "decision": "violation",
    "limit": 30,
    "speed": 70,
    "camera_id": "camera002",
    "event_ts": "2025-10-05T11:31:48Z",
    "event_id": "camera002:2025-10-05T11:31:48Z:70",
    "arrival_ts": 1759663908.1469595
  }
}
```

## New Services

### 1. SpeedingCarProcessorService
**File:** `services/speedingCarProcessorService.js`

Main service that handles the new processing logic:
- Creates event folders with 3 photos
- Generates verdict JSON files
- Processes plate recognition for each photo
- Calculates fines based on speed excess
- Saves data to database with event linking

**Key Methods:**
- `processSpeedingCar(speedingEvent, photoFiles)` - Main processing method
- `createEventFolder(speedingEvent)` - Creates folder structure
- `processPhotos(photoFiles, eventFolder, speedingEvent)` - Handles 3 photos
- `createVerdictFile(speedingEvent, processedPhotos, eventFolder)` - Creates JSON verdict

### 2. Enhanced UDP Listener
**File:** `services/persistentUdpListener.js`

Updated to use the new processing system:
- Detects speed violations (speed > 30 km/h)
- Creates speeding events for new processor
- Falls back to old system if new processing fails
- Links events with database records

## New API Endpoints

### Speeding Car Processor APIs
**Base URL:** `/api/speeding-car-processor`

#### 1. Process Speeding Event
```http
POST /api/speeding-car-processor/process
Content-Type: application/json

{
  "speedingEvent": {
    "event_id": "camera002:2025-10-05T11:31:48Z:70",
    "camera_id": "camera002",
    "speed": 70,
    "event_ts": 1759663908.0
  },
  "photoFiles": ["/path/to/photo1.jpg", "/path/to/photo2.jpg", "/path/to/photo3.jpg"]
}
```

#### 2. Get Events by Date
```http
GET /api/speeding-car-processor/events/2025-10-05?camera_id=camera002
```

#### 3. Get Event Verdict
```http
GET /api/speeding-car-processor/event/camera002:2025-10-05T11:31:48Z:70/verdict?date=2025-10-05&camera_id=camera002
```

#### 4. Get Event Photos
```http
GET /api/speeding-car-processor/event/camera002:2025-10-05T11:31:48Z:70/photos?date=2025-10-05&camera_id=camera002
```

#### 5. Serve Photo File
```http
GET /api/speeding-car-processor/event/camera002:2025-10-05T11:31:48Z:70/photo/camera002:2025-10-05T11:31:48Z:70_photo_1.jpg?date=2025-10-05&camera_id=camera002
```

### Enhanced FTP APIs
**Base URL:** `/api/enhanced-ftp`

#### 1. Process Speeding Event from FTP
```http
POST /api/enhanced-ftp/process-speeding-event
Content-Type: application/json

{
  "speedingEvent": { /* event data */ },
  "ftpImages": ["/path/to/ftp/image1.jpg", "/path/to/ftp/image2.jpg"]
}
```

#### 2. Simulate Speeding Event (Testing)
```http
POST /api/enhanced-ftp/simulate-speeding-event
Content-Type: application/json

{
  "speed": 70,
  "camera_id": "camera002"
}
```

#### 3. Get Processing Inbox Status
```http
GET /api/enhanced-ftp/processing-inbox/status
```

#### 4. Create Test Structure (Testing)
```http
POST /api/enhanced-ftp/create-test-structure
```

## Database Changes

### Updated Models
All relevant models now include an `eventId` field to link records with the new processing system:

1. **RadarReading** - Links radar readings to events
2. **Fine** - Links fines to events
3. **PlateRecognition** - Links plate recognitions to events

### New Indexes
Added database indexes for `eventId` fields to improve query performance.

## Fine Calculation

The system uses a tiered fine structure based on speed excess:

```javascript
if (speedExcess <= 10) return 50;   // 1-10 km/h over: $50
if (speedExcess <= 20) return 100;  // 11-20 km/h over: $100
if (speedExcess <= 30) return 200;  // 21-30 km/h over: $200
return 300; // 30+ km/h over: $300
```

## Testing

### Test Script
**File:** `test_new_system.js`

Comprehensive test suite that verifies:
- Directory structure creation
- Speeding event simulation
- API endpoint functionality
- File system structure
- Verdict JSON content
- Photo processing

**Usage:**
```bash
node test_new_system.js
```

### Manual Testing with APIs

1. **Create test structure:**
```bash
curl -X POST http://localhost:3000/api/enhanced-ftp/create-test-structure
```

2. **Simulate speeding event:**
```bash
curl -X POST http://localhost:3000/api/enhanced-ftp/simulate-speeding-event \
  -H "Content-Type: application/json" \
  -d '{"speed": 75, "camera_id": "camera002"}'
```

3. **Check processing inbox:**
```bash
curl http://localhost:3000/api/enhanced-ftp/processing-inbox/status
```

4. **Get events for today:**
```bash
curl "http://localhost:3000/api/speeding-car-processor/events/$(date +%Y-%m-%d)?camera_id=camera002"
```

## Migration from Old System

### Backward Compatibility
- Old system continues to work for non-violations
- New system only activates for speed violations (speed > 30 km/h)
- Fallback mechanism ensures no data loss

### Data Migration
- Existing data remains unchanged
- New `eventId` fields are nullable
- Database migrations will be applied automatically

## Configuration

### Environment Variables
```bash
# Processing inbox base directory
PROCESSING_INBOX_PATH=/srv/processing_inbox

# Static speed limit (km/h)
STATIC_SPEED_LIMIT=30

# Enable new processing system
NEW_PROCESSING_ENABLED=true
```

### System Constants
Updated in `config/systemConstants.js`:
- Speed limit set to 30 km/h
- Fine calculation tiers
- Processing paths

## Monitoring and Logging

### Log Messages
The system provides detailed logging:
- `🚨 Speed violation detected: X km/h > 30 km/h`
- `📁 Created event folder: /path/to/folder`
- `📸 Copied photo N: filename.jpg`
- `📄 Created verdict file: /path/to/verdict.json`
- `💾 Saved to database: Reading ID X, Y plate records`
- `💰 Fine created: ID X, Amount: $Y`

### Statistics
Available via API:
```http
GET /api/speeding-car-processor/stats
```

## Troubleshooting

### Common Issues

1. **Permission denied on /srv/processing_inbox**
   ```bash
   sudo mkdir -p /srv/processing_inbox
   sudo chown -R $USER:$USER /srv/processing_inbox
   sudo chmod -R 755 /srv/processing_inbox
   ```

2. **Database eventId field missing**
   - Restart the server to apply model changes
   - Check database logs for migration errors

3. **Photos not processing**
   - Check file permissions
   - Verify image paths exist
   - Check plate recognition service status

### Debug Endpoints

1. **Health check:**
```http
GET /health
```

2. **UDP listener status:**
```http
GET /api/udp/status
```

3. **Processing statistics:**
```http
GET /api/speeding-car-processor/stats
```

## Performance Considerations

### Disk Space
- Each event creates 3 photo files + 1 JSON file
- Estimate ~500KB per event (depending on photo quality)
- Implement cleanup policies for old events

### Database Performance
- New indexes on `eventId` fields
- Consider partitioning by date for large datasets
- Monitor query performance on event-related queries

### Processing Load
- Plate recognition runs on each of 3 photos
- Consider async processing for high-volume scenarios
- Monitor CPU and memory usage

## Security

### File Access
- Processing inbox directory should have restricted access
- Photo serving endpoints include basic validation
- Consider adding authentication for sensitive endpoints

### Data Privacy
- Verdict files contain sensitive information
- Implement data retention policies
- Consider encryption for stored photos

## Future Enhancements

### Planned Features
1. **Real-time photo capture** - Integration with camera systems
2. **Advanced plate recognition** - Multiple AI engines
3. **Event correlation** - Link multiple camera events
4. **Automated cleanup** - Old event data management
5. **Dashboard integration** - Frontend for new system

### API Improvements
1. **Pagination** - For large event lists
2. **Filtering** - By speed, camera, date ranges
3. **Bulk operations** - Process multiple events
4. **Webhooks** - Real-time notifications

---

## Summary

The new speeding car processing system represents a fundamental shift in how violations are handled:

✅ **3 photos per speeding car** - Comprehensive evidence collection  
✅ **JSON verdict files** - Structured decision records  
✅ **Static 30 km/h limit** - Simplified configuration  
✅ **Event-based organization** - Clear folder structure  
✅ **Enhanced APIs** - Modern REST endpoints  
✅ **Database integration** - Linked event records  
✅ **Backward compatibility** - Smooth transition  

The system is now ready for production use and provides a solid foundation for future enhancements.
