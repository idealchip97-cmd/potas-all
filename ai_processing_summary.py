#!/usr/bin/env python3
"""
AI Processing Summary Script
Shows the current status of AI processing across all FTP data
"""

import os
import json
from pathlib import Path
from datetime import datetime

def get_ai_processing_summary():
    """Get comprehensive summary of AI processing status"""
    processing_inbox = Path("/srv/processing_inbox")
    
    summary = {
        'timestamp': datetime.now().isoformat(),
        'total_cameras': 0,
        'total_dates': 0,
        'total_cases': 0,
        'cases_with_ai_folders': 0,
        'cases_processed': 0,
        'total_images': 0,
        'total_plates_detected': 0,
        'cameras': {},
        'processing_methods': {},
        'case_details': []
    }
    
    cameras = set()
    dates = set()
    
    # Scan all case directories
    for case_dir in processing_inbox.rglob("case*"):
        if case_dir.is_dir():
            summary['total_cases'] += 1
            
            # Extract camera and date info
            parts = case_dir.parts
            if len(parts) >= 4:
                camera = parts[-3]  # e.g., camera001
                date = parts[-2]    # e.g., 2025-10-05
                cameras.add(camera)
                dates.add(date)
                
                if camera not in summary['cameras']:
                    summary['cameras'][camera] = {
                        'dates': set(),
                        'cases': 0,
                        'cases_with_ai': 0,
                        'total_images': 0,
                        'total_plates': 0
                    }
                
                summary['cameras'][camera]['dates'].add(date)
                summary['cameras'][camera]['cases'] += 1
            
            # Check AI folder
            ai_folder = case_dir / "ai"
            if ai_folder.exists():
                summary['cases_with_ai_folders'] += 1
                if camera:
                    summary['cameras'][camera]['cases_with_ai'] += 1
                
                # Check for processing results
                results_folder = ai_folder / "results"
                case_processed = False
                case_images = 0
                case_plates = 0
                processing_method = None
                
                if results_folder.exists():
                    # Check for different result files
                    result_files = [
                        'alpr_results.json',
                        'simple_alpr_results.json'
                    ]
                    
                    for result_file in result_files:
                        result_path = results_folder / result_file
                        if result_path.exists():
                            try:
                                with open(result_path, 'r') as f:
                                    results = json.load(f)
                                
                                case_processed = True
                                case_images = len(results)
                                case_plates = sum(r.get('plates_detected', 0) for r in results)
                                processing_method = results[0].get('method', 'unknown') if results else 'unknown'
                                
                                if processing_method not in summary['processing_methods']:
                                    summary['processing_methods'][processing_method] = {
                                        'cases': 0,
                                        'images': 0,
                                        'plates': 0
                                    }
                                
                                summary['processing_methods'][processing_method]['cases'] += 1
                                summary['processing_methods'][processing_method]['images'] += case_images
                                summary['processing_methods'][processing_method]['plates'] += case_plates
                                
                                break  # Use first found result file
                                
                            except Exception as e:
                                print(f"Error reading {result_path}: {e}")
                
                if case_processed:
                    summary['cases_processed'] += 1
                    summary['total_images'] += case_images
                    summary['total_plates_detected'] += case_plates
                    
                    if camera:
                        summary['cameras'][camera]['total_images'] += case_images
                        summary['cameras'][camera]['total_plates'] += case_plates
                
                # Add case details
                summary['case_details'].append({
                    'path': str(case_dir),
                    'camera': camera,
                    'date': date,
                    'has_ai_folder': True,
                    'processed': case_processed,
                    'images': case_images,
                    'plates_detected': case_plates,
                    'processing_method': processing_method
                })
            else:
                # Case without AI folder
                summary['case_details'].append({
                    'path': str(case_dir),
                    'camera': camera,
                    'date': date,
                    'has_ai_folder': False,
                    'processed': False,
                    'images': 0,
                    'plates_detected': 0,
                    'processing_method': None
                })
    
    summary['total_cameras'] = len(cameras)
    summary['total_dates'] = len(dates)
    
    # Convert sets to lists for JSON serialization
    for camera_data in summary['cameras'].values():
        camera_data['dates'] = list(camera_data['dates'])
    
    return summary

def print_summary(summary):
    """Print formatted summary"""
    print("🤖 AI Processing Summary Report")
    print("=" * 50)
    print(f"📅 Generated: {summary['timestamp']}")
    print()
    
    print("📊 Overall Statistics:")
    print(f"  • Total Cameras: {summary['total_cameras']}")
    print(f"  • Total Dates: {summary['total_dates']}")
    print(f"  • Total Cases: {summary['total_cases']}")
    print(f"  • Cases with AI folders: {summary['cases_with_ai_folders']}/{summary['total_cases']} ({summary['cases_with_ai_folders']/summary['total_cases']*100:.1f}%)")
    print(f"  • Cases processed: {summary['cases_processed']}/{summary['cases_with_ai_folders']} ({summary['cases_processed']/summary['cases_with_ai_folders']*100:.1f}% of AI-enabled)")
    print(f"  • Total images processed: {summary['total_images']}")
    print(f"  • Total plates detected: {summary['total_plates_detected']}")
    if summary['total_images'] > 0:
        print(f"  • Average plates per image: {summary['total_plates_detected']/summary['total_images']:.2f}")
    print()
    
    print("📷 Camera Breakdown:")
    for camera, data in summary['cameras'].items():
        print(f"  • {camera}:")
        print(f"    - Dates: {len(data['dates'])} ({', '.join(sorted(data['dates']))})")
        print(f"    - Cases: {data['cases']} (AI-enabled: {data['cases_with_ai']})")
        print(f"    - Images processed: {data['total_images']}")
        print(f"    - Plates detected: {data['total_plates']}")
        if data['total_images'] > 0:
            print(f"    - Avg plates/image: {data['total_plates']/data['total_images']:.2f}")
    print()
    
    if summary['processing_methods']:
        print("🔧 Processing Methods:")
        for method, data in summary['processing_methods'].items():
            print(f"  • {method}:")
            print(f"    - Cases: {data['cases']}")
            print(f"    - Images: {data['images']}")
            print(f"    - Plates: {data['plates']}")
            if data['images'] > 0:
                print(f"    - Success rate: {data['plates']/data['images']:.2f} plates/image")
        print()
    
    print("📁 Cases Missing AI Processing:")
    missing_ai = [case for case in summary['case_details'] if not case['has_ai_folder']]
    if missing_ai:
        for case in missing_ai:
            print(f"  • {case['path']}")
    else:
        print("  ✅ All cases have AI folders!")
    print()
    
    print("⚠️  Cases with AI folders but not processed:")
    unprocessed = [case for case in summary['case_details'] if case['has_ai_folder'] and not case['processed']]
    if unprocessed:
        for case in unprocessed:
            print(f"  • {case['path']}")
    else:
        print("  ✅ All AI-enabled cases have been processed!")

def main():
    """Main function"""
    summary = get_ai_processing_summary()
    print_summary(summary)
    
    # Save summary to file
    summary_file = Path("/home/rnd2/Desktop/radar_system_clean/ai_processing_summary.json")
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Full summary saved to: {summary_file}")

if __name__ == "__main__":
    main()
