#!/bin/bash

# Complete Radar System Stop Script
# Gracefully stops all system components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to kill process by PID file
kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            print_status "Stopping $service_name (PID: $pid)..."
            kill -TERM "$pid" 2>/dev/null || true
            
            # Wait for graceful shutdown
            local count=0
            while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "Force killing $service_name..."
                kill -KILL "$pid" 2>/dev/null || true
            fi
            
            print_success "$service_name stopped"
        else
            print_warning "$service_name was not running"
        fi
        rm -f "$pid_file"
    else
        print_warning "No PID file found for $service_name"
    fi
}

# Function to kill processes on a port
kill_port() {
    local port=$1
    local service_name=$2
    
    print_status "Checking port $port for $service_name..."
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_status "Killing processes on port $port..."
        lsof -ti:$port | xargs kill -TERM 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            lsof -ti:$port | xargs kill -KILL 2>/dev/null || true
        fi
        
        print_success "$service_name stopped (port $port)"
    else
        print_success "$service_name was not running on port $port"
    fi
}

main() {
    print_status "🛑 Stopping Complete Radar Speed Detection System"
    echo ""
    
    # Create directories if they don't exist
    mkdir -p /home/rnd2/Desktop/radar_sys/pids
    
    # Step 1: Stop services using PID files
    print_status "Step 1: Stopping services using PID files..."
    
    kill_by_pid_file "/home/rnd2/Desktop/radar_sys/pids/frontend.pid" "Frontend React App"
    kill_by_pid_file "/home/rnd2/Desktop/radar_sys/pids/backend.pid" "Backend API Server"
    kill_by_pid_file "/home/rnd2/Desktop/radar_sys/pids/image-server.pid" "Local Image Server"
    
    echo ""
    
    # Step 2: Stop services by port (fallback)
    print_status "Step 2: Ensuring all ports are free..."
    
    kill_port 3004 "Frontend (React)"
    kill_port 3003 "Image Server"
    kill_port 3000 "Backend API"
    kill_port 17081 "UDP Server"
    kill_port 18081 "WebSocket Server"
    
    echo ""
    
    # Step 3: Kill any remaining Node.js processes related to our system
    print_status "Step 3: Cleaning up remaining processes..."
    
    # Kill React development server
    pkill -f "react-scripts start" 2>/dev/null || true
    
    # Kill any Node.js servers in our directories
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "node.*local-image-server.js" 2>/dev/null || true
    
    # Kill any UDP or WebSocket related processes
    pkill -f "udp.*server" 2>/dev/null || true
    pkill -f "websocket.*server" 2>/dev/null || true
    
    print_success "Process cleanup completed"
    echo ""
    
    # Step 4: Verify all services are stopped
    print_status "Step 4: Verifying services are stopped..."
    
    services=(
        "3000:Backend API"
        "3003:Image Server"
        "3004:Frontend"
        "17081:UDP Server"
        "18081:WebSocket Server"
    )
    
    all_stopped=true
    for service in "${services[@]}"; do
        port=$(echo $service | cut -d: -f1)
        name=$(echo $service | cut -d: -f2)
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "$name is still running on port $port"
            all_stopped=false
        else
            print_success "$name is stopped"
        fi
    done
    
    echo ""
    
    # Step 5: Clean up temporary files
    print_status "Step 5: Cleaning up temporary files..."
    
    # Remove PID files
    rm -f /home/rnd2/Desktop/radar_sys/pids/*.pid
    
    # Clean up any temporary React files
    rm -rf /home/rnd2/Desktop/radar_sys/potassium-frontend/.next 2>/dev/null || true
    
    print_success "Temporary files cleaned up"
    echo ""
    
    # Final status
    if [ "$all_stopped" = true ]; then
        print_success "🎉 All services stopped successfully!"
    else
        print_warning "⚠️  Some services may still be running. Check manually if needed."
        echo ""
        print_status "💡 You can check running processes with:"
        echo "   lsof -i :3000,3003,3004,17081,18081"
        echo "   ps aux | grep node"
    fi
    
    echo ""
    print_status "📝 Log files preserved in /home/rnd2/Desktop/radar_sys/logs/"
    print_status "🚀 To restart the system: ./start-complete-system.sh"
    echo ""
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Stop script interrupted${NC}"; exit 1' INT

# Run main function
main
