#!/bin/bash

# Potassium Radar System Management Script
# Easy control of all radar system services

SERVICES=("potassium-backend" "potassium-frontend" "potassium-image-server")

show_usage() {
    echo "🚗 Potassium Radar System Management"
    echo "===================================="
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     - Start all radar services"
    echo "  stop      - Stop all radar services"
    echo "  restart   - Restart all radar services"
    echo "  status    - Show status of all services"
    echo "  logs      - Show logs for all services"
    echo "  enable    - Enable auto-start on boot"
    echo "  disable   - Disable auto-start on boot"
    echo "  install   - Install systemd services (requires sudo)"
    echo ""
    echo "Examples:"
    echo "  $0 start          # Start all services"
    echo "  $0 status         # Check if services are running"
    echo "  sudo $0 install   # Install auto-start services"
}

check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        echo "❌ This command requires sudo privileges"
        echo "💡 Try: sudo $0 $1"
        exit 1
    fi
}

start_services() {
    echo "🚀 Starting Potassium Radar System services..."
    for service in "${SERVICES[@]}"; do
        echo "▶️  Starting $service..."
        systemctl start "$service.service"
        if systemctl is-active --quiet "$service.service"; then
            echo "✅ $service started successfully"
        else
            echo "❌ Failed to start $service"
        fi
    done
    echo ""
    echo "🌐 Access URLs:"
    echo "   • Frontend: http://localhost:3001"
    echo "   • Backend API: http://localhost:3000"
    echo "   • Image Server: http://localhost:3003"
}

stop_services() {
    echo "🛑 Stopping Potassium Radar System services..."
    for service in "${SERVICES[@]}"; do
        echo "⏹️  Stopping $service..."
        systemctl stop "$service.service"
        if ! systemctl is-active --quiet "$service.service"; then
            echo "✅ $service stopped successfully"
        else
            echo "❌ Failed to stop $service"
        fi
    done
}

restart_services() {
    echo "🔄 Restarting Potassium Radar System services..."
    stop_services
    sleep 2
    start_services
}

show_status() {
    echo "📊 Potassium Radar System Status"
    echo "================================"
    for service in "${SERVICES[@]}"; do
        if systemctl is-active --quiet "$service.service"; then
            status="🟢 RUNNING"
        else
            status="🔴 STOPPED"
        fi
        
        if systemctl is-enabled --quiet "$service.service" 2>/dev/null; then
            autostart="(Auto-start: ✅)"
        else
            autostart="(Auto-start: ❌)"
        fi
        
        echo "  $service: $status $autostart"
    done
    echo ""
    
    # Check if ports are in use
    echo "🔌 Port Status:"
    for port in 3000 3001 3003; do
        if lsof -i:$port -sTCP:LISTEN >/dev/null 2>&1; then
            echo "  Port $port: 🟢 IN USE"
        else
            echo "  Port $port: 🔴 FREE"
        fi
    done
}

show_logs() {
    echo "📋 Showing logs for all services (Press Ctrl+C to exit)..."
    journalctl -u potassium-backend.service -u potassium-frontend.service -u potassium-image-server.service -f
}

enable_autostart() {
    check_sudo "enable"
    echo "✅ Enabling auto-start on boot..."
    for service in "${SERVICES[@]}"; do
        systemctl enable "$service.service"
        echo "✅ $service enabled for auto-start"
    done
}

disable_autostart() {
    check_sudo "disable"
    echo "❌ Disabling auto-start on boot..."
    for service in "${SERVICES[@]}"; do
        systemctl disable "$service.service"
        echo "❌ $service disabled from auto-start"
    done
}

install_services() {
    check_sudo "install"
    echo "📦 Installing systemd services..."
    ./install-auto-start.sh
}

# Main script logic
case "$1" in
    start)
        check_sudo "start"
        start_services
        ;;
    stop)
        check_sudo "stop"
        stop_services
        ;;
    restart)
        check_sudo "restart"
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    enable)
        enable_autostart
        ;;
    disable)
        disable_autostart
        ;;
    install)
        install_services
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
