# دليل الإعدادات والتكوين - نظام رادار كشف السرعة

## ملفات الإعدادات الرئيسية

### 1. إعدادات الخادم الخلفي (.env)

#### الموقع: `backend/.env`

```bash
# إعدادات قاعدة البيانات - MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=potassium_backend
DB_USER=root
DB_PASSWORD=RootPass2025

# إعدادات JWT للمصادقة
JWT_SECRET=potassium_radar_system_secret_key_2024

# إعدادات الخادم
PORT=3001
NODE_ENV=development

# إعدادات FTP للكاميرات
FTP_HOST=192.186.1.55
FTP_PORT=21
FTP_USER=camera001
FTP_PASSWORD=RadarCamera01
FTP_DOWNLOAD_DIR=/srv/camera_uploads

# إعدادات الكاميرا
CAMERA_ID=camera001
RADAR_CAMERA_ID=RadarCamera001

# إعدادات OpenAI (اختيارية)
# OPENAI_API_KEY=your_openai_api_key_here

# مجلد معالجة البيانات
PROCESSING_INBOX=/srv/processing_inbox
```

### 2. إعدادات قاعدة البيانات

#### الموقع: `backend/config/database.js`

```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'potassium_backend',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,        // الحد الأقصى للاتصالات
      min: 0,         // الحد الأدنى للاتصالات
      acquire: 30000, // وقت انتظار الاتصال (30 ثانية)
      idle: 10000,    // وقت إغلاق الاتصال الخامل (10 ثواني)
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    timezone: '+03:00', // التوقيت المحلي
  }
);
```

### 3. إعدادات FTP

#### الموقع: `frontend/ftp-image-server.js`

```javascript
// إعدادات FTP للاتصال بالكاميرات
const FTP_CONFIG = {
  host: '192.186.1.55',    // عنوان IP للكاميرا
  port: 21,                // منفذ FTP
  user: 'camera001',       // اسم المستخدم
  password: 'RadarCamera01', // كلمة المرور
  secure: false            // استخدام FTP عادي (ليس FTPS)
};
```

## إعدادات المنافذ (Ports)

### المنافذ المستخدمة في النظام

| الخدمة | المنفذ | الوصف |
|--------|-------|-------|
| Backend API | 3001 | خادم API الرئيسي |
| Frontend React | 3000 | واجهة المستخدم |
| FTP Image Server | 3003 | خادم الصور والملفات |
| MySQL Database | 3306 | قاعدة البيانات |
| FTP Camera | 21 | اتصال FTP مع الكاميرات |

### تغيير المنافذ

#### تغيير منفذ Backend
```bash
# في ملف backend/.env
PORT=3001  # غير هذا الرقم

# في ملف backend/server.js
const PORT = process.env.PORT || 3001;
```

#### تغيير منفذ Frontend
```bash
# في ملف frontend/package.json
"scripts": {
  "start": "PORT=3000 react-scripts start"
}

# أو استخدم متغير البيئة
export PORT=3000
npm start
```

#### تغيير منفذ FTP Image Server
```javascript
// في ملف frontend/ftp-image-server.js
const PORT = 3003; // غير هذا الرقم
```

## إعدادات قاعدة البيانات

### إنشاء قاعدة البيانات

```sql
-- إنشاء قاعدة البيانات
CREATE DATABASE potassium_backend 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- إنشاء مستخدم جديد
CREATE USER 'radar_user'@'localhost' IDENTIFIED BY 'SecurePassword123';

-- منح الصلاحيات
GRANT ALL PRIVILEGES ON potassium_backend.* TO 'radar_user'@'localhost';
FLUSH PRIVILEGES;
```

### إعدادات الأمان لقاعدة البيانات

```sql
-- تغيير كلمة مرور root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewStrongPassword';

-- إنشاء مستخدم للقراءة فقط
CREATE USER 'radar_readonly'@'localhost' IDENTIFIED BY 'ReadOnlyPass';
GRANT SELECT ON potassium_backend.* TO 'radar_readonly'@'localhost';

-- إنشاء مستخدم للنسخ الاحتياطي
CREATE USER 'radar_backup'@'localhost' IDENTIFIED BY 'BackupPass';
GRANT SELECT, LOCK TABLES ON potassium_backend.* TO 'radar_backup'@'localhost';
```

## إعدادات الكاميرات

### إضافة كاميرا جديدة

#### 1. تحديث إعدادات FTP
```bash
# في ملف backend/.env
FTP_HOST=192.186.1.56      # IP الكاميرا الجديدة
FTP_USER=camera002         # اسم مستخدم جديد
FTP_PASSWORD=RadarCamera02 # كلمة مرور جديدة
CAMERA_ID=camera002        # معرف الكاميرا
```

#### 2. إنشاء مجلدات الكاميرا
```bash
# إنشاء مجلد للكاميرا الجديدة
sudo mkdir -p /srv/processing_inbox/camera002
sudo mkdir -p /srv/camera_uploads/camera002
sudo chown -R $USER:$USER /srv/processing_inbox/camera002
sudo chown -R $USER:$USER /srv/camera_uploads/camera002
```

#### 3. تحديث قاعدة البيانات
```sql
-- إضافة الكاميرا الجديدة في جدول الكاميرات
INSERT INTO cameras (camera_id, name, location, ip_address, status) 
VALUES ('camera002', 'كاميرا البوابة الثانية', 'المدخل الشرقي', '192.186.1.56', 'active');
```

### إعدادات متعددة الكاميرات

```javascript
// في ملف frontend/ftp-image-server.js
const CAMERA_CONFIGS = {
  camera001: {
    host: '192.186.1.55',
    port: 21,
    user: 'camera001',
    password: 'RadarCamera01'
  },
  camera002: {
    host: '192.186.1.56',
    port: 21,
    user: 'camera002',
    password: 'RadarCamera02'
  },
  camera003: {
    host: '192.186.1.57',
    port: 21,
    user: 'camera003',
    password: 'RadarCamera03'
  }
};
```

## إعدادات الأمان

### تشفير كلمات المرور

```javascript
// في ملف backend/controllers/authController.js
const bcrypt = require('bcryptjs');

// تشفير كلمة المرور
const hashPassword = async (password) => {
  const saltRounds = 12; // زيادة قوة التشفير
  return await bcrypt.hash(password, saltRounds);
};
```

### إعدادات JWT

```javascript
// في ملف backend/.env
JWT_SECRET=your_very_long_and_secure_secret_key_here_2024
JWT_EXPIRES_IN=24h  # مدة صلاحية التوكن

// في كود التطبيق
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'potassium-radar-system',
      audience: 'potassium-users'
    }
  );
};
```

### إعدادات CORS

```javascript
// في ملف backend/server.js
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',    // Frontend في التطوير
    'http://localhost:3002',    // Frontend البديل
    'https://yourdomain.com'    // النطاق في الإنتاج
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## إعدادات الأداء

### تحسين قاعدة البيانات

```sql
-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_violations_date ON violations(violation_date);
CREATE INDEX idx_violations_camera ON violations(camera_id);
CREATE INDEX idx_violations_speed ON violations(detected_speed);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);
CREATE INDEX idx_users_email ON users(email);

-- إعدادات MySQL للأداء
SET GLOBAL innodb_buffer_pool_size = 1073741824;  -- 1GB
SET GLOBAL max_connections = 200;
SET GLOBAL query_cache_size = 67108864;  -- 64MB
```

### إعدادات Node.js للأداء

```javascript
// في ملف backend/server.js
const compression = require('compression');
const helmet = require('helmet');

// ضغط الاستجابات
app.use(compression());

// حماية الأمان
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// تحديد حد الطلبات
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 500, // 500 طلب كحد أقصى
  message: 'تم تجاوز الحد المسموح من الطلبات'
});
app.use('/api/', limiter);
```

## إعدادات النسخ الاحتياطي

### نسخ احتياطي تلقائي لقاعدة البيانات

```bash
#!/bin/bash
# ملف: backup-database.sh

# إعدادات النسخ الاحتياطي
DB_NAME="potassium_backend"
DB_USER="root"
DB_PASS="RootPass2025"
BACKUP_DIR="/srv/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)

# إنشاء مجلد النسخ الاحتياطي
mkdir -p $BACKUP_DIR

# إنشاء النسخة الاحتياطية
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# ضغط النسخة الاحتياطية
gzip $BACKUP_DIR/backup_$DATE.sql

# حذف النسخ القديمة (أكثر من 30 يوم)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "تم إنشاء النسخة الاحتياطية: backup_$DATE.sql.gz"
```

### جدولة النسخ الاحتياطي

```bash
# إضافة مهمة cron للنسخ الاحتياطي اليومي
crontab -e

# إضافة هذا السطر للنسخ الاحتياطي يومياً في الساعة 2:00 صباحاً
0 2 * * * /path/to/backup-database.sh >> /var/log/backup.log 2>&1
```

## إعدادات المراقبة والسجلات

### إعدادات السجلات

```javascript
// في ملف backend/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'radar-system' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### مراقبة الأداء

```javascript
// في ملف backend/middleware/monitoring.js
const responseTime = require('response-time');

// قياس وقت الاستجابة
app.use(responseTime((req, res, time) => {
  console.log(`${req.method} ${req.url} - ${time}ms`);
  
  // تسجيل الطلبات البطيئة (أكثر من 1000ms)
  if (time > 1000) {
    logger.warn(`Slow request: ${req.method} ${req.url} - ${time}ms`);
  }
}));
```

## إعدادات بيئة الإنتاج

### متغيرات البيئة للإنتاج

```bash
# ملف: backend/.env.production
NODE_ENV=production
PORT=3001

# قاعدة بيانات الإنتاج
DB_HOST=production-db-server.com
DB_PORT=3306
DB_NAME=potassium_backend_prod
DB_USER=prod_user
DB_PASSWORD=VerySecureProductionPassword2024

# JWT أكثر أماناً
JWT_SECRET=very_long_and_complex_secret_key_for_production_environment_2024
JWT_EXPIRES_IN=8h

# إعدادات FTP للإنتاج
FTP_HOST=production-camera-server.com
FTP_USER=prod_camera_user
FTP_PASSWORD=SecureCameraPassword2024

# مجلدات الإنتاج
PROCESSING_INBOX=/srv/production/processing_inbox
FTP_DOWNLOAD_DIR=/srv/production/camera_uploads
```

### إعدادات Nginx للإنتاج

```nginx
# ملف: /etc/nginx/sites-available/radar-system
server {
    listen 80;
    server_name your-domain.com;

    # إعادة توجيه HTTP إلى HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # شهادات SSL
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Image Server
    location /images/ {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

**هذا الدليل يغطي جميع الإعدادات الأساسية والمتقدمة لنظام رادار كشف السرعة. تأكد من مراجعة وتخصيص الإعدادات حسب بيئة التشغيل الخاصة بك.**
