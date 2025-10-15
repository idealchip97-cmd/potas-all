#!/usr/bin/env python3
"""
AI Folder Monitor
Monitors /srv/processing_inbox for new cases and automatically processes them
"""

import os
import sys
import time
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Add AI processor to path
sys.path.append('/home/rnd2/Desktop/radar_system_clean')
from ai_case_processor import AICaseProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/rnd2/Desktop/radar_system_clean/ai_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CaseHandler(FileSystemEventHandler):
    """Handles file system events for new cases"""
    
    def __init__(self):
        self.processor = AICaseProcessor()
        self.processed_cases = set()
        
    def on_created(self, event):
        """Handle file/directory creation events"""
        if event.is_directory:
            return
            
        # Check if it's a verdict.json file
        if event.src_path.endswith('verdict.json'):
            case_dir = Path(event.src_path).parent
            case_id = case_dir.name
            
            # Avoid processing the same case multiple times
            if str(case_dir) in self.processed_cases:
                return
                
            logger.info(f"🔍 New verdict.json detected: {case_dir}")
            
            # Wait a moment for file to be fully written
            time.sleep(2)
            
            # Check if this case has images
            images = list(case_dir.glob("*.jpg")) + list(case_dir.glob("*.png"))
            if images:
                logger.info(f"📸 Found {len(images)} images in case: {case_id}")
                
                # Process the case
                try:
                    case_info = {
                        'camera_id': case_dir.parent.parent.name,
                        'date': case_dir.parent.name,
                        'case_id': case_id,
                        'case_path': str(case_dir),
                        'images': [str(img) for img in images],
                        'image_count': len(images)
                    }
                    
                    result = self.processor.process_single_case(case_info)
                    self.processed_cases.add(str(case_dir))
                    
                    logger.info(f"✅ Successfully processed case: {case_id}")
                    logger.info(f"🎯 Detected plate: {result.get('plate_number', 'None')} (confidence: {result.get('confidence', 0):.2f})")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to process case {case_id}: {e}")
            else:
                logger.warning(f"⚠️ No images found in case: {case_id}")

def main():
    """Main monitoring function"""
    processing_inbox = "/srv/processing_inbox"
    
    if not os.path.exists(processing_inbox):
        logger.error(f"Processing inbox not found: {processing_inbox}")
        return
    
    logger.info(f"🚀 Starting AI folder monitor for: {processing_inbox}")
    logger.info("👀 Watching for new cases with verdict.json...")
    
    # Create event handler and observer
    event_handler = CaseHandler()
    observer = Observer()
    observer.schedule(event_handler, processing_inbox, recursive=True)
    
    # Start monitoring
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("🛑 Stopping AI folder monitor...")
        observer.stop()
    
    observer.join()
    logger.info("✅ AI folder monitor stopped")

if __name__ == "__main__":
    main()
