#!/bin/bash

# Potassium Radar System - Persistent UDP Listener Setup Script
# This script sets up the persistent UDP listener for automatic radar data processing

set -e

echo "🚀 Setting up Potassium Radar System - Persistent UDP Listener"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/home/rnd2/Desktop/radar_sys/potassium-backend-"
SERVICE_NAME="potassium-persistent-udp"
UDP_PORT=17081
SPEED_LIMIT=30

echo -e "${BLUE}📋 Configuration:${NC}"
echo "   • Backend Directory: $BACKEND_DIR"
echo "   • UDP Port: $UDP_PORT"
echo "   • Speed Limit: $SPEED_LIMIT km/h"
echo "   • Service Name: $SERVICE_NAME"
echo ""

# Check if running as root for systemd service installation
if [[ $EUID -eq 0 ]]; then
    INSTALL_SERVICE=true
    echo -e "${YELLOW}⚠️  Running as root - will install systemd service${NC}"
else
    INSTALL_SERVICE=false
    echo -e "${YELLOW}⚠️  Not running as root - will skip systemd service installation${NC}"
fi

# Step 1: Check dependencies
echo -e "${BLUE}1. Checking dependencies...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"

# Check MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠️  MySQL client not found - make sure MySQL server is running${NC}"
else
    echo -e "${GREEN}✅ MySQL client found${NC}"
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend directory found${NC}"

# Step 2: Install/Update dependencies
echo -e "${BLUE}2. Installing/updating Node.js dependencies...${NC}"
cd "$BACKEND_DIR"

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in backend directory${NC}"
    exit 1
fi

npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 3: Check database connection
echo -e "${BLUE}3. Testing database connection...${NC}"

# Create a simple test script
cat > test-db-connection.js << 'EOF'
const sequelize = require('./config/database');

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection successful');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();
EOF

if node test-db-connection.js; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    rm test-db-connection.js
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo -e "${YELLOW}💡 Please check your .env file and MySQL server${NC}"
    rm test-db-connection.js
    exit 1
fi

# Step 4: Check if port is available
echo -e "${BLUE}4. Checking if UDP port $UDP_PORT is available...${NC}"

if netstat -ln | grep -q ":$UDP_PORT "; then
    echo -e "${YELLOW}⚠️  Port $UDP_PORT is already in use${NC}"
    echo -e "${YELLOW}💡 You may need to stop other services using this port${NC}"
    
    # Show what's using the port
    echo "Processes using port $UDP_PORT:"
    lsof -i :$UDP_PORT || netstat -tlnp | grep :$UDP_PORT
else
    echo -e "${GREEN}✅ Port $UDP_PORT is available${NC}"
fi

# Step 5: Install systemd service (if running as root)
if [ "$INSTALL_SERVICE" = true ]; then
    echo -e "${BLUE}5. Installing systemd service...${NC}"
    
    # Copy service file
    if [ -f "/home/rnd2/Desktop/radar_sys/potassium-persistent-udp.service" ]; then
        cp "/home/rnd2/Desktop/radar_sys/potassium-persistent-udp.service" "/etc/systemd/system/"
        
        # Reload systemd
        systemctl daemon-reload
        
        # Enable service
        systemctl enable $SERVICE_NAME
        
        echo -e "${GREEN}✅ Systemd service installed and enabled${NC}"
        echo -e "${YELLOW}💡 Service will start automatically on boot${NC}"
    else
        echo -e "${RED}❌ Service file not found${NC}"
    fi
else
    echo -e "${BLUE}5. Skipping systemd service installation (not root)${NC}"
fi

# Step 6: Create startup script
echo -e "${BLUE}6. Creating startup script...${NC}"

cat > start-persistent-udp.sh << 'EOF'
#!/bin/bash

# Start Potassium Radar System with Persistent UDP Listener

BACKEND_DIR="/home/rnd2/Desktop/radar_sys/potassium-backend-"

echo "🚀 Starting Potassium Radar System..."
echo "📡 Persistent UDP Listener will start automatically"
echo "🗄️ All radar data will be saved to MySQL"
echo ""

cd "$BACKEND_DIR"

# Set environment variables
export NODE_ENV=production
export UDP_PORT=17081
export SPEED_LIMIT=30

# Start the server
node server.js
EOF

chmod +x start-persistent-udp.sh
echo -e "${GREEN}✅ Startup script created: start-persistent-udp.sh${NC}"

# Step 7: Test the system
echo -e "${BLUE}7. Testing the system...${NC}"

# Start server in background for testing
echo "Starting server for testing..."
cd "$BACKEND_DIR"
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✅ Server started successfully${NC}"
    
    # Test UDP status endpoint
    if curl -s http://localhost:3000/api/udp/status | grep -q '"listening":true'; then
        echo -e "${GREEN}✅ UDP listener is active${NC}"
    else
        echo -e "${YELLOW}⚠️  UDP listener status unclear${NC}"
    fi
else
    echo -e "${RED}❌ Server health check failed${NC}"
fi

# Stop test server
kill $SERVER_PID 2>/dev/null || true
sleep 2

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Start the system:"
echo "   ./start-persistent-udp.sh"
echo ""
echo "2. Or use systemd service (if installed):"
echo "   sudo systemctl start $SERVICE_NAME"
echo "   sudo systemctl status $SERVICE_NAME"
echo ""
echo "3. Test UDP listener:"
echo "   cd /home/rnd2/Desktop/radar_sys"
echo "   node test-persistent-udp.js"
echo ""
echo "4. Monitor system:"
echo "   • Health: http://localhost:3000/health"
echo "   • UDP Status: http://localhost:3000/api/udp/status"
echo "   • Radar Readings: http://localhost:3000/api/radars"
echo "   • Fines: http://localhost:3000/api/fines"
echo ""
echo -e "${YELLOW}💡 The system will automatically:${NC}"
echo "   • Listen on UDP port $UDP_PORT"
echo "   • Save all radar readings to MySQL"
echo "   • Create fines for speeds > $SPEED_LIMIT km/h"
echo "   • Handle text, JSON, and binary radar data formats"
echo ""
echo -e "${GREEN}✅ Your radar system is ready!${NC}"
