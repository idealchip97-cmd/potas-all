# دليل التثبيت السريع - نظام رادار كشف السرعة

## التثبيت السريع (خطوة واحدة)

### 1. تحميل وتشغيل سكريبت التثبيت التلقائي
```bash
# تحميل سكريبت التثبيت
wget https://raw.githubusercontent.com/basharagb/potassium-frontend/main/install.sh

# إعطاء صلاحيات التنفيذ
chmod +x install.sh

# تشغيل التثبيت التلقائي
./install.sh
```

## التثبيت اليدوي (خطوة بخطوة)

### الخطوة 1: تحديث النظام وتثبيت المتطلبات
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# تثبيت MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# تثبيت Git
sudo apt install git -y
```

### الخطوة 2: إعداد قاعدة البيانات
```bash
# تسجيل الدخول إلى MySQL
sudo mysql -u root -p

# تنفيذ الأوامر التالية في MySQL:
CREATE DATABASE potassium_backend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'root'@'localhost' IDENTIFIED BY 'RootPass2025';
GRANT ALL PRIVILEGES ON potassium_backend.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### الخطوة 3: استنساخ المشروع
```bash
# استنساخ المشروع
git clone https://github.com/basharagb/potassium-frontend.git
cd potassium-frontend
```

### الخطوة 4: تثبيت التبعيات
```bash
# تثبيت تبعيات Backend
cd backend
npm install
cd ..

# تثبيت تبعيات Frontend
cd frontend
npm install
cd ..
```

### الخطوة 5: إعداد المجلدات
```bash
# إنشاء المجلدات المطلوبة
sudo mkdir -p /srv/processing_inbox
sudo mkdir -p /srv/camera_uploads
sudo chown -R $USER:$USER /srv/processing_inbox
sudo chown -R $USER:$USER /srv/camera_uploads
```

### الخطوة 6: إعداد قاعدة البيانات
```bash
# استيراد هيكل قاعدة البيانات
mysql -u root -p potassium_backend < backend/potassium_backend.sql

# تشغيل البذور
cd backend
npm run seed
cd ..
```

### الخطوة 7: تشغيل النظام
```bash
# إعطاء صلاحيات التنفيذ
chmod +x start-all.sh

# تشغيل جميع الخدمات
./start-all.sh
```

## الوصول إلى النظام

بعد التثبيت الناجح، يمكنك الوصول إلى:

- **الواجهة الرئيسية**: http://localhost:3000
- **API الخادم الخلفي**: http://localhost:3001  
- **خادم الصور**: http://localhost:3003

## بيانات تسجيل الدخول

```
المدير العام:
البريد الإلكتروني: admin@potasfactory.com
كلمة المرور: admin123

المشغل:
البريد الإلكتروني: operator@potasfactory.com
كلمة المرور: operator123

المراقب:
البريد الإلكتروني: viewer@potasfactory.com
كلمة المرور: viewer123
```

## استكشاف الأخطاء السريع

### مشكلة: المنافذ مستخدمة
```bash
# إيقاف العمليات المتضاربة
sudo lsof -ti:3000,3001,3003 | xargs sudo kill -9

# إعادة تشغيل النظام
./start-all.sh
```

### مشكلة: خطأ في قاعدة البيانات
```bash
# التحقق من حالة MySQL
sudo systemctl status mysql

# إعادة تشغيل MySQL
sudo systemctl restart mysql

# إعادة تشغيل النظام
./start-all.sh
```

### مشكلة: مجلدات غير موجودة
```bash
# إنشاء المجلدات مرة أخرى
sudo mkdir -p /srv/processing_inbox /srv/camera_uploads
sudo chown -R $USER:$USER /srv/processing_inbox /srv/camera_uploads
```

## إيقاف النظام
```bash
# إيقاف جميع الخدمات
./stop-all.sh
```

## الحصول على المساعدة

إذا واجهت أي مشاكل:

1. تحقق من ملفات السجلات:
   - `backend_server.log`
   - `ftp_image_server.log` 
   - `frontend_dashboard.log`

2. راجع الأدلة التفصيلية:
   - `README.md` - الدليل الشامل
   - `CONFIG.md` - دليل الإعدادات
   - `DEPLOYMENT.md` - دليل النشر

3. تحقق من متطلبات النظام في `README.md`

---

**تم إنشاء هذا الدليل لتسهيل التثبيت السريع لنظام رادار كشف السرعة**
