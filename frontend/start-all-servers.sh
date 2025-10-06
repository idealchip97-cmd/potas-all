#!/bin/bash

echo "🚀 بدء تشغيل جميع خوادم النظام..."

# تشغيل الخادم الخلفي (Backend)
echo "📡 تشغيل الخادم الخلفي على المنفذ 3000..."
cd /home/rnd2/Desktop/radar_sys/potassium-backend-
node server.js &
BACKEND_PID=$!
echo "✅ الخادم الخلفي يعمل (PID: $BACKEND_PID)"

# انتظار قصير
sleep 2

# تشغيل خادم الصور
echo "🖼️ تشغيل خادم الصور على المنفذ 3003..."
cd /home/rnd2/Desktop/radar_sys/potassium-frontend
node local-image-server.js &
IMAGE_SERVER_PID=$!
echo "✅ خادم الصور يعمل (PID: $IMAGE_SERVER_PID)"

# انتظار قصير
sleep 2

# تشغيل التطبيق الأمامي
echo "⚛️ تشغيل التطبيق الأمامي على المنفذ 3002..."
cd /home/rnd2/Desktop/radar_sys/potassium-frontend
npm start &
FRONTEND_PID=$!
echo "✅ التطبيق الأمامي يعمل (PID: $FRONTEND_PID)"

echo ""
echo "🎉 تم تشغيل جميع الخوادم بنجاح!"
echo ""
echo "📋 معلومات الخوادم:"
echo "   🔙 الخادم الخلفي: http://localhost:3000"
echo "   🖼️ خادم الصور: http://localhost:3003"
echo "   ⚛️ التطبيق الأمامي: http://localhost:3002"
echo ""
echo "🌐 افتح المتصفح واذهب إلى: http://localhost:3002/fines-images-monitor"
echo ""
echo "⚠️ لإيقاف جميع الخوادم، اضغط Ctrl+C"

# انتظار إشارة الإيقاف
trap 'echo "🛑 إيقاف جميع الخوادم..."; kill $BACKEND_PID $IMAGE_SERVER_PID $FRONTEND_PID; exit' INT

# انتظار لا نهائي
wait
