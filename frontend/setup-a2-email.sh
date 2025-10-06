#!/bin/bash

# A2 Hosting Email Configuration Setup Script
# This script sets up environment variables for the cPanel email account

echo "🔧 Setting up A2 Hosting Email Configuration..."
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo "📄 Found existing .env file"
    # Backup existing .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "📋 Backed up existing .env file"
else
    echo "📄 Creating new .env file"
    touch .env
fi

# Set email configuration
echo "EMAIL_USER=ahmedalhloul@idealchip.com" >> .env
echo "EMAIL_PASS=your-cpanel-email-password" >> .env

echo ""
echo "✅ Email configuration added to .env file"
echo ""
echo "🔐 IMPORTANT: You need to update the EMAIL_PASS in .env file with the actual password"
echo "    Edit .env and replace 'your-cpanel-email-password' with the real password"
echo ""
echo "📧 Email Account: ahmedalhloul@idealchip.com"
echo "🌐 SMTP Server: mail.idealchip.com"
echo "🔌 Port: 587 (STARTTLS)"
echo ""
echo "🧪 To test the email setup after setting the password:"
echo "    1. Start the server: node local-image-server.js"
echo "    2. Test email: curl -X POST http://localhost:3003/api/notifications/test"
echo ""
echo "📋 Configuration complete! Remember to set the correct password in .env"
