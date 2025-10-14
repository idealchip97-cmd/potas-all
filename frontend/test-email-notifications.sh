#!/bin/bash

# Email Notification System Test Script
# This script tests the email notification system for the radar speed detection system

echo "🧪 Testing Email Notification System"
echo "===================================="

# Test 1: Check notification status
echo ""
echo "📊 Test 1: Checking notification service status..."
curl -s http://localhost:3003/api/notifications/status | jq '.'

# Test 2: Manual violation check
echo ""
echo "🔍 Test 2: Triggering manual violation check..."
curl -s -X POST http://localhost:3003/api/notifications/check | jq '.'

# Test 3: Send test email (requires email credentials)
echo ""
echo "📧 Test 3: Sending test email..."
echo "Note: This will only work if EMAIL_USER and EMAIL_PASS are configured"
curl -s -X POST http://localhost:3003/api/notifications/test | jq '.'

echo ""
echo "✅ Email notification system tests completed!"
echo ""
echo "📋 Setup Instructions:"
echo "1. Set EMAIL_USER environment variable (your email)"
echo "2. Set EMAIL_PASS environment variable (app password)"
echo "3. Restart the server: pkill -f local-image-server && node local-image-server.js"
echo "4. New violations will automatically send emails to: ahmedalhloul@idealchip.com"
echo ""
echo "🔧 To configure email credentials:"
echo "export EMAIL_USER='your-email@gmail.com'"
echo "export EMAIL_PASS='your-app-password'"
