#!/usr/bin/env python3
"""
Test script for AI Plate Recognition Service
Creates test cases and verifies AI processing
"""

import os
import json
import shutil
import time
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_test_case():
    """Create a test case to verify AI service functionality"""
    logger.info("🧪 Creating test case for AI service...")
    
    # Test case path
    test_case_path = Path("/srv/processing_inbox/camera001/2025-10-14/test_case_ai")
    test_case_path.mkdir(parents=True, exist_ok=True)
    
    # Create test verdict.json
    verdict_data = {
        "event_id": "camera001:20251014-160000-TEST",
        "camera_id": "camera001",
        "src_ip": "192.168.1.100",
        "event_ts": int(time.time()),
        "arrival_ts": int(time.time()),
        "decision": "violation",
        "speed": 65,
        "limit": 50,
        "burst_id": "20251014-160000-TEST",
        "payload": {
            "type": "end",
            "camera_id": "camera001",
            "burst_id": "20251014-160000-TEST",
            "decision": "violation",
            "speed": 65,
            "limit": 50,
            "event_ts": None
        }
    }
    
    verdict_file = test_case_path / "verdict.json"
    with open(verdict_file, 'w') as f:
        json.dump(verdict_data, f, indent=2)
    
    # Create test metadata.json
    metadata_data = {
        "case_id": "test_case_ai",
        "created_at": time.time(),
        "camera_location": "Test Location",
        "weather": "clear",
        "test_case": True
    }
    
    metadata_file = test_case_path / "metadata.json"
    with open(metadata_file, 'w') as f:
        json.dump(metadata_data, f, indent=2)
    
    # Copy some test images from existing cases
    existing_case = Path("/srv/processing_inbox/camera002/2025-10-06/case001")
    if existing_case.exists():
        image_files = list(existing_case.glob("*.jpg"))
        for i, img_file in enumerate(image_files[:3]):  # Copy first 3 images
            test_img = test_case_path / f"test_image_{i+1:02d}.jpg"
            shutil.copy2(img_file, test_img)
            logger.info(f"📸 Copied test image: {test_img.name}")
    else:
        # Create dummy image files if no existing case
        for i in range(3):
            dummy_img = test_case_path / f"test_image_{i+1:02d}.jpg"
            dummy_img.write_bytes(b"dummy_image_data")
    
    logger.info(f"✅ Test case created: {test_case_path}")
    return test_case_path

def check_ai_processing(test_case_path, timeout=30):
    """Check if AI service processed the test case"""
    logger.info(f"🔍 Checking AI processing for: {test_case_path}")
    
    ai_folder = test_case_path / "ai"
    ai_results_file = ai_folder / "ai_detection_results.json"
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        if ai_results_file.exists():
            logger.info("✅ AI processing completed!")
            
            # Read and display results
            with open(ai_results_file, 'r') as f:
                results = json.load(f)
            
            logger.info(f"📊 AI Results Summary:")
            logger.info(f"   • Case ID: {results.get('case_id')}")
            logger.info(f"   • Images Processed: {results.get('images_processed', 0)}")
            logger.info(f"   • Plates Detected: {results.get('total_plates_detected', 0)}")
            logger.info(f"   • Success Count: {results.get('processing_summary', {}).get('success_count', 0)}")
            logger.info(f"   • Error Count: {results.get('processing_summary', {}).get('error_count', 0)}")
            logger.info(f"   • Simulation Count: {results.get('processing_summary', {}).get('simulation_count', 0)}")
            
            # Check processed images
            processed_images = list(ai_folder.glob("processed_*.jpg"))
            logger.info(f"📸 Processed images in AI folder: {len(processed_images)}")
            
            return True
        
        time.sleep(2)
        logger.info("⏳ Waiting for AI processing...")
    
    logger.warning(f"⚠️ AI processing not completed within {timeout} seconds")
    return False

def cleanup_test_case(test_case_path):
    """Clean up the test case"""
    if test_case_path.exists():
        shutil.rmtree(test_case_path)
        logger.info(f"🧹 Cleaned up test case: {test_case_path}")

def main():
    """Main test function"""
    logger.info("🚀 Starting AI Service Test")
    
    # Create test case
    test_case_path = create_test_case()
    
    try:
        # Wait for AI service to process
        logger.info("⏳ Waiting for AI service to detect and process the test case...")
        
        if check_ai_processing(test_case_path, timeout=60):
            logger.info("🎉 AI Service Test PASSED!")
            return True
        else:
            logger.error("❌ AI Service Test FAILED!")
            return False
            
    finally:
        # Cleanup (optional - comment out if you want to keep test data)
        # cleanup_test_case(test_case_path)
        logger.info("💡 Test case left in place for manual inspection")

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
