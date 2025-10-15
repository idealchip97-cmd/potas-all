#!/usr/bin/env python3
"""
Test Single Case Processing
Test the ALPR processing on a single case directory
"""

import os
import sys
import json
from pathlib import Path

# Add the ALPR project to Python path
ALPR_PROJECT_PATH = "/home/rnd2/Desktop/radar_system_clean/Automatic-License-Plate-Recognition"
sys.path.insert(0, ALPR_PROJECT_PATH)

# Import the processing function
sys.path.insert(0, "/home/rnd2/Desktop/radar_system_clean")
from process_all_ftp_images import process_case_directory

def main():
    # Test with case013 that we know has images
    test_case = Path("/srv/processing_inbox/camera002/2025-10-05/case013")
    
    if not test_case.exists():
        print(f"❌ Test case directory not found: {test_case}")
        return
    
    print(f"🧪 Testing ALPR processing on: {test_case}")
    
    try:
        results = process_case_directory(test_case)
        
        print(f"\n✅ Test completed successfully!")
        print(f"📊 Results:")
        print(f"  - Images processed: {len(results)}")
        print(f"  - Total plates detected: {sum(r.get('plates_detected', 0) for r in results)}")
        
        # Show detailed results
        for i, result in enumerate(results, 1):
            print(f"  - Image {i}: {result.get('plates_detected', 0)} plates, status: {result.get('status', 'unknown')}")
        
        # Check if results file was created
        results_file = test_case / "ai" / "results" / "alpr_results.json"
        if results_file.exists():
            print(f"✅ Results file created: {results_file}")
        else:
            print(f"❌ Results file not found: {results_file}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
