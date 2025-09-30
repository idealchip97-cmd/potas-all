#!/bin/bash

# Complete Radar System Startup Script
echo "🚀 Starting Complete Radar Speed Detection System"
echo "=================================================="

# Function to check if a process is running
check_process() {
    if pgrep -f "$1" > /dev/null; then
        echo "✅ $2 is running"
        return 0
    else
        echo "❌ $2 is not running"
        return 1
    fi
}

# Function to start a service in background
start_service() {
    echo "🔄 Starting $2..."
    cd /home/rnd2/Desktop/radar_sys/potassium-frontend
    nohup $1 > logs/$3.log 2>&1 &
    sleep 2
    if check_process "$1" "$2"; then
        echo "✅ $2 started successfully"
    else
        echo "❌ Failed to start $2"
    fi
}

# Create logs directory
mkdir -p /home/rnd2/Desktop/radar_sys/potassium-frontend/logs

echo ""
echo "📊 System Status Check:"
echo "----------------------"

# Check if React app is running
check_process "react-scripts" "React Frontend (port 3004)"

# Check if local image server is running  
check_process "local-image-server.js" "Local Image Server (port 3003)"

# Check if UDP server is running
check_process "radar-udp-server.js" "UDP Radar Server (ports 17081/18081)"

echo ""
echo "🎯 Starting Missing Services:"
echo "-----------------------------"

# Start UDP server if not running
if ! check_process "radar-udp-server.js" "UDP Radar Server"; then
    start_service "node radar-udp-server.js" "UDP Radar Server" "udp-server"
fi

# Start React app if not running
if ! check_process "react-scripts" "React Frontend"; then
    echo "🔄 Starting React Frontend..."
    cd /home/rnd2/Desktop/radar_sys/potassium-frontend
    PORT=3004 nohup npm start > logs/react-app.log 2>&1 &
    sleep 5
    check_process "react-scripts" "React Frontend"
fi

# Start local image server if not running
if ! check_process "local-image-server.js" "Local Image Server"; then
    start_service "node local-image-server.js" "Local Image Server" "image-server"
fi

echo ""
echo "🌉 Serial-to-UDP Bridge:"
echo "------------------------"
echo "💡 To connect your radar simulator to the system:"
echo "   1. Make sure your radar simulator is connected to /dev/ttyUSB0"
echo "   2. Run: node serial-to-udp-bridge.js"
echo "   3. Start your radar simulator: python3 ~/Desktop/radar_simulator/radar_simulator.py"

echo ""
echo "🌐 System URLs:"
echo "--------------"
echo "📊 Radar Info Monitor:    http://localhost:3004/radar-info-monitor"
echo "📷 Fines Images Monitor:  http://localhost:3004/fines-images-monitor"
echo "🗄️ Database (phpMyAdmin): http://localhost/phpmyadmin"

echo ""
echo "🧪 Testing Commands:"
echo "-------------------"
echo "📡 Test UDP directly:     echo 'ID: 1,Speed: 55, Time: 15:02:00.' | nc -u localhost 17081"
echo "🎮 Test with script:      node test-radar-udp.js"
echo "🌉 Start serial bridge:   node serial-to-udp-bridge.js"

echo ""
echo "📋 System Architecture:"
echo "----------------------"
echo "1. 🎮 Radar Simulator → 📡 Serial Port (/dev/ttyUSB0)"
echo "2. 🌉 Serial Bridge → 📤 UDP (localhost:17081)"  
echo "3. 🎯 UDP Server → 🗄️ MySQL Database (fines table)"
echo "4. 🌐 WebSocket → 📊 React Frontend (real-time updates)"
echo "5. 📷 FTP Images → 🖼️ Image Correlation"

echo ""
echo "✅ System startup complete!"
echo "💡 Monitor the logs in the 'logs/' directory for troubleshooting"
