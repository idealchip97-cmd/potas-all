#!/bin/bash

echo "🔧 UDP Backend Debugging Script"
echo "================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Check if backend is running
echo "1. 📊 Checking Backend Status..."
BACKEND_PID=$(ps aux | grep "node server.js" | grep -v grep | awk '{print $2}')
if [ -n "$BACKEND_PID" ]; then
    echo "   ✅ Backend is running (PID: $BACKEND_PID)"
else
    echo "   ❌ Backend is NOT running"
fi

# 2. Check UDP port
echo ""
echo "2. 🔌 Checking UDP Port 17081..."
UDP_STATUS=$(netstat -ulpn 2>/dev/null | grep 17081)
if [ -n "$UDP_STATUS" ]; then
    echo "   ✅ UDP port 17081 is listening:"
    echo "   $UDP_STATUS"
else
    echo "   ❌ UDP port 17081 is NOT listening"
fi

# 3. Check if port is available
echo ""
echo "3. 🚪 Testing Port Availability..."
if command_exists nc; then
    timeout 2 nc -u -z localhost 17081 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "   ✅ Port 17081 is reachable"
    else
        echo "   ❌ Port 17081 is not reachable"
    fi
else
    echo "   ⚠️ netcat (nc) not available for port testing"
fi

# 4. Check firewall
echo ""
echo "4. 🔥 Checking Firewall..."
if command_exists ufw; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | grep "Status:")
    echo "   $UFW_STATUS"
else
    echo "   ⚠️ UFW firewall not available"
fi

# 5. Backend directory check
echo ""
echo "5. 📁 Backend Directory Check..."
BACKEND_DIR="/home/rnd2/Desktop/radar_sys/potassium-backend-"
if [ -d "$BACKEND_DIR" ]; then
    echo "   ✅ Backend directory exists"
    echo "   📄 Files in backend:"
    ls -la "$BACKEND_DIR" | grep -E "(server\.js|\.env)" | head -5
else
    echo "   ❌ Backend directory not found"
fi

echo ""
echo "🚀 BACKEND RESTART COMMANDS:"
echo "================================"
echo "# Stop existing backend"
echo "pkill -f 'node server.js'"
echo ""
echo "# Navigate to backend directory"
echo "cd /home/rnd2/Desktop/radar_sys/potassium-backend-"
echo ""
echo "# Start backend with debug output"
echo "DEBUG=* node server.js"
echo ""
echo "# Or start with environment variables"
echo "AUTO_START_EXTERNAL_DATA=true UDP_LOCAL_PORT=17081 node server.js"

echo ""
echo "🧪 UDP TESTING COMMANDS:"
echo "========================="
echo "# Test UDP with netcat"
echo "echo 'test message' | nc -u localhost 17081"
echo ""
echo "# Send binary radar packet"
echo "echo -ne '\\xFE\\xAF\\x05\\x01\\x0A\\x42\\x16\\xEF' | nc -u localhost 17081"
echo ""
echo "# Use our test script"
echo "cd /home/rnd2/Desktop/radar_sys"
echo "node test-udp-radar-binary.js 66"

echo ""
echo "🔍 MONITORING COMMANDS:"
echo "======================="
echo "# Watch UDP traffic (requires root)"
echo "sudo tcpdump -i lo -X port 17081"
echo ""
echo "# Monitor backend logs"
echo "tail -f /var/log/syslog | grep UDP"
echo ""
echo "# Check process details"
echo "ps aux | grep node"

echo ""
echo "🎯 FRONTEND DEBUGGING:"
echo "====================="
echo "# Check frontend status"
echo "ps aux | grep 'npm start\\|react-scripts'"
echo ""
echo "# Frontend URLs to check:"
echo "http://localhost:3004/fines-images-monitor"
echo "http://localhost:3004/radar-info-monitor"
echo ""
echo "# Check WebSocket connection in browser console:"
echo "# Open DevTools → Network → WS tab"

echo ""
echo "💡 COMMON ISSUES & FIXES:"
echo "========================="
echo "1. Port already in use:"
echo "   sudo lsof -i :17081"
echo "   kill -9 <PID>"
echo ""
echo "2. Permission denied:"
echo "   sudo chown -R $USER:$USER /home/rnd2/Desktop/radar_sys"
echo ""
echo "3. Node modules missing:"
echo "   cd /home/rnd2/Desktop/radar_sys/potassium-backend-"
echo "   npm install"
echo ""
echo "4. Environment variables:"
echo "   export AUTO_START_EXTERNAL_DATA=true"
echo "   export UDP_LOCAL_PORT=17081"
echo "   export NODE_ENV=development"
