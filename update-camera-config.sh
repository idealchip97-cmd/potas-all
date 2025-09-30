#!/bin/bash

# Update Camera Configuration Script
# Updates FTP credentials with the specified camera IDs

echo "🔧 Updating Camera Configuration"
echo "================================="

# Configuration values
CAMERA_ID="camera001"
RADAR_CAMERA_ID="RadarCamera001"
FTP_HOST="192.186.1.55"
FTP_PORT="21"

echo "📋 Configuration to apply:"
echo "   CAMERA_ID: $CAMERA_ID"
echo "   RADAR_CAMERA_ID: $RADAR_CAMERA_ID"
echo "   FTP_HOST: $FTP_HOST"
echo "   FTP_PORT: $FTP_PORT"
echo ""

# Backend .env file
BACKEND_ENV="/home/rnd2/Desktop/radar_sys/potassium-backend-/.env"

echo "🔄 Updating backend configuration..."

# Create or update backend .env file
if [ ! -f "$BACKEND_ENV" ]; then
    echo "📄 Creating new backend .env file..."
    cp "/home/rnd2/Desktop/radar_sys/potassium-backend-/.env.example" "$BACKEND_ENV"
fi

# Update FTP configuration in backend .env
sed -i "s/^FTP_HOST=.*/FTP_HOST=$FTP_HOST/" "$BACKEND_ENV"
sed -i "s/^FTP_PORT=.*/FTP_PORT=$FTP_PORT/" "$BACKEND_ENV"
sed -i "s/^FTP_USER=.*/FTP_USER=$CAMERA_ID/" "$BACKEND_ENV"
sed -i "s/^FTP_PASSWORD=.*/FTP_PASSWORD=$RADAR_CAMERA_ID/" "$BACKEND_ENV"

# Add lines if they don't exist
grep -q "^FTP_HOST=" "$BACKEND_ENV" || echo "FTP_HOST=$FTP_HOST" >> "$BACKEND_ENV"
grep -q "^FTP_PORT=" "$BACKEND_ENV" || echo "FTP_PORT=$FTP_PORT" >> "$BACKEND_ENV"
grep -q "^FTP_USER=" "$BACKEND_ENV" || echo "FTP_USER=$CAMERA_ID" >> "$BACKEND_ENV"
grep -q "^FTP_PASSWORD=" "$BACKEND_ENV" || echo "FTP_PASSWORD=$RADAR_CAMERA_ID" >> "$BACKEND_ENV"

echo "✅ Backend configuration updated"

# Frontend .env file
FRONTEND_ENV="/home/rnd2/Desktop/radar_sys/potassium-frontend/.env"

echo "🔄 Updating frontend configuration..."

# Create or update frontend .env file
if [ ! -f "$FRONTEND_ENV" ]; then
    echo "📄 Creating new frontend .env file..."
    cat > "$FRONTEND_ENV" << EOF
# Frontend Configuration
REACT_APP_BACKEND_URL=http://localhost:3000
REACT_APP_IMAGE_SERVER_URL=http://localhost:3003
PORT=3001

# Camera Configuration
REACT_APP_CAMERA_ID=$CAMERA_ID
REACT_APP_FTP_HOST=$FTP_HOST
REACT_APP_FTP_PORT=$FTP_PORT
EOF
else
    # Update existing frontend .env
    sed -i "s/^REACT_APP_CAMERA_ID=.*/REACT_APP_CAMERA_ID=$CAMERA_ID/" "$FRONTEND_ENV"
    sed -i "s/^REACT_APP_FTP_HOST=.*/REACT_APP_FTP_HOST=$FTP_HOST/" "$FRONTEND_ENV"
    sed -i "s/^REACT_APP_FTP_PORT=.*/REACT_APP_FTP_PORT=$FTP_PORT/" "$FRONTEND_ENV"
    
    # Add lines if they don't exist
    grep -q "^REACT_APP_CAMERA_ID=" "$FRONTEND_ENV" || echo "REACT_APP_CAMERA_ID=$CAMERA_ID" >> "$FRONTEND_ENV"
    grep -q "^REACT_APP_FTP_HOST=" "$FRONTEND_ENV" || echo "REACT_APP_FTP_HOST=$FTP_HOST" >> "$FRONTEND_ENV"
    grep -q "^REACT_APP_FTP_PORT=" "$FRONTEND_ENV" || echo "REACT_APP_FTP_PORT=$FTP_PORT" >> "$FRONTEND_ENV"
fi

echo "✅ Frontend configuration updated"

# Update systemd service if it exists
SERVICE_FILE="/home/rnd2/Desktop/radar_sys/potassium-persistent-udp.service"
if [ -f "$SERVICE_FILE" ]; then
    echo "🔄 Updating systemd service configuration..."
    sed -i "s/Environment=FTP_USER=.*/Environment=FTP_USER=$CAMERA_ID/" "$SERVICE_FILE"
    sed -i "s/Environment=FTP_PASSWORD=.*/Environment=FTP_PASSWORD=$RADAR_CAMERA_ID/" "$SERVICE_FILE"
    sed -i "s/Environment=FTP_HOST=.*/Environment=FTP_HOST=$FTP_HOST/" "$SERVICE_FILE"
    echo "✅ Systemd service updated"
fi

echo ""
echo "🎉 Configuration Update Complete!"
echo ""
echo "📋 Applied Settings:"
echo "   • FTP Host: $FTP_HOST"
echo "   • FTP Port: $FTP_PORT"
echo "   • FTP User: $CAMERA_ID"
echo "   • FTP Password: $RADAR_CAMERA_ID"
echo ""
echo "🔄 Next Steps:"
echo "   1. Restart backend server: cd potassium-backend- && node server.js"
echo "   2. Restart frontend server: cd potassium-frontend && npm start"
echo "   3. Test FTP connection with new credentials"
echo ""
echo "🧪 Test Commands:"
echo "   • Backend health: curl http://localhost:3000/health"
echo "   • Image server: curl http://localhost:3003/health"
echo "   • UDP status: curl http://localhost:3000/api/udp/status"
echo ""
echo "✅ Camera configuration updated successfully!"
