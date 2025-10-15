#!/usr/bin/env python3
"""
AI Case Processor for Radar System
Processes cases without verdict.json and generates AI analysis using ALPR
"""

import os
import sys
import json
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import cv2
import numpy as np

# Add ALPR system to path
sys.path.append('/home/rnd2/Desktop/radar_system_clean/Automatic-License-Plate-Recognition')

try:
    # Try to import the Jordanian ALPR system
    sys.path.append('/home/rnd2/Desktop/radar_system_clean/Automatic-License-Plate-Recognition')
    from jordanian_numbers_only_alpr import JordanianNumbersOnlyALPR
    ALPR_AVAILABLE = True
    ALPR_TYPE = "jordanian"
except ImportError:
    try:
        # Fallback to fast_alpr
        from fast_alpr.alpr import ALPR
        from fast_alpr.base import ALPRResult
        ALPR_AVAILABLE = True
        ALPR_TYPE = "fast_alpr"
    except ImportError:
        # Only print warning if not being used as API (when sys.argv has specific commands)
        if len(sys.argv) > 1 and sys.argv[1] in ['process', 'list', 'find']:
            print("Warning: ALPR system not available. Using mock detection.")
        ALPR_AVAILABLE = False
        ALPR_TYPE = "mock"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/rnd2/Desktop/radar_system_clean/ai_processing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MockALPR:
    """Mock ALPR for testing when real ALPR is not available"""
    def __init__(self):
        # Realistic Jordanian plate patterns
        self.jordanian_patterns = [
            "1234567", "2345678", "3456789", "4567890", "5678901",
            "6789012", "7890123", "8901234", "9012345", "0123456",
            "1111111", "2222222", "3333333", "4444444", "5555555",
            "1357924", "2468135", "9876543", "1122334", "5566778"
        ]
    
    def predict(self, image_path: str) -> List[Dict]:
        # Generate realistic Jordanian plate number based on image name
        import hashlib
        import random
        
        # Use image path to generate consistent results
        hash_obj = hashlib.md5(str(image_path).encode())
        hash_int = int(hash_obj.hexdigest()[:8], 16)
        
        # Select a pattern based on hash
        pattern_idx = hash_int % len(self.jordanian_patterns)
        base_plate = self.jordanian_patterns[pattern_idx]
        
        # Add some variation based on image name
        image_name = Path(image_path).name
        if 'camera001' in str(image_path):
            # Camera 1 plates start with 1-3
            plate_num = f"{random.choice(['1', '2', '3'])}{base_plate[1:]}"
        elif 'camera002' in str(image_path):
            # Camera 2 plates start with 4-6
            plate_num = f"{random.choice(['4', '5', '6'])}{base_plate[1:]}"
        else:
            plate_num = base_plate
            
        # Format as Jordanian plate (7 digits, sometimes with dash)
        if len(plate_num) == 7:
            # Sometimes add dash for readability: 123-4567
            if hash_int % 3 == 0:
                formatted_plate = f"{plate_num[:3]}-{plate_num[3:]}"
            else:
                formatted_plate = plate_num
        else:
            formatted_plate = plate_num[:7]  # Ensure 7 digits max
            
        # Generate confidence based on image quality simulation
        base_confidence = 0.75 + (hash_int % 20) / 100  # 0.75 to 0.94
        
        return [{
            'plate': formatted_plate,
            'confidence': round(base_confidence, 2),
            'bbox': [100 + (hash_int % 50), 100 + (hash_int % 30), 200, 150]
        }]

class AICaseProcessor:
    """Main AI Case Processor class"""
    
    def __init__(self, processing_inbox_path: str = "/srv/processing_inbox"):
        self.processing_inbox_path = Path(processing_inbox_path)
        self.alpr = None
        self.init_alpr()
        
    def init_alpr(self):
        """Initialize ALPR system"""
        try:
            if ALPR_AVAILABLE:
                if ALPR_TYPE == "jordanian":
                    self.alpr = JordanianNumbersOnlyALPR()
                    logger.info("Jordanian ALPR system initialized successfully")
                elif ALPR_TYPE == "fast_alpr":
                    self.alpr = ALPR()
                    logger.info("Fast ALPR system initialized successfully")
                else:
                    self.alpr = MockALPR()
                    logger.info("Using Mock ALPR system")
            else:
                self.alpr = MockALPR()
                logger.info("Using Mock ALPR system")
        except Exception as e:
            logger.error(f"Failed to initialize ALPR: {e}")
            self.alpr = MockALPR()
            logger.info("Falling back to Mock ALPR system")
    
    def find_cases_with_verdict(self) -> List[Dict[str, Any]]:
        """Find all cases that HAVE verdict.json - ONLY process cases WITH verdict.json"""
        cases_with_verdict = []
        cases_without_verdict_count = 0
        
        if not self.processing_inbox_path.exists():
            logger.warning(f"Processing inbox path does not exist: {self.processing_inbox_path}")
            return cases_with_verdict
        
        # Scan all camera directories
        for camera_dir in self.processing_inbox_path.iterdir():
            if not camera_dir.is_dir() or not camera_dir.name.startswith('camera'):
                continue
                
            # Scan all date directories
            for date_dir in camera_dir.iterdir():
                if not date_dir.is_dir():
                    continue
                    
                # Scan all case directories
                for case_dir in date_dir.iterdir():
                    if not case_dir.is_dir():
                        continue
                    
                    verdict_file = case_dir / "verdict.json"
                    
                    # CRITICAL: Only process cases that HAVE verdict.json
                    if not verdict_file.exists():
                        cases_without_verdict_count += 1
                        logger.debug(f"SKIPPING case without verdict.json: {case_dir}")
                        continue
                    
                    # Only process cases WITH verdict.json
                    # Find images in the case
                    images = list(case_dir.glob("*.jpg")) + list(case_dir.glob("*.png"))
                    if images:
                        cases_with_verdict.append({
                            'camera_id': camera_dir.name,
                            'date': date_dir.name,
                            'case_id': case_dir.name,
                            'case_path': str(case_dir),
                            'images': [str(img) for img in images],
                            'image_count': len(images)
                        })
        
        logger.info(f"Found {len(cases_with_verdict)} cases WITH verdict.json (will be processed)")
        logger.info(f"Skipped {cases_without_verdict_count} cases WITHOUT verdict.json (not processed)")
        return cases_with_verdict
    
    def create_ai_folder(self, case_path: str) -> str:
        """Create AI folder inside case directory"""
        case_dir = Path(case_path)
        ai_dir = case_dir / "ai"
        
        if not ai_dir.exists():
            ai_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created AI folder: {ai_dir}")
        
        return str(ai_dir)
    
    def process_images_with_alpr(self, images: List[str], ai_folder: str) -> Dict[str, Any]:
        """Process images with ALPR and return detection results"""
        results = {
            'processed_at': datetime.now().isoformat(),
            'total_images': len(images),
            'detections': [],
            'best_detection': None,
            'plate_number': None,
            'confidence': 0.0
        }
        
        best_confidence = 0.0
        best_plate = None
        
        for image_path in images:
            try:
                # Copy image to AI folder for processing
                image_name = Path(image_path).name
                ai_image_path = Path(ai_folder) / image_name
                shutil.copy2(image_path, ai_image_path)
                
                # Process with ALPR
                if ALPR_TYPE == "jordanian":
                    # Use Jordanian ALPR system
                    try:
                        alpr_results = self.alpr.detect_plate(str(ai_image_path))
                        detections = []
                        
                        if alpr_results and 'detections' in alpr_results:
                            for detection in alpr_results['detections']:
                                plate_text = detection.get('plate', 'UNKNOWN')
                                confidence = detection.get('confidence', 0.5)
                                
                                detection_data = {
                                    'image': image_name,
                                    'plate': plate_text,
                                    'confidence': confidence,
                                    'bbox': detection.get('bbox', [0, 0, 100, 100])
                                }
                                detections.append(detection_data)
                                
                                # Track best detection
                                if confidence > best_confidence:
                                    best_confidence = confidence
                                    best_plate = plate_text
                        else:
                            # Single detection format
                            plate_text = alpr_results.get('plate', 'UNKNOWN') if alpr_results else 'UNKNOWN'
                            confidence = alpr_results.get('confidence', 0.5) if alpr_results else 0.5
                            
                            detection_data = {
                                'image': image_name,
                                'plate': plate_text,
                                'confidence': confidence,
                                'bbox': [0, 0, 100, 100]
                            }
                            detections.append(detection_data)
                            
                            if confidence > best_confidence:
                                best_confidence = confidence
                                best_plate = plate_text
                                
                    except Exception as e:
                        logger.error(f"Jordanian ALPR failed for {image_name}: {e}")
                        # Fallback to mock detection
                        detections = [{
                            'image': image_name,
                            'plate': f"ERR-{image_name[:5]}",
                            'confidence': 0.1,
                            'bbox': [0, 0, 100, 100],
                            'error': str(e)
                        }]
                        
                elif ALPR_TYPE == "fast_alpr" and hasattr(self.alpr, 'predict'):
                    # Use fast ALPR
                    image = cv2.imread(str(ai_image_path))
                    if image is not None:
                        alpr_results = self.alpr.predict(image)
                        detections = []
                        
                        for result in alpr_results:
                            if hasattr(result, 'ocr') and result.ocr:
                                plate_text = result.ocr.text
                                confidence = result.ocr.confidence
                            else:
                                # Fallback for different ALPR result formats
                                plate_text = str(result).split()[0] if str(result) else "UNKNOWN"
                                confidence = 0.5
                            
                            detection = {
                                'image': image_name,
                                'plate': plate_text,
                                'confidence': confidence,
                                'bbox': getattr(result.detection, 'bbox', [0, 0, 100, 100]) if hasattr(result, 'detection') else [0, 0, 100, 100]
                            }
                            detections.append(detection)
                            
                            # Track best detection
                            if confidence > best_confidence:
                                best_confidence = confidence
                                best_plate = plate_text
                else:
                    # Use mock ALPR
                    mock_results = self.alpr.predict(str(ai_image_path))
                    detections = []
                    
                    for mock_result in mock_results:
                        detection = {
                            'image': image_name,
                            'plate': mock_result['plate'],
                            'confidence': mock_result['confidence'],
                            'bbox': mock_result['bbox']
                        }
                        detections.append(detection)
                        
                        if mock_result['confidence'] > best_confidence:
                            best_confidence = mock_result['confidence']
                            best_plate = mock_result['plate']
                
                results['detections'].extend(detections)
                
            except Exception as e:
                logger.error(f"Error processing image {image_path}: {e}")
                # Add error detection
                results['detections'].append({
                    'image': Path(image_path).name,
                    'plate': 'ERROR',
                    'confidence': 0.0,
                    'error': str(e)
                })
        
        # Set best detection
        if best_plate:
            results['best_detection'] = {
                'plate': best_plate,
                'confidence': best_confidence
            }
            results['plate_number'] = best_plate
            results['confidence'] = best_confidence
        
        return results
    
    def save_ai_json(self, ai_folder: str, results: Dict[str, Any]) -> str:
        """Save AI processing results to ai.json"""
        ai_json_path = Path(ai_folder) / "ai.json"
        
        with open(ai_json_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved AI results to: {ai_json_path}")
        return str(ai_json_path)
    
    def process_single_case(self, case_info: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single case without verdict.json"""
        logger.info(f"Processing case: {case_info['case_id']} from {case_info['camera_id']}")
        
        # Create AI folder
        ai_folder = self.create_ai_folder(case_info['case_path'])
        
        # Process images with ALPR
        results = self.process_images_with_alpr(case_info['images'], ai_folder)
        
        # Add case metadata
        results.update({
            'camera_id': case_info['camera_id'],
            'date': case_info['date'],
            'case_id': case_info['case_id'],
            'case_path': case_info['case_path'],
            'ai_folder': ai_folder
        })
        
        # Save AI results
        ai_json_path = self.save_ai_json(ai_folder, results)
        results['ai_json_path'] = ai_json_path
        
        return results
    
    def process_all_cases(self) -> List[Dict[str, Any]]:
        """Process all cases WITH verdict.json"""
        cases_with_verdict = self.find_cases_with_verdict()
        processed_results = []
        
        for case_info in cases_with_verdict:
            try:
                result = self.process_single_case(case_info)
                processed_results.append(result)
                logger.info(f"Successfully processed case: {case_info['case_id']}")
            except Exception as e:
                logger.error(f"Failed to process case {case_info['case_id']}: {e}")
                processed_results.append({
                    'case_id': case_info['case_id'],
                    'error': str(e),
                    'status': 'failed'
                })
        
        return processed_results
    
    def get_processed_cases(self, camera_filter: Optional[str] = None, 
                          date_filter: Optional[str] = None,
                          search_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all processed cases with optional filters"""
        processed_cases = []
        
        if not self.processing_inbox_path.exists():
            return processed_cases
        
        # Scan all camera directories
        for camera_dir in self.processing_inbox_path.iterdir():
            if not camera_dir.is_dir() or not camera_dir.name.startswith('camera'):
                continue
            
            # Apply camera filter
            if camera_filter and camera_dir.name != camera_filter:
                continue
                
            # Scan all date directories
            for date_dir in camera_dir.iterdir():
                if not date_dir.is_dir():
                    continue
                
                # Apply date filter
                if date_filter and date_dir.name != date_filter:
                    continue
                    
                # Scan all case directories
                for case_dir in date_dir.iterdir():
                    if not case_dir.is_dir():
                        continue
                    
                    ai_dir = case_dir / "ai"
                    ai_json_file = ai_dir / "ai.json"
                    
                    if ai_json_file.exists():
                        try:
                            with open(ai_json_file, 'r', encoding='utf-8') as f:
                                ai_data = json.load(f)
                            
                            # Apply search filter
                            if search_filter:
                                plate_number = ai_data.get('plate_number', '').lower()
                                case_id = case_dir.name.lower()
                                if (search_filter.lower() not in plate_number and 
                                    search_filter.lower() not in case_id):
                                    continue
                            
                            # Get AI processed images
                            ai_images = list(ai_dir.glob("*.jpg")) + list(ai_dir.glob("*.png"))
                            
                            case_info = {
                                'camera_id': camera_dir.name,
                                'date': date_dir.name,
                                'case_id': case_dir.name,
                                'case_path': str(case_dir),
                                'ai_folder': str(ai_dir),
                                'ai_images': [str(img) for img in ai_images],
                                'plate_number': ai_data.get('plate_number'),
                                'confidence': ai_data.get('confidence', 0.0),
                                'processed_at': ai_data.get('processed_at'),
                                'detection_count': len(ai_data.get('detections', [])),
                                'ai_data': ai_data
                            }
                            
                            processed_cases.append(case_info)
                            
                        except Exception as e:
                            logger.error(f"Error reading AI data for case {case_dir.name}: {e}")
        
        return processed_cases

def main():
    """Main function for command line usage"""
    processor = AICaseProcessor()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "process":
            # Process all cases without verdict.json
            results = processor.process_all_cases()
            print(f"Processed {len(results)} cases")
            
        elif command == "list":
            # List all processed cases
            cases = processor.get_processed_cases()
            print(f"Found {len(cases)} processed cases:")
            for case in cases:
                print(f"  {case['camera_id']}/{case['date']}/{case['case_id']} - {case['plate_number']} ({case['confidence']:.2f})")
                
        elif command == "find":
            # Find cases with verdict.json
            cases = processor.find_cases_with_verdict()
            print(f"Found {len(cases)} cases with verdict.json:")
            for case in cases:
                print(f"  {case['camera_id']}/{case['date']}/{case['case_id']} - {case['image_count']} images")
        else:
            print("Usage: python ai_case_processor.py [process|list|find]")
    else:
        print("AI Case Processor")
        print("Usage: python ai_case_processor.py [process|list|find]")

if __name__ == "__main__":
    main()
