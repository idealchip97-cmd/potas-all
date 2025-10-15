#!/usr/bin/env python3
"""
Process All FTP Images Script
Processes all images in FTP directories with ALPR system
"""

import os
import sys
import json
import shutil
import cv2
import numpy as np
from pathlib import Path
from datetime import datetime
import logging

# Add the ALPR project to Python path
ALPR_PROJECT_PATH = "/home/rnd2/Desktop/radar_system_clean/Automatic-License-Plate-Recognition"
sys.path.insert(0, ALPR_PROJECT_PATH)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def find_all_case_directories():
    """Find all case directories with AI folders"""
    processing_inbox = Path("/srv/processing_inbox")
    case_dirs = []
    
    for case_dir in processing_inbox.rglob("case*"):
        if case_dir.is_dir():
            ai_folder = case_dir / "ai"
            if ai_folder.exists():
                case_dirs.append(case_dir)
    
    return case_dirs

def get_image_files(case_dir):
    """Get all image files in a case directory"""
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
    image_files = []
    
    for file_path in case_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in image_extensions:
            image_files.append(file_path)
    
    return image_files

def simple_alpr_processing(image_path):
    """Simple ALPR processing using OpenCV and basic techniques"""
    try:
        # Read image
        image = cv2.imread(str(image_path))
        if image is None:
            return None
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply some basic preprocessing
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours that could be license plates
        potential_plates = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 1000:  # Minimum area threshold
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h
                if 2.0 < aspect_ratio < 6.0:  # Typical license plate aspect ratio
                    potential_plates.append({
                        'bbox': [x, y, w, h],
                        'area': area,
                        'aspect_ratio': aspect_ratio,
                        'confidence': min(area / 10000, 1.0)  # Simple confidence based on area
                    })
        
        return {
            'image_path': str(image_path),
            'plates_detected': len(potential_plates),
            'plates': potential_plates,
            'processing_time': 0.1,
            'status': 'success' if potential_plates else 'no_plates_detected'
        }
        
    except Exception as e:
        logger.error(f"Error processing {image_path}: {e}")
        return {
            'image_path': str(image_path),
            'plates_detected': 0,
            'plates': [],
            'error': str(e),
            'status': 'error'
        }

def enhanced_alpr_processing(image_path):
    """Enhanced ALPR processing using the AI system"""
    try:
        # Try to import and use the enhanced ALPR system
        try:
            from enhanced_dynamic_alpr_system import EnhancedDynamicALPRSystem
            alpr_system = EnhancedDynamicALPRSystem()
            result = alpr_system.process_image_comprehensively(str(image_path))
            
            if result and 'plates' in result:
                return {
                    'image_path': str(image_path),
                    'plates_detected': len(result['plates']),
                    'plates': result['plates'],
                    'confidence_scores': [plate.get('confidence', 0) for plate in result['plates']],
                    'processing_time': result.get('processing_time', 0),
                    'status': 'success',
                    'method': 'enhanced_alpr'
                }
            else:
                return {
                    'image_path': str(image_path),
                    'plates_detected': 0,
                    'plates': [],
                    'status': 'no_plates_detected',
                    'method': 'enhanced_alpr'
                }
        except ImportError:
            logger.warning("Enhanced ALPR system not available, using simple processing")
            return simple_alpr_processing(image_path)
            
    except Exception as e:
        logger.error(f"Error in enhanced ALPR processing: {e}")
        return simple_alpr_processing(image_path)

def process_case_directory(case_dir):
    """Process all images in a case directory"""
    logger.info(f"Processing case directory: {case_dir}")
    
    ai_folder = case_dir / "ai"
    results_folder = ai_folder / "results"
    processed_folder = ai_folder / "processed"
    logs_folder = ai_folder / "logs"
    
    # Get all image files
    image_files = get_image_files(case_dir)
    
    if not image_files:
        logger.info(f"No images found in {case_dir}")
        return []
    
    logger.info(f"Found {len(image_files)} images to process")
    
    results = []
    for i, image_file in enumerate(image_files, 1):
        logger.info(f"Processing image {i}/{len(image_files)}: {image_file.name}")
        
        try:
            # Process with ALPR
            result = enhanced_alpr_processing(image_file)
            
            if result:
                # Copy processed image to AI folder
                processed_image = processed_folder / image_file.name
                shutil.copy2(image_file, processed_image)
                
                # Add metadata
                result['original_path'] = str(image_file)
                result['processed_path'] = str(processed_image)
                result['processed_at'] = datetime.now().isoformat()
                result['case_directory'] = str(case_dir)
                
                results.append(result)
                
                logger.info(f"Successfully processed: {image_file.name} - {result['plates_detected']} plates detected")
            else:
                logger.warning(f"Failed to process: {image_file.name}")
                
        except Exception as e:
            logger.error(f"Error processing {image_file}: {e}")
            continue
    
    # Save results
    results_file = results_folder / "alpr_results.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    # Create processing log
    log_data = {
        'case_directory': str(case_dir),
        'processed_at': datetime.now().isoformat(),
        'total_images': len(image_files),
        'successful_detections': len([r for r in results if r.get('status') == 'success']),
        'failed_detections': len([r for r in results if r.get('status') == 'error']),
        'no_plates_detected': len([r for r in results if r.get('status') == 'no_plates_detected']),
        'total_plates_found': sum(r.get('plates_detected', 0) for r in results),
        'processing_method': results[0].get('method', 'simple') if results else 'none'
    }
    
    log_file = logs_folder / "processing_log.json"
    with open(log_file, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved {len(results)} results to {results_file}")
    logger.info(f"Processing summary: {log_data['total_plates_found']} plates found in {log_data['total_images']} images")
    
    return results

def main():
    """Main function to process all FTP images"""
    logger.info("🔍 Finding all case directories with AI folders...")
    case_dirs = find_all_case_directories()
    
    if not case_dirs:
        logger.error("❌ No case directories with AI folders found!")
        return
    
    logger.info(f"📁 Found {len(case_dirs)} case directories to process:")
    for case_dir in case_dirs:
        logger.info(f"  - {case_dir}")
    
    logger.info("\n🛠️  Processing all images with ALPR...")
    
    total_cases = len(case_dirs)
    total_images = 0
    total_plates = 0
    successful_cases = 0
    
    for i, case_dir in enumerate(case_dirs, 1):
        try:
            logger.info(f"\n📂 Processing case {i}/{total_cases}: {case_dir}")
            
            results = process_case_directory(case_dir)
            
            # Update counters
            case_images = len(results)
            case_plates = sum(r.get('plates_detected', 0) for r in results)
            
            total_images += case_images
            total_plates += case_plates
            successful_cases += 1
            
            logger.info(f"✅ Completed case {i}/{total_cases}: {case_images} images, {case_plates} plates detected")
            
        except Exception as e:
            logger.error(f"❌ Error processing case {case_dir}: {e}")
            continue
    
    logger.info(f"\n🎉 Processing Complete!")
    logger.info(f"📊 Final Summary:")
    logger.info(f"  - Total cases processed: {successful_cases}/{total_cases}")
    logger.info(f"  - Total images processed: {total_images}")
    logger.info(f"  - Total plates detected: {total_plates}")
    logger.info(f"  - Average plates per image: {total_plates/total_images if total_images > 0 else 0:.2f}")

if __name__ == "__main__":
    main()
