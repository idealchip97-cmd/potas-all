#!/bin/bash

# Camera Filtering Test Script
echo "🧪 Testing Camera Filtering System"
echo "=================================="

echo ""
echo "📊 Test 1: Check available cameras"
curl -s http://localhost:3003/api/discover/cameras | jq '.cameras'

echo ""
echo "📊 Test 2: Get camera001 data for 2025-10-06"
echo "Expected: Only camera001 cases"
curl -s "http://localhost:3003/api/violations/camera001/2025-10-06" | jq '.violations[] | {eventId, cameraId: .verdict.camera_id}'

echo ""
echo "📊 Test 3: Get camera002 data for 2025-10-06"  
echo "Expected: Only camera002 cases"
curl -s "http://localhost:3003/api/violations/camera002/2025-10-06" | jq '.violations[] | {eventId, cameraId: .verdict.camera_id}'

echo ""
echo "📊 Test 4: Verify camera IDs in responses"
echo "Camera001 cases should have camera_id: 'camera001'"
echo "Camera002 cases should have camera_id: 'camera002'"

echo ""
echo "✅ API Level Testing Complete"
echo ""
echo "🔧 Frontend Testing Instructions:"
echo "1. Open http://localhost:3002/fines-images-monitor"
echo "2. Select 'Camera 1' from dropdown"
echo "3. Check browser console for logs:"
echo "   - Should see: 'STRICT FILTER: Loading data from camera001 ONLY'"
echo "   - Should see: 'FINAL FILTER: X/X cases match camera001'"
echo "4. Verify table shows only camera001 cases"
echo "5. Select 'Camera 2' and repeat verification"
