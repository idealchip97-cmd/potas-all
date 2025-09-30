#!/bin/bash

# Stop All Systems Script for Potassium Factory Radar Speed Detection System
# This script stops all running services

echo "🛑 Stopping Potassium Factory Radar Speed Detection System..."
echo "=================================================="

# Function to stop services running on specific ports
stop_service_on_port() {
    local service_name=$1
    local port=$2
    
    echo "🔍 Checking for $service_name on port $port..."
    
    # Find processes using the port
    local pids=$(lsof -ti :$port)
    
    if [ -n "$pids" ]; then
        echo "🛑 Stopping $service_name (PIDs: $pids)..."
        echo "$pids" | xargs kill -TERM
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Force kill if still running
        local remaining_pids=$(lsof -ti :$port)
        if [ -n "$remaining_pids" ]; then
            echo "⚡ Force stopping $service_name (PIDs: $remaining_pids)..."
            echo "$remaining_pids" | xargs kill -KILL
        fi
        
        echo "✅ $service_name stopped"
    else
        echo "ℹ️  $service_name is not running on port $port"
    fi
    echo ""
}

# Stop all services
stop_service_on_port "Backend Server" 3000
stop_service_on_port "Frontend Dashboard" 3001
stop_service_on_port "Plate Recognition System" 3002

# Also stop any Node.js processes that might be related
echo "🔍 Checking for any remaining Node.js processes..."
node_processes=$(ps aux | grep -E "(npm start|node.*server|serve)" | grep -v grep | awk '{print $2}')

if [ -n "$node_processes" ]; then
    echo "🛑 Stopping remaining Node.js processes..."
    echo "$node_processes" | xargs kill -TERM 2>/dev/null
    sleep 2
    
    # Force kill if still running
    remaining_processes=$(ps aux | grep -E "(npm start|node.*server|serve)" | grep -v grep | awk '{print $2}')
    if [ -n "$remaining_processes" ]; then
        echo "⚡ Force stopping remaining processes..."
        echo "$remaining_processes" | xargs kill -KILL 2>/dev/null
    fi
fi

echo "=================================================="
echo "🎯 Final Status Check:"
echo "=================================================="

# Check if ports are now free
ports=(3000 3001 3002)
service_names=("Backend Server" "Frontend Dashboard" "Plate Recognition")

for i in "${!ports[@]}"; do
    port=${ports[$i]}
    service=${service_names[$i]}
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  $service - Still running on port $port"
    else
        echo "✅ $service - Port $port is now free"
    fi
done

echo ""
echo "🧹 Cleaning up log files..."
rm -f backend\ server.log frontend\ dashboard.log plate\ recognition\ system.log 2>/dev/null
echo "✅ Log files cleaned up"

echo ""
echo "✨ All systems stopped successfully!"
echo "=================================================="
