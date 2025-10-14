#!/bin/bash

# Start All Systems Script - Clean Structure
echo "🚀 Starting Potassium Radar System (Clean Structure)..."
echo "=================================================="

# Get current directory
ROOT_DIR=$(pwd)
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

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
        nohup $command > "$ROOT_DIR/$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '_').log" 2>&1 &
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
        
        # Return to root directory
        cd "$ROOT_DIR"
    fi
    
    echo ""
}

# Start Backend Server
echo "1️⃣ Starting Backend Server..."
if [ -d "$BACKEND_DIR" ] && [ -f "$BACKEND_DIR/package.json" ]; then
    # Install dependencies if needed
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        echo "📦 Installing backend dependencies..."
        cd "$BACKEND_DIR"
        npm install
        cd "$ROOT_DIR"
    fi
    
    start_service "Backend Server" "$BACKEND_DIR" "npm start" 3001
else
    echo "❌ Backend directory not found or missing package.json: $BACKEND_DIR"
fi

# Start Local Image Server
echo "2️⃣ Starting Local Image Server..."
LOCAL_SERVER_FILE="$FRONTEND_DIR/local-image-server.js"
if [ -f "$LOCAL_SERVER_FILE" ]; then
    start_service "Local Image Server" "$FRONTEND_DIR" "node local-image-server.js" 3003
else
    echo "❌ Local Image Server not found: $LOCAL_SERVER_FILE"
fi

# Start Frontend Dashboard
echo "3️⃣ Starting Frontend Dashboard..."
if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/package.json" ]; then
    # Install dependencies if needed
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        cd "$FRONTEND_DIR"
        npm install
        cd "$ROOT_DIR"
    fi
    
    start_service "Frontend Dashboard" "$FRONTEND_DIR" "npm start" 3002
else
    echo "❌ Frontend directory not found or missing package.json: $FRONTEND_DIR"
fi

echo "=================================================="
echo "🎯 System Status Summary:"
echo "=================================================="

# Check all services
services=(
    "Backend Server:3001"
    "Local Image Server:3003"
    "Frontend Dashboard:3000"
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
echo "   • Main Dashboard: http://localhost:3000"
echo "   • Backend API: http://localhost:3001"
echo "   • Local Image Server: http://localhost:3003"
echo ""
echo "📝 Logs are saved in the root directory:"
echo "   • backend_server.log"
echo "   • ftp_image_server.log"
echo "   • frontend_dashboard.log"
echo ""
echo "🛑 To stop all services, run: ./stop-all.sh"
echo "=================================================="
