# إعداد الصور المحلية - Setup Local Images

## المشكلة الحالية
النظام يعرض صور وهمية من `picsum.photos` بدلاً من الصور الحقيقية من خادم FTP لأن:
- لا يوجد اتصال شبكة إلى `192.168.1.14:21`
- الحاجة إلى VPN أو شبكة محلية

## الحل المؤقت: استخدام الصور المحلية

### 1. إنشاء مجلد للصور المحلية
```bash
mkdir -p /home/silos/Desktop/radar_system/potassium-frontend/local-images/2025-09-28/Common
```

### 2. نسخ الصور الحقيقية
انسخ الصور من مجلد FTP إلى المجلد المحلي:
```bash
# من المسار: admin:///srv/camera_uploads/camera001/192.168.1.54/2025-09-28/Common/
# إلى: /home/silos/Desktop/radar_system/potassium-frontend/local-images/2025-09-28/Common/
```

### 3. تشغيل خادم الصور المحلي
```bash
cd /home/silos/Desktop/radar_system/potassium-frontend
python3 -m http.server 8080 --directory local-images
```

## الحل النهائي: الاتصال المباشر بـ FTP

للحصول على الصور الحقيقية مباشرة من خادم FTP:

### المتطلبات:
1. **اتصال شبكة**: يجب أن يكون الجهاز على نفس الشبكة المحلية مع `192.168.1.14`
2. **بيانات الاعتماد**: `admin` / `idealchip123`
3. **المسار الصحيح**: `/srv/camera_uploads/camera001/192.168.1.54/2025-09-28/Common/`

### خطوات التشغيل:
1. تأكد من الاتصال بالشبكة المحلية
2. شغل خادم FTP Image Server: `cd ftp-server && node server.js`
3. تحقق من الاتصال: `curl http://localhost:3003/health`
4. اضغط "Clear Cache" في واجهة FTP Monitor

## اختبار الاتصال
```bash
# اختبار الاتصال بخادم FTP
telnet 192.168.1.14 21

# أو باستخدام curl
curl -v ftp://admin:idealchip123@192.168.1.14/srv/camera_uploads/camera001/192.168.1.54/
```
