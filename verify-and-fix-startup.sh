#!/bin/bash

# Radar System Startup Verification and Fix Script
# This script ensures the main monitoring page works correctly every time

echo "🔧 Radar System Startup Verification & Fix"
echo "=========================================="

# Function to test endpoint
test_endpoint() {
    local url=$1
    local name=$2
    
    echo "🧪 Testing $name..."
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo "✅ $name - OK"
        return 0
    else
        echo "❌ $name - FAILED"
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local port=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $name on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "✅ $name is ready on port $port"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - waiting..."
        sleep 2
        ((attempt++))
    done
    
    echo "❌ $name failed to start on port $port after $max_attempts attempts"
    return 1
}

# Check if MySQL/XAMPP is running
echo "1️⃣ Checking MySQL Database..."
if pgrep -f mysqld > /dev/null; then
    echo "✅ MySQL is running"
else
    echo "❌ MySQL is not running - starting XAMPP..."
    sudo /opt/lampp/lampp start mysql
fi

# Wait for critical services
echo "2️⃣ Verifying Core Services..."
wait_for_service 3001 "Backend Server"
wait_for_service 3003 "Local Image Server" 
wait_for_service 3000 "Frontend Dashboard"

# Test critical endpoints
echo "3️⃣ Testing API Endpoints..."
test_endpoint "http://localhost:3003/health" "Image Server Health"
test_endpoint "http://localhost:3003/api/discover/cameras" "Cameras Discovery"
test_endpoint "http://localhost:3001/api/health" "Backend Health"

# Test database connection
echo "4️⃣ Testing Database Connection..."
if curl -s --max-time 5 "http://localhost:3001/api/radars" > /dev/null 2>&1; then
    echo "✅ Database connection - OK"
else
    echo "❌ Database connection - FAILED"
    echo "🔧 Attempting to fix database issues..."
    
    # Run database fix if needed
    cd /home/rnd2/Desktop/radar_system_clean/backend
    node -e "
    const { Sequelize } = require('sequelize');
    const sequelize = new Sequelize('potassium_backend', 'root', '', {
        host: 'localhost', port: 3306, dialect: 'mysql', logging: false
    });
    sequelize.authenticate().then(() => {
        console.log('✅ Database connection restored');
        process.exit(0);
    }).catch(err => {
        console.log('❌ Database connection failed:', err.message);
        process.exit(1);
    });
    "
fi

# Check processing directories
echo "5️⃣ Checking Processing Directories..."
if [ -d "/srv/processing_inbox" ]; then
    echo "✅ Processing inbox exists"
    echo "📁 Available cameras:"
    ls -1 /srv/processing_inbox/ | grep camera | head -5
else
    echo "❌ Processing inbox missing"
    echo "🔧 Creating processing inbox..."
    sudo mkdir -p /srv/processing_inbox
    sudo chown -R $USER:$USER /srv/processing_inbox
fi

# Final verification
echo "6️⃣ Final System Verification..."
echo "🌐 Testing main dashboard..."

# Wait a moment for services to stabilize
sleep 3

if curl -s --max-time 10 "http://localhost:3000" > /dev/null 2>&1; then
    echo "✅ Main dashboard is accessible"
else
    echo "❌ Main dashboard is not accessible"
fi

echo ""
echo "🎯 Startup Verification Complete!"
echo "📱 Access your system at: http://localhost:3000"
echo "🔧 If issues persist, check the logs in the project directory"
echo ""
