#!/usr/bin/env python3
"""
Fix Missing AI Folders Script
Creates AI folders for all cases and processes images with ALPR
"""

import os
import sys
import json
import shutil
import subprocess
from pathlib import Path
from datetime import datetime

# Add the ALPR project to Python path
ALPR_PROJECT_PATH = "/home/rnd2/Desktop/radar_system_clean/Automatic-License-Plate-Recognition"
sys.path.insert(0, ALPR_PROJECT_PATH)

def find_missing_ai_folders():
    """Find all case directories missing AI folders"""
    processing_inbox = Path("/srv/processing_inbox")
    missing_folders = []
    
    for case_dir in processing_inbox.rglob("case*"):
        if case_dir.is_dir():
            ai_folder = case_dir / "ai"
            if not ai_folder.exists():
                missing_folders.append(case_dir)
    
    return missing_folders

def create_ai_folder_structure(case_dir):
    """Create AI folder structure for a case directory"""
    ai_folder = case_dir / "ai"
    ai_folder.mkdir(exist_ok=True)
    
    # Create subdirectories
    (ai_folder / "processed").mkdir(exist_ok=True)
    (ai_folder / "results").mkdir(exist_ok=True)
    (ai_folder / "logs").mkdir(exist_ok=True)
    
    print(f"Created AI folder structure: {ai_folder}")
    return ai_folder

def get_image_files(case_dir):
    """Get all image files in a case directory"""
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
    image_files = []
    
    for file_path in case_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in image_extensions:
            image_files.append(file_path)
    
    return image_files

def process_images_with_alpr(case_dir, ai_folder):
    """Process images in case directory with ALPR"""
    image_files = get_image_files(case_dir)
    
    if not image_files:
        print(f"No images found in {case_dir}")
        return
    
    results = []
    processed_folder = ai_folder / "processed"
    
    for image_file in image_files:
        try:
            print(f"Processing image: {image_file}")
            
            # Use the enhanced ALPR system
            result = process_single_image(str(image_file))
            
            if result:
                # Copy processed image to AI folder
                processed_image = processed_folder / image_file.name
                shutil.copy2(image_file, processed_image)
                
                # Add result
                result['original_path'] = str(image_file)
                result['processed_path'] = str(processed_image)
                result['processed_at'] = datetime.now().isoformat()
                results.append(result)
                
                print(f"Successfully processed: {image_file.name}")
            else:
                print(f"Failed to process: {image_file.name}")
                
        except Exception as e:
            print(f"Error processing {image_file}: {e}")
            continue
    
    # Save results
    results_file = ai_folder / "results" / "alpr_results.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"Saved {len(results)} results to {results_file}")
    return results

def process_single_image(image_path):
    """Process a single image with ALPR"""
    try:
        # Import the enhanced ALPR system
        from enhanced_dynamic_alpr_system import EnhancedDynamicALPRSystem
        
        # Initialize the ALPR system
        alpr_system = EnhancedDynamicALPRSystem()
        
        # Process the image
        result = alpr_system.process_image(image_path)
        
        if result and 'plates' in result:
            return {
                'image_path': image_path,
                'plates_detected': len(result['plates']),
                'plates': result['plates'],
                'confidence_scores': [plate.get('confidence', 0) for plate in result['plates']],
                'processing_time': result.get('processing_time', 0),
                'status': 'success'
            }
        else:
            return {
                'image_path': image_path,
                'plates_detected': 0,
                'plates': [],
                'confidence_scores': [],
                'status': 'no_plates_detected'
            }
            
    except Exception as e:
        print(f"Error in ALPR processing: {e}")
        return {
            'image_path': image_path,
            'plates_detected': 0,
            'plates': [],
            'error': str(e),
            'status': 'error'
        }

def create_processing_log(ai_folder, case_dir, results):
    """Create a processing log"""
    log_file = ai_folder / "logs" / "processing_log.json"
    
    log_data = {
        'case_directory': str(case_dir),
        'processed_at': datetime.now().isoformat(),
        'total_images': len(get_image_files(case_dir)),
        'successful_detections': len([r for r in results if r.get('status') == 'success']),
        'failed_detections': len([r for r in results if r.get('status') == 'error']),
        'no_plates_detected': len([r for r in results if r.get('status') == 'no_plates_detected']),
        'total_plates_found': sum(r.get('plates_detected', 0) for r in results),
        'results_summary': results
    }
    
    with open(log_file, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)
    
    print(f"Created processing log: {log_file}")

def main():
    """Main function to fix missing AI folders"""
    print("🔍 Finding missing AI folders...")
    missing_folders = find_missing_ai_folders()
    
    if not missing_folders:
        print("✅ All case directories already have AI folders!")
        return
    
    print(f"📁 Found {len(missing_folders)} case directories missing AI folders:")
    for folder in missing_folders:
        print(f"  - {folder}")
    
    print("\n🛠️  Creating AI folders and processing images...")
    
    total_processed = 0
    total_plates_found = 0
    
    for case_dir in missing_folders:
        try:
            print(f"\n📂 Processing: {case_dir}")
            
            # Create AI folder structure
            ai_folder = create_ai_folder_structure(case_dir)
            
            # Process images with ALPR
            results = process_images_with_alpr(case_dir, ai_folder)
            
            # Create processing log
            create_processing_log(ai_folder, case_dir, results)
            
            # Update counters
            total_processed += len(results)
            total_plates_found += sum(r.get('plates_detected', 0) for r in results)
            
            print(f"✅ Completed processing: {case_dir}")
            
        except Exception as e:
            print(f"❌ Error processing {case_dir}: {e}")
            continue
    
    print(f"\n🎉 Processing Complete!")
    print(f"📊 Summary:")
    print(f"  - Cases processed: {len(missing_folders)}")
    print(f"  - Images processed: {total_processed}")
    print(f"  - Total plates detected: {total_plates_found}")
    print(f"  - AI folders created: {len(missing_folders)}")

if __name__ == "__main__":
    main()
