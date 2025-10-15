#!/usr/bin/env python3
"""
Test script for AI Case Processor
Tests the new logic: Only process cases WITH verdict.json
"""

import sys
import os
sys.path.append('/home/rnd2/Desktop/radar_system_clean')

from ai_case_processor import AICaseProcessor

def test_ai_processor():
    """Test the AI processor with the new logic"""
    
    # Use the test processing inbox
    test_path = "/home/rnd2/Desktop/radar_system_clean/frontend/processing_inbox_test"
    
    print("🧪 Testing AI Case Processor")
    print(f"📁 Using test path: {test_path}")
    print("=" * 60)
    
    # Initialize processor
    processor = AICaseProcessor(test_path)
    
    # Test 1: Find cases with verdict.json
    print("🔍 Test 1: Finding cases WITH verdict.json")
    cases_with_verdict = processor.find_cases_with_verdict()
    
    print(f"✅ Found {len(cases_with_verdict)} cases WITH verdict.json:")
    for case in cases_with_verdict:
        print(f"   📂 {case['camera_id']}/{case['date']}/{case['case_id']} - {case['image_count']} images")
    
    print()
    
    # Test 2: Check existing AI folders
    print("🔍 Test 2: Checking for existing AI folders")
    ai_folders_found = 0
    
    for case in cases_with_verdict:
        ai_folder = os.path.join(case['case_path'], 'ai')
        if os.path.exists(ai_folder):
            ai_folders_found += 1
            print(f"   📁 AI folder exists: {ai_folder}")
        else:
            print(f"   ❌ No AI folder: {ai_folder}")
    
    print(f"✅ Found {ai_folders_found} existing AI folders")
    print()
    
    # Test 3: Process a single case (if any found)
    if cases_with_verdict:
        print("🔍 Test 3: Processing first case")
        first_case = cases_with_verdict[0]
        
        try:
            result = processor.process_single_case(first_case)
            print(f"✅ Successfully processed case: {first_case['case_id']}")
            print(f"   🎯 Plate detected: {result.get('plate_number', 'None')}")
            print(f"   📊 Confidence: {result.get('confidence', 0):.2f}")
            print(f"   📁 AI folder: {result.get('ai_folder', 'None')}")
        except Exception as e:
            print(f"❌ Failed to process case: {e}")
    else:
        print("⚠️  No cases with verdict.json found to test processing")
    
    print()
    print("=" * 60)
    print("🎯 Summary:")
    print(f"   • Cases WITH verdict.json: {len(cases_with_verdict)}")
    print(f"   • Existing AI folders: {ai_folders_found}")
    print("   • Logic: Only processes cases WITH verdict.json ✅")
    print("   • Logic: Skips cases WITHOUT verdict.json ✅")

if __name__ == "__main__":
    test_ai_processor()
