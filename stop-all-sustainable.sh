#!/bin/bash

# Sustainable Stop Script for Radar System

echo "🛑 Stopping Radar System Services..."
echo "===================================="

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local name=$2
    echo "🔄 Stopping $name on port $port..."
    
    # Kill any process using the port
    pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null
        echo "✅ Stopped $name"
    else
        echo "ℹ️  $name was not running"
    fi
}

# Stop all services
kill_port 3000 "Frontend Dashboard"
kill_port 3001 "Backend Server"
kill_port 3002 "Frontend (alt port)"
kill_port 3003 "Image Server"
kill_port 3004 "AI Results API"
kill_port 36555 "Plate Recognition Viewer"

# Kill any remaining node processes related to the project
echo "🧹 Cleaning up remaining processes..."
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "local-image-server.js" 2>/dev/null || true
pkill -f "ai_results_api.js" 2>/dev/null || true
pkill -f "server.js" 2>/dev/null || true

sleep 2

echo ""
echo "✅ All Radar System services have been stopped!"
echo "🚀 To restart, run: ./start-all.sh"
echo ""
