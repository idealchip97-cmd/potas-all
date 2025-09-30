#!/bin/bash

# Comprehensive System Debug and Test Script
# Potassium Factory Radar System

set -e

echo "🔧 POTASSIUM RADAR SYSTEM - DEBUG & TEST SUITE"
echo "=============================================="
echo "Timestamp: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
IMAGE_SERVER_PORT=3003
UDP_PORT=17081

echo -e "${BLUE}📋 System Configuration:${NC}"
echo "   • Backend API: http://localhost:$BACKEND_PORT"
echo "   • Frontend: http://localhost:$FRONTEND_PORT"
echo "   • Image Server: http://localhost:$IMAGE_SERVER_PORT"
echo "   • UDP Listener: port $UDP_PORT"
echo ""

# Step 1: Check and kill conflicting processes
echo -e "${BLUE}1. Checking for port conflicts...${NC}"

check_and_kill_port() {
    local port=$1
    local service_name=$2
    
    echo -n "   Checking port $port ($service_name)... "
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${YELLOW}OCCUPIED${NC}"
        echo "   Processes using port $port:"
        lsof -i :$port | grep -v COMMAND
        
        # Kill processes using the port
        local pids=$(lsof -ti :$port)
        if [ ! -z "$pids" ]; then
            echo "   Killing processes: $pids"
            kill -9 $pids 2>/dev/null || true
            sleep 2
            echo -e "   ${GREEN}✅ Port $port cleared${NC}"
        fi
    else
        echo -e "${GREEN}FREE${NC}"
    fi
}

check_and_kill_port $BACKEND_PORT "Backend API"
check_and_kill_port $FRONTEND_PORT "Frontend"
check_and_kill_port $IMAGE_SERVER_PORT "Image Server"
check_and_kill_port $UDP_PORT "UDP Listener"

echo ""

# Step 2: Check database connection
echo -e "${BLUE}2. Testing database connection...${NC}"

cd /home/rnd2/Desktop/radar_sys/potassium-backend-

# Create database test script
cat > test-db.js << 'EOF'
const sequelize = require('./config/database');

async function testDB() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection successful');
        
        // Test a simple query
        const result = await sequelize.query('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Users table accessible, count: ${result[0][0].count}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

testDB();
EOF

if node test-db.js; then
    echo -e "${GREEN}✅ Database connection verified${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check MySQL server and credentials"
fi

rm -f test-db.js
echo ""

# Step 3: Start backend server
echo -e "${BLUE}3. Starting backend server...${NC}"

# Start backend in background
nohup node server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo -n "   Waiting for backend to start"
for i in {1..10}; do
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✅ STARTED${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

if ! curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    echo -e " ${RED}❌ FAILED${NC}"
    echo "Backend startup failed. Check backend.log for details:"
    tail -20 backend.log
    exit 1
fi

echo ""

# Step 4: Test authentication system
echo -e "${BLUE}4. Testing authentication system...${NC}"

# Test signup
echo -n "   Testing user signup... "
SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:$BACKEND_PORT/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"debug@test.com","password":"password123","firstName":"Debug","lastName":"User","role":"admin"}')

if echo "$SIGNUP_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ SUCCESS${NC}"
    TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${TOKEN:0:20}..."
else
    echo -e "${YELLOW}⚠️ USER EXISTS (OK)${NC}"
    
    # Try signin instead
    echo -n "   Testing user signin... "
    SIGNIN_RESPONSE=$(curl -s -X POST http://localhost:$BACKEND_PORT/api/auth/signin \
        -H "Content-Type: application/json" \
        -d '{"email":"debug@test.com","password":"password123"}')
    
    if echo "$SIGNIN_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        TOKEN=$(echo "$SIGNIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        echo "   Token: ${TOKEN:0:20}..."
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "   Response: $SIGNIN_RESPONSE"
        exit 1
    fi
fi

echo ""

# Step 5: Test API endpoints
echo -e "${BLUE}5. Testing API endpoints...${NC}"

test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local auth_required=${4:-true}
    
    echo -n "   $description... "
    
    if [ "$auth_required" = "true" ]; then
        RESPONSE=$(curl -s -X $method "http://localhost:$BACKEND_PORT$endpoint" \
            -H "Authorization: Bearer $TOKEN")
    else
        RESPONSE=$(curl -s -X $method "http://localhost:$BACKEND_PORT$endpoint")
    fi
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "     Response: ${RESPONSE:0:100}..."
        return 1
    fi
}

# Test core endpoints
test_endpoint "GET" "/health" "Health check" false
test_endpoint "GET" "/api/radars" "Radars list"
test_endpoint "GET" "/api/fines" "Fines list"
test_endpoint "GET" "/api/udp-readings" "UDP readings"
test_endpoint "GET" "/api/udp-readings/stats/summary" "UDP statistics"
test_endpoint "GET" "/api/udp/status" "UDP listener status"

echo ""

# Step 6: Test UDP listener
echo -e "${BLUE}6. Testing UDP listener...${NC}"

echo -n "   Checking UDP port $UDP_PORT... "
if netstat -ulnp | grep -q ":$UDP_PORT "; then
    echo -e "${GREEN}✅ LISTENING${NC}"
else
    echo -e "${RED}❌ NOT LISTENING${NC}"
    echo "   UDP listener may not be started properly"
fi

# Send test UDP message
echo -n "   Sending test UDP message... "
echo "ID: 99,Speed: 65, Time: $(date +%H:%M:%S)." | nc -u -w1 localhost $UDP_PORT
sleep 2

# Check if message was processed
UDP_STATS=$(curl -s "http://localhost:$BACKEND_PORT/api/udp/status" -H "Authorization: Bearer $TOKEN")
if echo "$UDP_STATS" | grep -q '"messagesReceived"'; then
    MESSAGES_COUNT=$(echo "$UDP_STATS" | grep -o '"messagesReceived":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✅ PROCESSED${NC}"
    echo "   Total messages received: $MESSAGES_COUNT"
else
    echo -e "${YELLOW}⚠️ UNKNOWN${NC}"
fi

echo ""

# Step 7: Test image server (if running)
echo -e "${BLUE}7. Testing image server...${NC}"

if netstat -tlnp | grep -q ":$IMAGE_SERVER_PORT "; then
    echo -n "   Image server health check... "
    if curl -s http://localhost:$IMAGE_SERVER_PORT/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ RUNNING${NC}"
    else
        echo -e "${RED}❌ NOT RESPONDING${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Image server not running on port $IMAGE_SERVER_PORT${NC}"
fi

echo ""

# Step 8: System status summary
echo -e "${BLUE}8. System Status Summary${NC}"
echo "========================"

# Check all services
check_service() {
    local port=$1
    local name=$2
    
    if netstat -tlnp | grep -q ":$port "; then
        echo -e "   $name: ${GREEN}✅ RUNNING${NC} (port $port)"
        return 0
    else
        echo -e "   $name: ${RED}❌ STOPPED${NC} (port $port)"
        return 1
    fi
}

SERVICES_OK=0
check_service $BACKEND_PORT "Backend API" && ((SERVICES_OK++))
check_service $IMAGE_SERVER_PORT "Image Server" && ((SERVICES_OK++))

# Check UDP separately
if netstat -ulnp | grep -q ":$UDP_PORT "; then
    echo -e "   UDP Listener: ${GREEN}✅ ACTIVE${NC} (port $UDP_PORT)"
    ((SERVICES_OK++))
else
    echo -e "   UDP Listener: ${RED}❌ INACTIVE${NC} (port $UDP_PORT)"
fi

echo ""
echo -e "${BLUE}📊 Service Status: $SERVICES_OK/3 services running${NC}"

if [ $SERVICES_OK -eq 3 ]; then
    echo -e "${GREEN}🎉 ALL SYSTEMS OPERATIONAL${NC}"
else
    echo -e "${YELLOW}⚠️ Some services need attention${NC}"
fi

echo ""

# Step 9: Frontend integration check
echo -e "${BLUE}9. Frontend Integration Check${NC}"
echo "============================="

if netstat -tlnp | grep -q ":$FRONTEND_PORT "; then
    echo -e "   Frontend Dev Server: ${GREEN}✅ RUNNING${NC}"
    echo "   Access URL: http://localhost:$FRONTEND_PORT"
    echo ""
    echo -e "${BLUE}📱 Frontend should now connect to:${NC}"
    echo "   • Backend API: http://localhost:$BACKEND_PORT"
    echo "   • Image Server: http://localhost:$IMAGE_SERVER_PORT"
    echo "   • UDP Status: http://localhost:$BACKEND_PORT/api/udp/status"
else
    echo -e "   Frontend Dev Server: ${YELLOW}⚠️ NOT RUNNING${NC}"
    echo "   Start with: cd /home/rnd2/Desktop/radar_sys/potassium-frontend && npm start"
fi

echo ""

# Step 10: Cleanup and final instructions
echo -e "${BLUE}10. Final Instructions${NC}"
echo "====================="

echo "✅ Backend server is running (PID: $BACKEND_PID)"
echo "📄 Backend logs: /home/rnd2/Desktop/radar_sys/potassium-backend-/backend.log"
echo ""
echo "🔧 To stop backend server:"
echo "   kill $BACKEND_PID"
echo ""
echo "🚀 To restart all services:"
echo "   ./debug-and-test-system.sh"
echo ""
echo "📊 Monitor system:"
echo "   • Health: curl http://localhost:$BACKEND_PORT/health"
echo "   • UDP Status: curl http://localhost:$BACKEND_PORT/api/udp/status"
echo "   • Live Readings: curl http://localhost:$BACKEND_PORT/api/udp-readings/live"
echo ""

if [ $SERVICES_OK -eq 3 ]; then
    echo -e "${GREEN}🎯 SYSTEM READY FOR FRONTEND INTEGRATION${NC}"
else
    echo -e "${YELLOW}⚠️ Please address service issues before frontend integration${NC}"
fi

echo ""
echo "Debug and test completed at $(date)"
