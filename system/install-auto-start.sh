#!/bin/bash

# Potassium Radar System - Auto-start Installation Script
# This script sets up systemd services to automatically start the radar system on boot

echo "🚀 Installing Potassium Radar System Auto-start Services..."
echo "=========================================================="

# Check if running as root for systemd operations
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script needs to be run with sudo privileges for systemd setup"
    echo "💡 Usage: sudo ./install-auto-start.sh"
    exit 1
fi

# Get the actual user (not root when using sudo)
ACTUAL_USER=${SUDO_USER:-$USER}
USER_HOME=$(eval echo ~$ACTUAL_USER)
PROJECT_DIR="$USER_HOME/Desktop/radar_sys"

echo "👤 Installing for user: $ACTUAL_USER"
echo "📁 Project directory: $PROJECT_DIR"

# Verify project directories exist
if [ ! -d "$PROJECT_DIR/potassium-backend-" ]; then
    echo "❌ Backend directory not found: $PROJECT_DIR/potassium-backend-"
    exit 1
fi

if [ ! -d "$PROJECT_DIR/potassium-frontend" ]; then
    echo "❌ Frontend directory not found: $PROJECT_DIR/potassium-frontend"
    exit 1
fi

# Copy service files to systemd directory
echo "📋 Installing systemd service files..."
cp "$PROJECT_DIR/potassium-backend.service" /etc/systemd/system/
cp "$PROJECT_DIR/potassium-frontend.service" /etc/systemd/system/
cp "$PROJECT_DIR/potassium-image-server.service" /etc/systemd/system/

# Set proper permissions
chmod 644 /etc/systemd/system/potassium-*.service

# Reload systemd daemon
echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload

# Enable services to start on boot
echo "✅ Enabling services for auto-start on boot..."
systemctl enable potassium-backend.service
systemctl enable potassium-frontend.service
systemctl enable potassium-image-server.service

# Check service status
echo ""
echo "📊 Service Status:"
echo "=================="
systemctl is-enabled potassium-backend.service && echo "✅ Backend: Enabled for auto-start" || echo "❌ Backend: Not enabled"
systemctl is-enabled potassium-frontend.service && echo "✅ Frontend: Enabled for auto-start" || echo "❌ Frontend: Not enabled"
systemctl is-enabled potassium-image-server.service && echo "✅ Image Server: Enabled for auto-start" || echo "❌ Image Server: Not enabled"

echo ""
echo "🎯 Installation Complete!"
echo "========================"
echo ""
echo "📋 Available Commands:"
echo "  • Start all services:    sudo systemctl start potassium-backend potassium-frontend potassium-image-server"
echo "  • Stop all services:     sudo systemctl stop potassium-backend potassium-frontend potassium-image-server"
echo "  • Check service status:  sudo systemctl status potassium-backend"
echo "  • View service logs:     sudo journalctl -u potassium-backend -f"
echo "  • Restart a service:     sudo systemctl restart potassium-backend"
echo ""
echo "🔄 The services will automatically start when the PC boots up."
echo "🌐 Access URLs after boot:"
echo "   • Frontend: http://localhost:3001"
echo "   • Backend API: http://localhost:3000"
echo "   • Image Server: http://localhost:3003"
echo ""
echo "💡 To start services now without rebooting:"
echo "   sudo systemctl start potassium-backend potassium-frontend potassium-image-server"
