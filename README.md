# نظام رادار كشف السرعة - مصنع البوتاسيوم

## نظرة عامة
نظام متكامل لكشف السرعة باستخدام الرادار مع واجهة ويب لمراقبة المخالفات وإدارة البيانات. النظام مصمم خصيصاً لمصنع البوتاسيوم لمراقبة سرعة المركبات وتسجيل المخالفات.

## المتطلبات الأساسية

### متطلبات النظام
- **نظام التشغيل**: Ubuntu 20.04+ أو أي توزيعة Linux
- **Node.js**: الإصدار 18.0.0 أو أحدث
- **MySQL**: الإصدار 8.0 أو أحدث
- **Git**: لاستنساخ المشروع
- **RAM**: 4GB كحد أدنى، 8GB مُوصى به
- **مساحة القرص**: 10GB كحد أدنى

### تثبيت المتطلبات الأساسية

#### 1. تحديث النظام
```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. تثبيت Node.js و npm
```bash
# تثبيت Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# التحقق من التثبيت
node --version
npm --version
```

#### 3. تثبيت MySQL
```bash
# تثبيت MySQL Server
sudo apt install mysql-server -y

# تأمين MySQL
sudo mysql_secure_installation

# تسجيل الدخول إلى MySQL
sudo mysql -u root -p
```

#### 4. إنشاء قاعدة البيانات
```sql
-- في MySQL shell
CREATE DATABASE potassium_backend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'root'@'localhost' IDENTIFIED BY 'RootPass2025';
GRANT ALL PRIVILEGES ON potassium_backend.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 5. تثبيت Git
```bash
sudo apt install git -y
```

## تثبيت المشروع

### 1. استنساخ المشروع
```bash
# استنساخ المشروع من GitHub
git clone https://github.com/basharagb/potassium-frontend.git
cd potassium-frontend

# أو إذا كان لديك المشروع محلياً
# انسخ جميع الملفات إلى مجلد جديد
```

### 2. تثبيت التبعيات

#### تثبيت تبعيات الخادم الخلفي (Backend)
```bash
cd backend
npm install
cd ..
```

#### تثبيت تبعيات الواجهة الأمامية (Frontend)
```bash
cd frontend
npm install
cd ..
```

### 3. إعداد قاعدة البيانات
```bash
# استيراد هيكل قاعدة البيانات
mysql -u root -p potassium_backend < backend/potassium_backend.sql

# تشغيل البذور (إنشاء بيانات تجريبية)
cd backend
npm run seed
cd ..
```

### 4. إعداد المجلدات المطلوبة
```bash
# إنشاء مجلدات النظام
sudo mkdir -p /srv/processing_inbox
sudo mkdir -p /srv/camera_uploads
sudo chown -R $USER:$USER /srv/processing_inbox
sudo chown -R $USER:$USER /srv/camera_uploads

# إنشاء بيانات تجريبية للاختبار
mkdir -p /srv/processing_inbox/camera001/2025-10-06/case001
mkdir -p /srv/processing_inbox/camera002/2025-10-06/case001
mkdir -p /srv/processing_inbox/camera002/2025-10-06/case002
```

## تشغيل النظام

### الطريقة الأولى: تشغيل تلقائي (مُوصى به)
```bash
# إعطاء صلاحيات التنفيذ للسكريبت
chmod +x start-all.sh
chmod +x stop-all.sh

# تشغيل جميع الخدمات
./start-all.sh
```

### الطريقة الثانية: تشغيل يدوي

#### 1. تشغيل الخادم الخلفي (Backend)
```bash
cd backend
npm start
# سيعمل على المنفذ 3001
```

#### 2. تشغيل خادم الصور (FTP Image Server)
```bash
# في terminal جديد
cd frontend
node ftp-image-server.js
# سيعمل على المنفذ 3003
```

#### 3. تشغيل الواجهة الأمامية (Frontend)
```bash
# في terminal جديد
cd frontend
npm start
# سيعمل على المنفذ 3000
```

## الوصول إلى النظام

### روابط الوصول
- **الواجهة الرئيسية**: http://localhost:3000
- **API الخادم الخلفي**: http://localhost:3001
- **خادم الصور**: http://localhost:3003

### بيانات تسجيل الدخول التجريبية
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

## هيكل المشروع

```
radar_system_clean/
├── backend/                    # الخادم الخلفي
│   ├── config/                # إعدادات قاعدة البيانات
│   ├── controllers/           # منطق التحكم
│   ├── models/               # نماذج قاعدة البيانات
│   ├── routes/               # مسارات API
│   ├── seeders/              # بيانات تجريبية
│   ├── .env                  # متغيرات البيئة
│   ├── server.js             # الخادم الرئيسي
│   └── package.json          # تبعيات Node.js

├── frontend/                  # الواجهة الأمامية
│   ├── src/                  # كود React
│   ├── public/               # الملفات العامة
│   ├── ftp-image-server.js   # خادم الصور
│   └── package.json          # تبعيات React

├── start-all.sh              # سكريبت تشغيل جميع الخدمات
├── stop-all.sh               # سكريبت إيقاف جميع الخدمات
└── README.md                 # هذا الملف
```

## الميزات الرئيسية

### 1. مراقبة المخالفات في الوقت الفعلي
- عرض المخالفات حسب التاريخ والكاميرا
- صور متعددة لكل مخالفة (4-9 صور)
- تفاصيل السرعة والوقت

### 2. إدارة المستخدمين
- ثلاثة مستويات صلاحيات (مدير، مشغل، مراقب)
- نظام مصادقة آمن باستخدام JWT
- تسجيل العمليات (Audit Logs)

### 3. تحليل البيانات
- إحصائيات المخالفات
- تقارير يومية وشهرية
- رسوم بيانية تفاعلية

### 4. نظام FTP
- استقبال الصور من الكاميرات تلقائياً
- معالجة وتصنيف الصور
- نسخ احتياطي آمن

## استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### 1. خطأ في الاتصال بقاعدة البيانات
```bash
# التحقق من حالة MySQL
sudo systemctl status mysql

# إعادة تشغيل MySQL
sudo systemctl restart mysql

# التحقق من بيانات الاتصال في .env
cat backend/.env
```

#### 2. المنافذ مستخدمة
```bash
# التحقق من المنافذ المستخدمة
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :3003

# إيقاف العمليات
sudo kill -9 [PID]
```

#### 3. مشاكل الصلاحيات
```bash
# إعطاء صلاحيات للمجلدات
sudo chown -R $USER:$USER /srv/processing_inbox
sudo chown -R $USER:$USER /srv/camera_uploads
sudo chmod -R 755 /srv/processing_inbox
sudo chmod -R 755 /srv/camera_uploads
```

#### 4. مشاكل تثبيت التبعيات
```bash
# مسح cache npm
npm cache clean --force

# إعادة تثبيت التبعيات
rm -rf node_modules package-lock.json
npm install
```

## إيقاف النظام

### إيقاف تلقائي
```bash
./stop-all.sh
```

### إيقاف يدوي
```bash
# إيقاف جميع عمليات Node.js
pkill -f node

# أو إيقاف كل خدمة على حدة
# Ctrl+C في كل terminal
```

## الصيانة والنسخ الاحتياطي

### نسخ احتياطي لقاعدة البيانات
```bash
# إنشاء نسخة احتياطية
mysqldump -u root -p potassium_backend > backup_$(date +%Y%m%d_%H%M%S).sql

# استعادة النسخة الاحتياطية
mysql -u root -p potassium_backend < backup_file.sql
```

### تنظيف السجلات
```bash
# حذف السجلات القديمة
rm -f *.log

# أو الاحتفاظ بآخر 7 أيام فقط
find . -name "*.log" -mtime +7 -delete
```

## الدعم والمساعدة

### ملفات السجلات
- `backend_server.log` - سجل الخادم الخلفي
- `ftp_image_server.log` - سجل خادم الصور
- `frontend_dashboard.log` - سجل الواجهة الأمامية

### معلومات الاتصال
- **المطور**: Jarvis
- **الإصدار**: 1.0.0
- **الترخيص**: MIT

---

## ملاحظات مهمة

1. **الأمان**: تأكد من تغيير كلمات المرور الافتراضية في بيئة الإنتاج
2. **الشبكة**: تأكد من فتح المنافذ المطلوبة في الجدار الناري
3. **النسخ الاحتياطي**: قم بعمل نسخ احتياطية دورية لقاعدة البيانات
4. **المراقبة**: راقب ملفات السجلات بانتظام للتأكد من سلامة النظام

**تم إنشاء هذا الدليل في أكتوبر 2025 - نظام رادار كشف السرعة لمصنع البوتاسيوم**
