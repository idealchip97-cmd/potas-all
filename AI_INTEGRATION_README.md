# 🤖 AI License Plate Recognition Integration

## Overview

This integration adds automatic license plate recognition capabilities to the radar violation system. The AI service monitors the FTP directory (`/srv/processing_inbox`) and automatically processes violation cases with advanced ALPR technology.

## 🎯 Features

- **Automatic Monitoring**: Watches for new violation cases in real-time
- **Enhanced ALPR**: Uses the specialized Jordanian license plate model
- **Organized Output**: Creates `ai` folders with processed images and results
- **JSON Results**: Detailed detection results with confidence scores
- **Multi-Image Support**: Processes all images in each violation case
- **Error Handling**: Robust error handling with fallback modes

## 🏗️ System Architecture

```
Radar System + AI Integration
├── FTP Monitor (watchdog)
│   └── Monitors: /srv/processing_inbox/*/*/case*
├── ALPR Processor
│   ├── Enhanced Jordanian Model (YOLOv11n)
│   └── Standard ALPR (fallback)
└── Case Processor
    ├── Creates: case*/ai/ folders
    ├── Processes: All .jpg images
    └── Generates: ai_detection_results.json
```

## 📁 Directory Structure

After AI processing, each violation case will have this structure:

```
/srv/processing_inbox/camera001/2025-10-14/case001/
├── 20251014120001.jpg          # Original images
├── 20251014120002.jpg
├── 20251014120003.jpg
├── metadata.json               # Original case metadata
├── verdict.json                # Original case verdict
└── ai/                         # 🆕 AI processing results
    ├── processed_20251014120001.jpg
    ├── processed_20251014120002.jpg
    ├── processed_20251014120003.jpg
    └── ai_detection_results.json  # 🆕 AI results
```

## 📊 AI Results JSON Format

```json
{
  "case_id": "camera001:20251014-120000-0001",
  "camera_id": "camera001",
  "processing_timestamp": "2025-10-14T12:00:00",
  "original_case_data": {
    "event_id": "camera001:20251014-120000-0001",
    "speed": 65,
    "limit": 50,
    "decision": "violation"
  },
  "images_processed": 3,
  "total_plates_detected": 2,
  "detected_plates": [
    {
      "plate_text": "123-45678",
      "confidence": 0.89,
      "bbox": [100, 150, 300, 200],
      "detection_method": "enhanced_jordanian_model"
    }
  ],
  "processed_images": [
    {
      "original_path": "/srv/processing_inbox/.../20251014120001.jpg",
      "ai_path": "/srv/processing_inbox/.../ai/processed_20251014120001.jpg",
      "filename": "20251014120001.jpg",
      "alpr_result": {
        "plates_detected": [...],
        "processing_status": "success"
      }
    }
  ],
  "processing_summary": {
    "success_count": 3,
    "error_count": 0,
    "simulation_count": 0
  }
}
```

## 🚀 Installation & Setup

### 1. Install Dependencies

```bash
# Install AI service requirements
pip install -r backend/requirements_ai_service.txt

# Install ALPR system (if not already installed)
cd Automatic-License-Plate-Recognition
pip install -r requirements_enhanced_training.txt
```

### 2. Verify ALPR Model

Ensure the enhanced Jordanian model is available:
```bash
ls -la Automatic-License-Plate-Recognition/quick_training/results/jordanian_plates/weights/best.pt
```

### 3. Start the System

The AI service is now integrated into the main startup script:

```bash
# Start all services including AI
./start-all.sh
```

Or start AI service independently:
```bash
python3 start_ai_service.py
```

## 🧪 Testing

### Test the AI Service

```bash
# Run the test script
python3 test_ai_service.py
```

This will:
1. Create a test violation case
2. Wait for AI processing
3. Verify results are generated
4. Display processing summary

### Manual Testing

1. Create a test case directory:
   ```bash
   mkdir -p /srv/processing_inbox/camera001/2025-10-14/manual_test
   ```

2. Add test images and verdict.json

3. Watch the logs:
   ```bash
   tail -f ai_plate_service.log
   ```

## 📋 Service Management

### Check Service Status

```bash
# Check if AI service is running
pgrep -f "ai_plate_recognition_service.py"

# View logs
tail -f ai_plate_service.log
```

### Start/Stop AI Service

```bash
# Start
python3 start_ai_service.py

# Stop (Ctrl+C or kill process)
pkill -f "ai_plate_recognition_service.py"
```

## 🔧 Configuration

### AI Service Settings

Edit `backend/ai_plate_recognition_service.py` to modify:

- **FTP Root Directory**: Default `/srv/processing_inbox`
- **ALPR Confidence Threshold**: Default `0.1`
- **Processing Timeout**: Default `30 seconds`
- **Model Paths**: Enhanced Jordanian model location

### ALPR Model Configuration

```python
# In ALPRProcessor.__init__()
self.alpr = ALPR(
    detector_model="yolo-v9-t-384-license-plate-end2end",
    ocr_model="cct-xs-v1-global-model",
    detector_conf_thresh=0.1  # Adjust confidence threshold
)
```

## 📊 Monitoring & Logs

### Log Files

- **AI Service**: `ai_plate_service.log`
- **Service Manager**: Console output from `start_ai_service.py`

### Log Levels

- **INFO**: Normal operation, case processing
- **WARNING**: Fallback modes, missing models
- **ERROR**: Processing failures, system errors

### Sample Log Output

```
2025-10-14 12:00:01 - INFO - 🚀 Starting AI Plate Recognition Service
2025-10-14 12:00:02 - INFO - ✅ ALPR libraries loaded successfully
2025-10-14 12:00:03 - INFO - ✅ Loaded enhanced Jordanian ALPR model
2025-10-14 12:00:05 - INFO - 👁️ Started monitoring: /srv/processing_inbox
2025-10-14 12:00:10 - INFO - 📁 New complete case detected: /srv/processing_inbox/camera001/2025-10-14/case001
2025-10-14 12:00:11 - INFO - 🔍 Processing case: /srv/processing_inbox/camera001/2025-10-14/case001
2025-10-14 12:00:12 - INFO - 📸 Found 3 images to process
2025-10-14 12:00:15 - INFO - ✅ Case processing complete: 2 plates detected
```

## 🔍 Troubleshooting

### Common Issues

1. **ALPR Libraries Not Found**
   ```
   ⚠️ ALPR libraries not available, running in simulation mode
   ```
   - Install requirements: `pip install -r backend/requirements_ai_service.txt`
   - Check ALPR system path in code

2. **Enhanced Model Not Found**
   ```
   ⚠️ Enhanced Jordanian model not found, using default
   ```
   - Verify model path: `Automatic-License-Plate-Recognition/quick_training/results/jordanian_plates/weights/best.pt`
   - Train the model if missing

3. **Permission Errors**
   ```
   ❌ Error processing case: Permission denied
   ```
   - Check `/srv/processing_inbox` permissions
   - Run with appropriate user permissions

4. **No Cases Being Processed**
   - Verify FTP directory structure
   - Check if cases have required files (`verdict.json`, images)
   - Review file system monitoring logs

### Debug Mode

Enable debug logging by modifying the logging level:

```python
logging.basicConfig(level=logging.DEBUG, ...)
```

## 🔄 Integration with Existing System

### API Endpoints

The AI results can be accessed through the existing violation API:

```bash
# Get violation with AI results
curl "http://localhost:3003/api/violations/camera001/2025-10-14"
```

### Frontend Integration

The frontend can display AI results by checking for the `ai` folder in violation cases and reading the `ai_detection_results.json` file.

### Database Integration

AI results can be stored in the database by extending the existing violation processing logic to include ALPR data.

## 🎯 Performance

### Processing Speed

- **Per Image**: 10-50ms (depending on hardware)
- **Per Case**: 1-5 seconds (3-6 images typical)
- **Memory Usage**: ~200-500MB (with ALPR models loaded)

### Hardware Requirements

- **Minimum**: 4GB RAM, 2 CPU cores
- **Recommended**: 8GB RAM, 4 CPU cores, GPU (optional)
- **Storage**: 1GB for models and temporary processing

## 🔮 Future Enhancements

1. **Real-time OCR**: Complete plate text recognition
2. **Database Integration**: Store AI results in database
3. **API Endpoints**: RESTful API for AI results
4. **Web Interface**: AI results visualization
5. **Performance Optimization**: GPU acceleration, batch processing
6. **Multi-language Support**: Arabic text recognition

## 🤝 Support

For issues or questions about the AI integration:

- **Developer**: Eng. Bashar Zabadani (basharagb@gmail.com)
- **Company**: iDEALCHiP Technology Co. (https://idealchip.com)
- **Logs**: Check `ai_plate_service.log` for detailed information
- **Test**: Run `python3 test_ai_service.py` to verify functionality

---

**🤖 AI-Powered License Plate Recognition | 🎯 Specialized for Jordan | 🚀 Production Ready**
