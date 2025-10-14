#!/bin/bash

# Stop All Systems Script - Clean Structure
echo "🛑 Stopping Potassium Radar System..."
echo "=================================================="

# Function to stop processes on a specific port
stop_port() {
    local port=$1
    local service_name=$2
    
    echo "🔍 Checking for processes on port $port ($service_name)..."
    
    # Find processes using the port
    PIDS=$(lsof -ti :$port)
    
    if [ -n "$PIDS" ]; then
        echo "📡 Found processes: $PIDS"
        echo "⏹️  Stopping $service_name on port $port..."
        
        # Try graceful shutdown first
        kill $PIDS 2>/dev/null
        sleep 3
        
        # Check if processes are still running
        REMAINING=$(lsof -ti :$port)
        if [ -n "$REMAINING" ]; then
            echo "💥 Force killing remaining processes: $REMAINING"
            kill -9 $REMAINING 2>/dev/null
        fi
        
        echo "✅ $service_name stopped"
    else
        echo "ℹ️  No processes found on port $port"
    fi
    echo ""
}

# Stop all services
stop_port 3000 "Backend Server"
stop_port 3002 "Frontend Dashboard"
stop_port 3003 "FTP Image Server"

echo "=================================================="
echo "✅ All services have been stopped"
echo "📝 Log files are preserved for debugging"
echo "=================================================="
