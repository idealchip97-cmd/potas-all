#!/bin/bash

# Start All Systems Script for Potassium Factory Radar Speed Detection System
# This script starts both the main dashboard and the plate recognition system

echo "🚀 Starting Potassium Factory Radar Speed Detection System..."
echo "=================================================="

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to start a service in background
start_service() {
    local name=$1
    local directory=$2
    local command=$3
    local port=$4
    
    echo "📡 Starting $name..."
    
    if check_port $port; then
        echo "⚠️  $name is already running on port $port"
    else
        cd "$directory"
        echo "📂 Changed to directory: $directory"
        echo "🔧 Running command: $command"
        
        # Start the service in background
        nohup $command > "$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '_').log" 2>&1 &
        local pid=$!
        echo "✅ $name started with PID: $pid"
        
        # Wait a moment to check if the service started successfully
        sleep 3
        if kill -0 $pid 2>/dev/null; then
            echo "🎉 $name is running successfully on port $port"
        else
            echo "❌ Failed to start $name"
            return 1
        fi
    fi
    
    echo ""
}

# Start Backend Server (Node.js)
echo "1️⃣ Starting Backend Server..."
BACKEND_DIR="/home/rnd2/Desktop/radar_sys/potassium-backend-"
if [ -d "$BACKEND_DIR" ]; then
    start_service "Backend Server" "$BACKEND_DIR" "npm start" 3000
else
    echo "❌ Backend directory not found: $BACKEND_DIR"
    echo "📝 Please update BACKEND_DIR in this script to match your system"
fi

# Start Frontend Dashboard (React)
echo "2️⃣ Starting Frontend Dashboard..."
FRONTEND_DIR="/home/rnd2/Desktop/radar_sys/potassium-frontend"
start_service "Frontend Dashboard" "$FRONTEND_DIR" "npm start" 3002

echo "=================================================="
echo "🎯 System Status Summary:"
echo "=================================================="

# Check all services
services=(
    "Backend Server:3000"
    "Frontend Dashboard:3002"
)

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if check_port $port; then
        echo "✅ $name - Running on http://localhost:$port"
    else
        echo "❌ $name - Not running on port $port"
    fi
done

echo ""
echo "🌐 Access URLs:"
echo "   • Main Dashboard: http://localhost:3002"
echo "   • Backend API: http://localhost:3000"
echo ""
echo "📝 Logs are saved in the respective directories:"
echo "   • backend_server.log"
echo "   • frontend_dashboard.log"
echo ""
echo "🛑 To stop all services, run: ./stop-all-systems.sh"
echo "=================================================="
