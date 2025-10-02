#!/bin/bash

# Complete Radar System Startup Script
# Starts all components in the correct order for the complete cycle

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a port
kill_port() {
    local port=$1
    print_status "Killing processes on port $port..."
    if check_port $port; then
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$name failed to start within timeout"
    return 1
}

# Main startup sequence
main() {
    print_status "🚀 Starting Complete Radar Speed Detection System"
    echo ""
    
    # Step 1: Clean up any existing processes
    print_status "Step 1: Cleaning up existing processes..."
    kill_port 3000  # Backend
    kill_port 3003  # Image server
    kill_port 3004  # Frontend
    kill_port 17081 # UDP server
    kill_port 18081 # WebSocket (if standalone)
    
    # Kill any node processes that might be lingering
    pkill -f "node.*server" 2>/dev/null || true
    pkill -f "react-scripts" 2>/dev/null || true
    
    sleep 3
    print_success "Cleanup completed"
    echo ""
    
    # Step 2: Start Backend (includes WebSocket server)
    print_status "Step 2: Starting Backend API Server (Port 3000)..."
    cd /home/rnd2/Desktop/radar_sys/potassium-backend-
    
    # Set environment variables for auto-start
    export AUTO_START_EXTERNAL_DATA=true
    export NODE_ENV=development
    export WS_PORT=18081
    
    # Start backend in background
    nohup node server.js > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../pids/backend.pid
    
    # Wait for backend to be ready
    if wait_for_service "http://localhost:3000/health" "Backend API"; then
        print_success "Backend started (PID: $BACKEND_PID)"
    else
        print_error "Backend failed to start"
        exit 1
    fi
    echo ""
    
    # Step 3: Start Local Image Server
    print_status "Step 3: Starting Local Image Server (Port 3003)..."
    cd /home/rnd2/Desktop/radar_sys/potassium-frontend
    
    # Start image server in background
    nohup node local-image-server.js > ../logs/image-server.log 2>&1 &
    IMAGE_PID=$!
    echo $IMAGE_PID > ../pids/image-server.pid
    
    # Wait for image server to be ready
    if wait_for_service "http://localhost:3003/api/ftp-images/list" "Image Server"; then
        print_success "Image Server started (PID: $IMAGE_PID)"
    else
        print_warning "Image Server may not be fully ready, continuing..."
    fi
    echo ""
    
    # Step 4: Start Frontend
    print_status "Step 4: Starting Frontend React App (Port 3004)..."
    cd /home/rnd2/Desktop/radar_sys/potassium-frontend
    
    # Start frontend in background
    nohup npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../pids/frontend.pid
    
    # Wait for frontend to be ready (React takes longer)
    sleep 10
    if wait_for_service "http://localhost:3004" "Frontend"; then
        print_success "Frontend started (PID: $FRONTEND_PID)"
    else
        print_warning "Frontend may still be starting, check logs if needed"
    fi
    echo ""
    
    # Step 5: Verify External Data Service
    print_status "Step 5: Verifying External Data Service..."
    sleep 5
    
    # Check if external data service is running
    if curl -s "http://localhost:3000/api/external-data/status" | grep -q "healthy"; then
        print_success "External Data Service is running"
    else
        print_warning "External Data Service may need manual start"
        print_status "You can start it via: POST http://localhost:3000/api/external-data/start"
    fi
    echo ""
    
    # Step 6: Create necessary directories
    print_status "Step 6: Setting up directories..."
    mkdir -p /home/rnd2/Desktop/radar_sys/logs
    mkdir -p /home/rnd2/Desktop/radar_sys/pids
    
    # Ensure image directory exists and has proper permissions
    if [ -d "/srv/camera_uploads" ]; then
        print_success "Camera uploads directory exists"
    else
        print_warning "Camera uploads directory not found at /srv/camera_uploads"
        print_status "Creating local test directory..."
        mkdir -p /home/rnd2/Desktop/radar_sys/potassium-frontend/local-images/camera001/192.168.1.54/$(date +%Y-%m-%d)/Common
    fi
    echo ""
    
    # Step 7: Display system status
    print_status "🎯 System Status Summary:"
    echo ""
    
    services=(
        "Backend API:http://localhost:3000/health"
        "Image Server:http://localhost:3003/api/ftp-images/list" 
        "Frontend:http://localhost:3004"
        "External Data:http://localhost:3000/api/external-data/status"
    )
    
    for service in "${services[@]}"; do
        name=$(echo $service | cut -d: -f1)
        url=$(echo $service | cut -d: -f2-)
        
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$name is running"
        else
            print_error "$name is not responding"
        fi
    done
    
    echo ""
    print_status "🌐 Access URLs:"
    echo "   📊 Backend API: http://localhost:3000"
    echo "   🖼️  Image Server: http://localhost:3003"
    echo "   🎛️  Frontend: http://localhost:3004"
    echo "   🔍 Plate Recognition: http://localhost:3004/plate-recognition"
    echo "   📡 Radar Monitor: http://localhost:3004/radar-info-monitor"
    echo "   📸 Image Monitor: http://localhost:3004/fines-images-monitor"
    echo ""
    
    print_status "📋 Process IDs saved in /home/rnd2/Desktop/radar_sys/pids/"
    print_status "📝 Logs available in /home/rnd2/Desktop/radar_sys/logs/"
    echo ""
    
    print_success "🎉 Complete Radar System is now running!"
    print_status "💡 Run the test script: node test-complete-radar-cycle.js"
    print_status "🛑 Stop all services: ./stop-all-systems.sh"
    echo ""
}

# Create log and pid directories
mkdir -p /home/rnd2/Desktop/radar_sys/logs
mkdir -p /home/rnd2/Desktop/radar_sys/pids

# Run main function
main

# Keep script running to show real-time status
if [ "$1" = "--monitor" ]; then
    print_status "🔍 Monitoring mode enabled. Press Ctrl+C to exit."
    while true; do
        sleep 30
        print_status "System check..."
        
        # Quick health check
        if ! curl -s "http://localhost:3000/health" >/dev/null 2>&1; then
            print_error "Backend is down!"
        fi
        
        if ! curl -s "http://localhost:3004" >/dev/null 2>&1; then
            print_error "Frontend is down!"
        fi
    done
fi
