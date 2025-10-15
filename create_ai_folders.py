#!/usr/bin/env python3
"""
Create AI Folders Script
Creates AI folder structure for all missing case directories
"""

import os
from pathlib import Path

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
    
    # Create a placeholder file to indicate the folder was created by this script
    placeholder_file = ai_folder / "created_by_script.txt"
    with open(placeholder_file, 'w') as f:
        f.write(f"AI folder created by create_ai_folders.py\n")
        f.write(f"Case directory: {case_dir}\n")
        f.write(f"Created at: {os.popen('date').read().strip()}\n")
    
    print(f"✅ Created AI folder: {ai_folder}")
    return ai_folder

def main():
    """Main function to create missing AI folders"""
    print("🔍 Finding missing AI folders...")
    missing_folders = find_missing_ai_folders()
    
    if not missing_folders:
        print("✅ All case directories already have AI folders!")
        return
    
    print(f"📁 Found {len(missing_folders)} case directories missing AI folders:")
    for folder in missing_folders:
        print(f"  - {folder}")
    
    print(f"\n🛠️  Creating AI folders...")
    
    created_count = 0
    for case_dir in missing_folders:
        try:
            create_ai_folder_structure(case_dir)
            created_count += 1
        except Exception as e:
            print(f"❌ Error creating AI folder for {case_dir}: {e}")
            continue
    
    print(f"\n🎉 Successfully created {created_count} AI folders!")
    
    # Verify all folders were created
    print(f"\n🔍 Verifying AI folders...")
    remaining_missing = find_missing_ai_folders()
    if not remaining_missing:
        print("✅ All case directories now have AI folders!")
    else:
        print(f"⚠️  Still missing AI folders in {len(remaining_missing)} directories:")
        for folder in remaining_missing:
            print(f"  - {folder}")

if __name__ == "__main__":
    main()
