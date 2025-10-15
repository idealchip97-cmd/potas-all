#!/usr/bin/env python3
"""
AI Service Startup Script for Radar System
Starts the AI Plate Recognition Service alongside the radar system
"""

import os
import sys
import subprocess
import time
import signal
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AIServiceManager:
    """Manages the AI Plate Recognition Service"""
    
    def __init__(self):
        self.ai_service_process = None
        self.running = False
        self.project_root = Path(__file__).parent
    
    def check_dependencies(self):
        """Check if required dependencies are installed"""
        logger.info("🔍 Checking AI service dependencies...")
        
        try:
            import cv2
            import numpy as np
            from watchdog.observers import Observer
            logger.info("✅ Core dependencies available")
        except ImportError as e:
            logger.error(f"❌ Missing core dependencies: {e}")
            logger.info("📦 Installing dependencies...")
            self.install_dependencies()
        
        # Check ALPR availability
        try:
            sys.path.append(str(self.project_root / 'Automatic-License-Plate-Recognition'))
            from ultralytics import YOLO
            logger.info("✅ ALPR libraries available")
        except ImportError:
            logger.warning("⚠️ ALPR libraries not available, service will run in simulation mode")
    
    def install_dependencies(self):
        """Install required dependencies"""
        requirements_file = self.project_root / 'backend' / 'requirements_ai_service.txt'
        
        if requirements_file.exists():
            try:
                subprocess.check_call([
                    sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)
                ])
                logger.info("✅ Dependencies installed successfully")
            except subprocess.CalledProcessError as e:
                logger.error(f"❌ Failed to install dependencies: {e}")
        else:
            logger.warning("⚠️ Requirements file not found")
    
    def start_ai_service(self):
        """Start the AI Plate Recognition Service"""
        logger.info("🚀 Starting AI Plate Recognition Service...")
        
        ai_service_script = self.project_root / 'backend' / 'ai_plate_recognition_service.py'
        
        if not ai_service_script.exists():
            logger.error(f"❌ AI service script not found: {ai_service_script}")
            return False
        
        try:
            # Start the AI service as a subprocess
            self.ai_service_process = subprocess.Popen([
                sys.executable, str(ai_service_script)
            ], cwd=str(self.project_root))
            
            # Give it a moment to start
            time.sleep(2)
            
            # Check if it's still running
            if self.ai_service_process.poll() is None:
                logger.info("✅ AI Plate Recognition Service started successfully")
                self.running = True
                return True
            else:
                logger.error("❌ AI service failed to start")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error starting AI service: {e}")
            return False
    
    def stop_ai_service(self):
        """Stop the AI Plate Recognition Service"""
        if self.ai_service_process and self.running:
            logger.info("🛑 Stopping AI Plate Recognition Service...")
            
            try:
                # Send SIGTERM first
                self.ai_service_process.terminate()
                
                # Wait for graceful shutdown
                try:
                    self.ai_service_process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    # Force kill if it doesn't stop gracefully
                    logger.warning("⚠️ Force killing AI service...")
                    self.ai_service_process.kill()
                    self.ai_service_process.wait()
                
                logger.info("✅ AI Plate Recognition Service stopped")
                self.running = False
                
            except Exception as e:
                logger.error(f"❌ Error stopping AI service: {e}")
    
    def is_running(self):
        """Check if the AI service is running"""
        if self.ai_service_process:
            return self.ai_service_process.poll() is None
        return False
    
    def restart_ai_service(self):
        """Restart the AI service"""
        logger.info("🔄 Restarting AI Plate Recognition Service...")
        self.stop_ai_service()
        time.sleep(2)
        return self.start_ai_service()

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"📡 Received signal {signum}, shutting down...")
    if 'ai_manager' in globals():
        ai_manager.stop_ai_service()
    sys.exit(0)

def main():
    """Main entry point"""
    global ai_manager
    
    logger.info("🎯 AI Service Manager Starting...")
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create AI service manager
    ai_manager = AIServiceManager()
    
    # Check dependencies
    ai_manager.check_dependencies()
    
    # Start AI service
    if ai_manager.start_ai_service():
        logger.info("🎉 AI Plate Recognition Service is now running!")
        logger.info("📁 Monitoring: /srv/processing_inbox")
        logger.info("🔍 Processing violation cases automatically")
        logger.info("Press Ctrl+C to stop")
        
        try:
            # Keep the manager running
            while True:
                time.sleep(5)
                
                # Check if AI service is still running
                if not ai_manager.is_running():
                    logger.warning("⚠️ AI service stopped unexpectedly, restarting...")
                    if not ai_manager.restart_ai_service():
                        logger.error("❌ Failed to restart AI service, exiting...")
                        break
                        
        except KeyboardInterrupt:
            logger.info("👋 Received interrupt signal")
        except Exception as e:
            logger.error(f"❌ Manager error: {e}")
    else:
        logger.error("❌ Failed to start AI service")
        return 1
    
    # Cleanup
    ai_manager.stop_ai_service()
    logger.info("👋 AI Service Manager stopped")
    return 0

if __name__ == "__main__":
    sys.exit(main())
