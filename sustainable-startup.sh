#!/bin/bash

# Sustainable Radar System Startup Script
# This script ensures the Speed Violation Monitor page works correctly every time

echo "🚀 Sustainable Radar System Startup"
echo "===================================="

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local name=$2
    echo "🔄 Cleaning up $name on port $port..."
    
    # Kill any process using the port
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Function to wait for service with timeout
wait_for_service() {
    local port=$1
    local name=$2
    local timeout=60
    local count=0
    
    echo "⏳ Waiting for $name on port $port..."
    
    while [ $count -lt $timeout ]; do
        if curl -s --max-time 2 "http://localhost:$port" > /dev/null 2>&1; then
            echo "✅ $name is ready on port $port"
            return 0
        fi
        sleep 2
        ((count+=2))
        echo "   Waiting... ($count/$timeout seconds)"
    done
    
    echo "❌ $name failed to start on port $port"
    return 1
}

# Step 1: Ensure MySQL is running
echo "1️⃣ Ensuring MySQL Database is Running..."
if ! pgrep -f mysqld > /dev/null; then
    echo "🔧 Starting XAMPP MySQL..."
    sudo /opt/lampp/lampp start mysql
    sleep 5
fi

if pgrep -f mysqld > /dev/null; then
    echo "✅ MySQL is running"
else
    echo "❌ Failed to start MySQL - please start XAMPP manually"
    exit 1
fi

# Step 2: Clean up any existing processes
echo "2️⃣ Cleaning Up Existing Processes..."
kill_port 3000 "Frontend (port 3000)"
kill_port 3001 "Backend"
kill_port 3002 "Frontend (port 3002)" 
kill_port 3003 "Image Server"
kill_port 3004 "AI Results API"

# Step 3: Start Backend Server
echo "3️⃣ Starting Backend Server..."
cd /home/rnd2/Desktop/radar_system_clean/backend
nohup npm start > ../backend_server.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Step 4: Start Image Server
echo "4️⃣ Starting Image Server..."
cd /home/rnd2/Desktop/radar_system_clean/frontend
nohup node local-image-server.js > ../local_image_server.log 2>&1 &
IMAGE_SERVER_PID=$!
echo "Image server started with PID: $IMAGE_SERVER_PID"

# Step 5: Start AI Results API
echo "5️⃣ Starting AI Results API..."
cd /home/rnd2/Desktop/radar_system_clean/backend
nohup node ai_results_api.js > ../ai_results_api.log 2>&1 &
AI_API_PID=$!
echo "AI Results API started with PID: $AI_API_PID"

# Step 6: Wait for backend services to be ready
echo "6️⃣ Waiting for Backend Services..."
wait_for_service 3001 "Backend Server"
wait_for_service 3003 "Image Server"
wait_for_service 3004 "AI Results API"

# Step 7: Fix frontend configuration and start on port 3000
echo "7️⃣ Configuring and Starting Frontend..."
cd /home/rnd2/Desktop/radar_system_clean/frontend

# Create/update .env file to force port 3000
cat > .env << EOF
PORT=3000
REACT_APP_FTP_SERVER_URL=http://localhost:3003
GENERATE_SOURCEMAP=false
EOF

# Start frontend on port 3000
echo "🌐 Starting frontend on port 3000..."
nohup npm start > ../frontend_dashboard.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Step 8: Wait for frontend and verify
echo "8️⃣ Verifying Frontend Startup..."
wait_for_service 3000 "Frontend Dashboard"

# Step 9: Test critical endpoints
echo "9️⃣ Testing Critical Endpoints..."

# Test image server endpoints
echo "🧪 Testing Image Server endpoints..."
if curl -s "http://localhost:3003/api/discover/cameras" | grep -q "success"; then
    echo "✅ Cameras endpoint working"
else
    echo "❌ Cameras endpoint failed"
fi

if curl -s "http://localhost:3003/health" | grep -q "success"; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint failed"
fi

# Step 10: Final verification
echo "🔟 Final System Verification..."
sleep 5

echo "📊 System Status:"
echo "   Backend (3001): $(curl -s --max-time 3 http://localhost:3001/api/health > /dev/null && echo "✅ OK" || echo "❌ FAIL")"
echo "   Image Server (3003): $(curl -s --max-time 3 http://localhost:3003/health > /dev/null && echo "✅ OK" || echo "❌ FAIL")"
echo "   AI API (3004): $(curl -s --max-time 3 http://localhost:3004/health > /dev/null && echo "✅ OK" || echo "❌ FAIL")"
echo "   Frontend (3000): $(curl -s --max-time 3 http://localhost:3000 > /dev/null && echo "✅ OK" || echo "❌ FAIL")"

echo ""
echo "🎯 Sustainable Startup Complete!"
echo "🌐 Access your system at: http://localhost:3000"
echo "📱 The Speed Violation Monitor should now work correctly!"
echo ""
echo "📋 Process IDs for reference:"
echo "   Backend: $BACKEND_PID"
echo "   Image Server: $IMAGE_SERVER_PID" 
echo "   AI API: $AI_API_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "🛑 To stop all services: kill $BACKEND_PID $IMAGE_SERVER_PID $AI_API_PID $FRONTEND_PID"
echo ""
