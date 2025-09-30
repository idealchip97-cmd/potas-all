#!/bin/bash

# System Status Check Script
# Potassium Factory Radar System

echo "🔍 POTASSIUM RADAR SYSTEM - STATUS CHECK"
echo "========================================"
echo "Timestamp: $(date)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check services
echo -e "${BLUE}📊 Service Status:${NC}"

check_service() {
    local port=$1
    local name=$2
    local protocol=${3:-tcp}
    
    if [ "$protocol" = "udp" ]; then
        if netstat -ulnp 2>/dev/null | grep -q ":$port "; then
            echo -e "   $name (port $port): ${GREEN}✅ RUNNING${NC}"
            return 0
        else
            echo -e "   $name (port $port): ${RED}❌ STOPPED${NC}"
            return 1
        fi
    else
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            echo -e "   $name (port $port): ${GREEN}✅ RUNNING${NC}"
            return 0
        else
            echo -e "   $name (port $port): ${RED}❌ STOPPED${NC}"
            return 1
        fi
    fi
}

SERVICES_OK=0
check_service 3000 "Backend API" && ((SERVICES_OK++))
check_service 3001 "Frontend React" && ((SERVICES_OK++))
check_service 3003 "Image Server" && ((SERVICES_OK++))
check_service 17081 "UDP Listener" udp && ((SERVICES_OK++))

echo ""
echo -e "${BLUE}📈 Overall Status: $SERVICES_OK/4 services running${NC}"

# Test API endpoints if backend is running
if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo ""
    echo -e "${BLUE}🔌 API Health Checks:${NC}"
    
    # Test health endpoint
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "   Backend Health: ${GREEN}✅ HEALTHY${NC}"
        
        # Test login
        LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signin \
            -H "Content-Type: application/json" \
            -d '{"email":"admin@potasfactory.com","password":"admin123"}' 2>/dev/null)
        
        if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
            echo -e "   Authentication: ${GREEN}✅ WORKING${NC}"
            
            TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
            
            # Test protected endpoint
            if curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/radars > /dev/null 2>&1; then
                echo -e "   Protected APIs: ${GREEN}✅ WORKING${NC}"
            else
                echo -e "   Protected APIs: ${RED}❌ FAILED${NC}"
            fi
            
            # Test UDP status
            UDP_STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/udp/status 2>/dev/null)
            if echo "$UDP_STATUS" | grep -q '"listening":true'; then
                echo -e "   UDP Listener: ${GREEN}✅ ACTIVE${NC}"
            else
                echo -e "   UDP Listener: ${RED}❌ INACTIVE${NC}"
            fi
            
        else
            echo -e "   Authentication: ${RED}❌ FAILED${NC}"
        fi
    else
        echo -e "   Backend Health: ${RED}❌ UNHEALTHY${NC}"
    fi
fi

# Test image server if running
if netstat -tlnp 2>/dev/null | grep -q ":3003 "; then
    echo ""
    echo -e "${BLUE}🖼️ Image Server Status:${NC}"
    
    if curl -s http://localhost:3003/health > /dev/null 2>&1; then
        echo -e "   Image Server: ${GREEN}✅ HEALTHY${NC}"
    else
        echo -e "   Image Server: ${RED}❌ UNHEALTHY${NC}"
    fi
fi

# Database check
echo ""
echo -e "${BLUE}🗄️ Database Status:${NC}"

if command -v mysql >/dev/null 2>&1; then
    if mysql -u root -p"Root!Pass#2025" -e "USE potassium_backend; SELECT 1;" >/dev/null 2>&1; then
        echo -e "   MySQL Database: ${GREEN}✅ CONNECTED${NC}"
        
        # Check table counts
        USER_COUNT=$(mysql -u root -p"Root!Pass#2025" -D potassium_backend -se "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
        RADAR_COUNT=$(mysql -u root -p"Root!Pass#2025" -D potassium_backend -se "SELECT COUNT(*) FROM radars;" 2>/dev/null || echo "0")
        FINE_COUNT=$(mysql -u root -p"Root!Pass#2025" -D potassium_backend -se "SELECT COUNT(*) FROM fines;" 2>/dev/null || echo "0")
        UDP_COUNT=$(mysql -u root -p"Root!Pass#2025" -D potassium_backend -se "SELECT COUNT(*) FROM udp_readings;" 2>/dev/null || echo "0")
        
        echo -e "   Users: $USER_COUNT | Radars: $RADAR_COUNT | Fines: $FINE_COUNT | UDP Readings: $UDP_COUNT"
    else
        echo -e "   MySQL Database: ${RED}❌ CONNECTION FAILED${NC}"
    fi
else
    echo -e "   MySQL Client: ${YELLOW}⚠️ NOT INSTALLED${NC}"
fi

# System resources
echo ""
echo -e "${BLUE}💻 System Resources:${NC}"

# Memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')
echo -e "   Memory Usage: $MEMORY_USAGE"

# Disk usage
DISK_USAGE=$(df -h / | awk 'NR==2{printf "%s", $5}')
echo -e "   Disk Usage: $DISK_USAGE"

# Load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
echo -e "   Load Average:$LOAD_AVG"

# URLs and access information
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo "   Frontend: http://localhost:3001"
echo "   Backend API: http://localhost:3000"
echo "   Health Check: http://localhost:3000/health"
echo "   Image Server: http://localhost:3003"
echo ""
echo -e "${BLUE}🔐 Login Credentials:${NC}"
echo "   Admin: admin@potasfactory.com / admin123"
echo ""

# Final status
if [ $SERVICES_OK -eq 4 ]; then
    echo -e "${GREEN}🎉 ALL SYSTEMS OPERATIONAL${NC}"
    echo -e "${GREEN}✅ Ready for production use${NC}"
elif [ $SERVICES_OK -ge 2 ]; then
    echo -e "${YELLOW}⚠️ PARTIAL SYSTEM OPERATION${NC}"
    echo -e "${YELLOW}💡 Some services need to be started${NC}"
else
    echo -e "${RED}❌ SYSTEM DOWN${NC}"
    echo -e "${RED}🔧 Multiple services need attention${NC}"
fi

echo ""
echo "Status check completed at $(date)"
