#!/usr/bin/env python3
"""
AI License Plate Recognition Service for Radar System
Monitors FTP violation cases and processes images with ALPR
"""

import os
import sys
import json
import time
import logging
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import cv2
import numpy as np
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading
import queue

# Add the ALPR system path
sys.path.append('/home/rnd2/Desktop/radar_system_clean/Automatic-License-Plate-Recognition')

try:
    from ultralytics import YOLO
    from fast_alpr import ALPR
    ALPR_AVAILABLE = True
    print("✅ ALPR libraries loaded successfully")
except ImportError as e:
    print(f"⚠️ ALPR libraries not available: {e}")
    ALPR_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/rnd2/Desktop/radar_system_clean/ai_plate_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ALPRProcessor:
    """ALPR processing engine using the enhanced Jordanian model"""
    
    def __init__(self):
        self.alpr = None
        self.custom_model = None
        self.initialize_models()
    
    def initialize_models(self):
        """Initialize ALPR models"""
        if not ALPR_AVAILABLE:
            logger.warning("ALPR libraries not available, running in simulation mode")
            return
        
        try:
            # Try to load the enhanced Jordanian model first
            custom_model_path = '/home/rnd2/Desktop/radar_system_clean/Automatic-License-Plate-Recognition/quick_training/results/jordanian_plates/weights/best.pt'
            if os.path.exists(custom_model_path):
                self.custom_model = YOLO(custom_model_path)
                logger.info("✅ Loaded enhanced Jordanian ALPR model")
            else:
                logger.warning("⚠️ Enhanced Jordanian model not found, using default")
            
            # Initialize standard ALPR
            self.alpr = ALPR(
                detector_model="yolo-v9-t-384-license-plate-end2end",
                ocr_model="cct-xs-v1-global-model",
                detector_conf_thresh=0.1
            )
            logger.info("✅ Standard ALPR model initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize ALPR models: {e}")
            self.alpr = None
            self.custom_model = None
    
    def process_image(self, image_path: str) -> Dict:
        """Process a single image and extract license plate information"""
        result = {
            'image_path': image_path,
            'timestamp': datetime.now().isoformat(),
            'plates_detected': [],
            'processing_status': 'success',
            'error': None
        }
        
        if not ALPR_AVAILABLE or (not self.alpr and not self.custom_model):
            # Simulation mode for testing
            result['plates_detected'] = [{
                'plate_text': 'SIMULATED-123',
                'confidence': 0.85,
                'bbox': [100, 100, 200, 150],
                'detection_method': 'simulation'
            }]
            result['processing_status'] = 'simulation'
            return result
        
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                result['processing_status'] = 'error'
                result['error'] = 'Could not load image'
                return result
            
            plates = []
            
            # Try custom model first if available
            if self.custom_model:
                try:
                    custom_results = self.custom_model(image_path)
                    for r in custom_results:
                        boxes = r.boxes
                        if boxes is not None:
                            for box in boxes:
                                confidence = box.conf[0].item()
                                coords = box.xyxy[0].tolist()
                                
                                plates.append({
                                    'plate_text': f'DETECTED-{int(confidence*1000)}',  # Placeholder
                                    'confidence': confidence,
                                    'bbox': coords,
                                    'detection_method': 'enhanced_jordanian_model'
                                })
                    
                    if plates:
                        result['plates_detected'] = plates
                        return result
                        
                except Exception as e:
                    logger.warning(f"Custom model failed, trying standard ALPR: {e}")
            
            # Use standard ALPR if custom model failed or no plates found
            if self.alpr:
                alpr_results = self.alpr.predict(image_path)
                for alpr_result in alpr_results:
                    plates.append({
                        'plate_text': alpr_result.get('plate', 'UNKNOWN'),
                        'confidence': alpr_result.get('confidence', 0.0),
                        'bbox': alpr_result.get('bbox', [0, 0, 0, 0]),
                        'detection_method': 'standard_alpr'
                    })
            
            result['plates_detected'] = plates
            
        except Exception as e:
            logger.error(f"Error processing image {image_path}: {e}")
            result['processing_status'] = 'error'
            result['error'] = str(e)
        
        return result

class ViolationCaseProcessor:
    """Processes individual violation cases"""
    
    def __init__(self, alpr_processor: ALPRProcessor):
        self.alpr = alpr_processor
    
    def process_case(self, case_path: Path) -> Dict:
        """Process a complete violation case"""
        logger.info(f"🔍 Processing case: {case_path}")
        
        # Create AI folder
        ai_folder = case_path / 'ai'
        ai_folder.mkdir(exist_ok=True)
        
        # Load existing case data
        verdict_file = case_path / 'verdict.json'
        metadata_file = case_path / 'metadata.json'
        
        case_data = {}
        if verdict_file.exists():
            with open(verdict_file, 'r') as f:
                case_data = json.load(f)
        
        # Find all image files
        image_files = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.bmp']:
            image_files.extend(case_path.glob(ext))
        
        logger.info(f"📸 Found {len(image_files)} images to process")
        
        # Process each image
        processed_images = []
        detected_plates = []
        
        for img_file in image_files:
            if img_file.name.startswith('.') or 'ai' in str(img_file):
                continue
                
            logger.info(f"🖼️ Processing image: {img_file.name}")
            
            # Process with ALPR
            alpr_result = self.alpr.process_image(str(img_file))
            
            # Copy processed image to AI folder
            ai_image_path = ai_folder / f"processed_{img_file.name}"
            shutil.copy2(img_file, ai_image_path)
            
            # Add to results
            processed_images.append({
                'original_path': str(img_file),
                'ai_path': str(ai_image_path),
                'filename': img_file.name,
                'alpr_result': alpr_result
            })
            
            # Collect all detected plates
            if alpr_result['plates_detected']:
                detected_plates.extend(alpr_result['plates_detected'])
        
        # Generate AI results JSON
        ai_results = {
            'case_id': case_data.get('event_id', case_path.name),
            'camera_id': case_data.get('camera_id', 'unknown'),
            'processing_timestamp': datetime.now().isoformat(),
            'original_case_data': case_data,
            'images_processed': len(processed_images),
            'total_plates_detected': len(detected_plates),
            'detected_plates': detected_plates,
            'processed_images': processed_images,
            'ai_folder_path': str(ai_folder),
            'processing_summary': {
                'success_count': len([img for img in processed_images if img['alpr_result']['processing_status'] == 'success']),
                'error_count': len([img for img in processed_images if img['alpr_result']['processing_status'] == 'error']),
                'simulation_count': len([img for img in processed_images if img['alpr_result']['processing_status'] == 'simulation'])
            }
        }
        
        # Save AI results
        ai_results_file = ai_folder / 'ai_detection_results.json'
        with open(ai_results_file, 'w') as f:
            json.dump(ai_results, f, indent=2)
        
        logger.info(f"✅ Case processing complete: {len(detected_plates)} plates detected")
        return ai_results

class FTPMonitorHandler(FileSystemEventHandler):
    """Monitors FTP directory for new violation cases"""
    
    def __init__(self, processor_queue: queue.Queue):
        self.processor_queue = processor_queue
        self.processed_cases = set()
    
    def on_created(self, event):
        if event.is_directory:
            self.check_case_folder(Path(event.src_path))
    
    def on_modified(self, event):
        if event.is_directory:
            self.check_case_folder(Path(event.src_path))
    
    def check_case_folder(self, folder_path: Path):
        """Check if a folder is a complete violation case"""
        if not self.is_case_folder(folder_path):
            return
        
        case_id = str(folder_path)
        if case_id in self.processed_cases:
            return
        
        # Check if case has required files
        if self.is_case_complete(folder_path):
            logger.info(f"📁 New complete case detected: {folder_path}")
            self.processor_queue.put(folder_path)
            self.processed_cases.add(case_id)
    
    def is_case_folder(self, folder_path: Path) -> bool:
        """Check if folder looks like a case folder"""
        return (
            'case' in folder_path.name.lower() or
            folder_path.name.startswith('case') or
            len(list(folder_path.glob('*.jpg'))) > 0
        )
    
    def is_case_complete(self, folder_path: Path) -> bool:
        """Check if case has all required files"""
        has_images = len(list(folder_path.glob('*.jpg'))) > 0
        has_verdict = (folder_path / 'verdict.json').exists()
        has_ai_folder = (folder_path / 'ai').exists()
        
        return has_images and has_verdict and not has_ai_folder

class AIPlateRecognitionService:
    """Main service class"""
    
    def __init__(self, ftp_root: str = "/srv/processing_inbox"):
        self.ftp_root = Path(ftp_root)
        self.alpr_processor = ALPRProcessor()
        self.case_processor = ViolationCaseProcessor(self.alpr_processor)
        self.processor_queue = queue.Queue()
        self.running = False
        self.observer = None
        self.worker_thread = None
    
    def start(self):
        """Start the AI service"""
        logger.info("🚀 Starting AI Plate Recognition Service")
        
        if not self.ftp_root.exists():
            logger.error(f"❌ FTP root directory does not exist: {self.ftp_root}")
            return False
        
        self.running = True
        
        # Process existing cases first
        self.process_existing_cases()
        
        # Start file system monitoring
        self.start_monitoring()
        
        # Start worker thread
        self.worker_thread = threading.Thread(target=self.worker_loop, daemon=True)
        self.worker_thread.start()
        
        logger.info("✅ AI Plate Recognition Service started successfully")
        return True
    
    def stop(self):
        """Stop the AI service"""
        logger.info("🛑 Stopping AI Plate Recognition Service")
        self.running = False
        
        if self.observer:
            self.observer.stop()
            self.observer.join()
        
        if self.worker_thread:
            self.worker_thread.join(timeout=5)
        
        logger.info("✅ AI Plate Recognition Service stopped")
    
    def process_existing_cases(self):
        """Process any existing cases that haven't been processed"""
        logger.info("🔍 Scanning for existing unprocessed cases...")
        
        case_count = 0
        for camera_dir in self.ftp_root.iterdir():
            if not camera_dir.is_dir() or camera_dir.name.startswith('.'):
                continue
                
            for date_dir in camera_dir.iterdir():
                if not date_dir.is_dir() or date_dir.name.startswith('.'):
                    continue
                    
                for case_dir in date_dir.iterdir():
                    if not case_dir.is_dir() or case_dir.name.startswith('.'):
                        continue
                    
                    # Check if this case needs processing
                    if self.needs_processing(case_dir):
                        logger.info(f"📁 Queuing existing case: {case_dir}")
                        self.processor_queue.put(case_dir)
                        case_count += 1
        
        logger.info(f"📊 Found {case_count} existing cases to process")
    
    def needs_processing(self, case_dir: Path) -> bool:
        """Check if a case directory needs AI processing"""
        has_images = len(list(case_dir.glob('*.jpg'))) > 0
        has_verdict = (case_dir / 'verdict.json').exists()
        has_ai_results = (case_dir / 'ai' / 'ai_detection_results.json').exists()
        
        return has_images and has_verdict and not has_ai_results
    
    def start_monitoring(self):
        """Start file system monitoring"""
        handler = FTPMonitorHandler(self.processor_queue)
        self.observer = Observer()
        self.observer.schedule(handler, str(self.ftp_root), recursive=True)
        self.observer.start()
        logger.info(f"👁️ Started monitoring: {self.ftp_root}")
    
    def worker_loop(self):
        """Main worker loop for processing cases"""
        logger.info("🔄 Worker thread started")
        
        while self.running:
            try:
                # Get case from queue (with timeout)
                case_path = self.processor_queue.get(timeout=1)
                
                # Process the case
                try:
                    result = self.case_processor.process_case(case_path)
                    logger.info(f"✅ Successfully processed case: {case_path}")
                except Exception as e:
                    logger.error(f"❌ Error processing case {case_path}: {e}")
                
                self.processor_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"❌ Worker loop error: {e}")
        
        logger.info("🔄 Worker thread stopped")

def main():
    """Main entry point"""
    service = AIPlateRecognitionService()
    
    try:
        if service.start():
            logger.info("🎯 AI Plate Recognition Service is running...")
            logger.info("Press Ctrl+C to stop")
            
            # Keep running until interrupted
            while True:
                time.sleep(1)
                
    except KeyboardInterrupt:
        logger.info("👋 Received interrupt signal")
    except Exception as e:
        logger.error(f"❌ Service error: {e}")
    finally:
        service.stop()

if __name__ == "__main__":
    main()
