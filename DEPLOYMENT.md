# دليل النشر والتوزيع - نظام رادار كشف السرعة

## نشر النظام على خادم جديد

### المرحلة الأولى: إعداد الخادم

#### 1. متطلبات الخادم
```bash
# مواصفات الخادم المُوصى بها
- CPU: 4 cores أو أكثر
- RAM: 8GB أو أكثر
- Storage: 100GB SSD أو أكثر
- Network: 100Mbps أو أكثر
- OS: Ubuntu 20.04 LTS أو أحدث
```

#### 2. تحديث النظام وتثبيت المتطلبات
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت الأدوات الأساسية
sudo apt install -y curl wget git unzip software-properties-common

# تثبيت Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# التحقق من التثبيت
node --version  # يجب أن يكون 18.x.x أو أحدث
npm --version   # يجب أن يكون 9.x.x أو أحدث
```

#### 3. تثبيت وإعداد MySQL
```bash
# تثبيت MySQL Server
sudo apt install mysql-server -y

# تأمين MySQL
sudo mysql_secure_installation

# إعداد MySQL للوصول عن بُعد (اختياري)
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
# غير bind-address من 127.0.0.1 إلى 0.0.0.0

# إعادة تشغيل MySQL
sudo systemctl restart mysql
sudo systemctl enable mysql
```

#### 4. إعداد جدار الحماية
```bash
# تفعيل UFW
sudo ufw enable

# فتح المنافذ المطلوبة
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 3000    # Frontend (مؤقت للتطوير)
sudo ufw allow 3001    # Backend API
sudo ufw allow 3003    # Image Server
sudo ufw allow 3306    # MySQL (للوصول المحلي فقط)

# عرض حالة الجدار
sudo ufw status
```

### المرحلة الثانية: نشر التطبيق

#### 1. إنشاء مستخدم للتطبيق
```bash
# إنشاء مستخدم جديد
sudo adduser radarapp
sudo usermod -aG sudo radarapp

# التبديل للمستخدم الجديد
sudo su - radarapp
```

#### 2. استنساخ المشروع
```bash
# الانتقال إلى مجلد المستخدم
cd /home/radarapp

# استنساخ المشروع من GitHub
git clone https://github.com/basharagb/potassium-frontend.git radar-system
cd radar-system

# أو رفع الملفات يدوياً باستخدام SCP
# scp -r /path/to/local/project user@server:/home/radarapp/radar-system
```

#### 3. إعداد قاعدة البيانات
```bash
# تسجيل الدخول إلى MySQL
sudo mysql -u root -p

# إنشاء قاعدة البيانات والمستخدم
CREATE DATABASE potassium_backend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'radarapp'@'localhost' IDENTIFIED BY 'SecurePassword2024';
GRANT ALL PRIVILEGES ON potassium_backend.* TO 'radarapp'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# استيراد هيكل قاعدة البيانات
mysql -u radarapp -p potassium_backend < backend/potassium_backend.sql
```

#### 4. إعداد متغيرات البيئة
```bash
# نسخ ملف البيئة وتعديله
cd /home/radarapp/radar-system/backend
cp .env.example .env
nano .env

# تحديث الإعدادات للخادم الجديد
DB_HOST=localhost
DB_PORT=3306
DB_NAME=potassium_backend
DB_USER=radarapp
DB_PASSWORD=SecurePassword2024

JWT_SECRET=your_very_secure_jwt_secret_key_2024

PORT=3001
NODE_ENV=production

# إعدادات FTP (حسب الكاميرات المتاحة)
FTP_HOST=192.168.1.100
FTP_PORT=21
FTP_USER=camera001
FTP_PASSWORD=YourCameraPassword

PROCESSING_INBOX=/srv/processing_inbox
FTP_DOWNLOAD_DIR=/srv/camera_uploads
```

#### 5. إنشاء المجلدات المطلوبة
```bash
# إنشاء مجلدات النظام
sudo mkdir -p /srv/processing_inbox
sudo mkdir -p /srv/camera_uploads
sudo mkdir -p /srv/backups
sudo mkdir -p /var/log/radar-system

# تعيين الصلاحيات
sudo chown -R radarapp:radarapp /srv/processing_inbox
sudo chown -R radarapp:radarapp /srv/camera_uploads
sudo chown -R radarapp:radarapp /srv/backups
sudo chown -R radarapp:radarapp /var/log/radar-system

# تعيين الصلاحيات المناسبة
sudo chmod -R 755 /srv/processing_inbox
sudo chmod -R 755 /srv/camera_uploads
sudo chmod -R 755 /srv/backups
```

#### 6. تثبيت التبعيات وبناء التطبيق
```bash
# تثبيت تبعيات Backend
cd /home/radarapp/radar-system/backend
npm install --production

# تشغيل البذور (إنشاء بيانات تجريبية)
npm run seed

# تثبيت تبعيات Frontend
cd /home/radarapp/radar-system/frontend
npm install

# بناء Frontend للإنتاج
npm run build
```

### المرحلة الثالثة: إعداد خدمات النظام

#### 1. إنشاء خدمة Backend
```bash
# إنشاء ملف الخدمة
sudo nano /etc/systemd/system/radar-backend.service

# محتوى الملف:
[Unit]
Description=Radar System Backend API
After=network.target mysql.service

[Service]
Type=simple
User=radarapp
WorkingDirectory=/home/radarapp/radar-system/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=radar-backend

[Install]
WantedBy=multi-user.target
```

#### 2. إنشاء خدمة Image Server
```bash
# إنشاء ملف الخدمة
sudo nano /etc/systemd/system/radar-imageserver.service

# محتوى الملف:
[Unit]
Description=Radar System Image Server
After=network.target

[Service]
Type=simple
User=radarapp
WorkingDirectory=/home/radarapp/radar-system/frontend
ExecStart=/usr/bin/node ftp-image-server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=radar-imageserver

[Install]
WantedBy=multi-user.target
```

#### 3. تفعيل وتشغيل الخدمات
```bash
# إعادة تحميل systemd
sudo systemctl daemon-reload

# تفعيل الخدمات للتشغيل التلقائي
sudo systemctl enable radar-backend
sudo systemctl enable radar-imageserver

# تشغيل الخدمات
sudo systemctl start radar-backend
sudo systemctl start radar-imageserver

# التحقق من حالة الخدمات
sudo systemctl status radar-backend
sudo systemctl status radar-imageserver
```

### المرحلة الرابعة: إعداد Nginx

#### 1. تثبيت Nginx
```bash
# تثبيت Nginx
sudo apt install nginx -y

# تفعيل Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### 2. إعداد Nginx للتطبيق
```bash
# إنشاء ملف إعداد الموقع
sudo nano /etc/nginx/sites-available/radar-system

# محتوى الملف:
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # غير هذا إلى نطاقك

    # Frontend - ملفات React المبنية
    location / {
        root /home/radarapp/radar-system/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # إعدادات التخزين المؤقت للملفات الثابتة
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # زيادة timeout للطلبات الطويلة
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Image Server
    location /images/ {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # إعدادات التخزين المؤقت للصور
        proxy_cache_valid 200 1h;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    }

    # إعدادات الأمان
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # إعدادات الضغط
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # حد حجم الملفات المرفوعة
    client_max_body_size 50M;
}
```

#### 3. تفعيل الموقع
```bash
# إنشاء رابط رمزي لتفعيل الموقع
sudo ln -s /etc/nginx/sites-available/radar-system /etc/nginx/sites-enabled/

# حذف الموقع الافتراضي
sudo rm /etc/nginx/sites-enabled/default

# اختبار إعدادات Nginx
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx
```

### المرحلة الخامسة: إعداد SSL (HTTPS)

#### 1. تثبيت Certbot
```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx -y

# الحصول على شهادة SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# إعداد التجديد التلقائي
sudo crontab -e
# إضافة هذا السطر:
0 12 * * * /usr/bin/certbot renew --quiet
```

#### 2. اختبار SSL
```bash
# اختبار تجديد الشهادة
sudo certbot renew --dry-run

# التحقق من حالة الشهادة
sudo certbot certificates
```

### المرحلة السادسة: إعداد المراقبة والنسخ الاحتياطي

#### 1. إعداد النسخ الاحتياطي التلقائي
```bash
# إنشاء سكريبت النسخ الاحتياطي
sudo nano /home/radarapp/backup-system.sh

#!/bin/bash
# سكريبت النسخ الاحتياطي الشامل

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/srv/backups"
DB_NAME="potassium_backend"
DB_USER="radarapp"
DB_PASS="SecurePassword2024"

# إنشاء مجلد النسخة الاحتياطية
mkdir -p $BACKUP_DIR/$DATE

# نسخ احتياطي لقاعدة البيانات
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/$DATE/database.sql

# نسخ احتياطي للملفات
tar -czf $BACKUP_DIR/$DATE/processing_inbox.tar.gz /srv/processing_inbox
tar -czf $BACKUP_DIR/$DATE/camera_uploads.tar.gz /srv/camera_uploads
tar -czf $BACKUP_DIR/$DATE/application.tar.gz /home/radarapp/radar-system

# ضغط النسخة الاحتياطية
cd $BACKUP_DIR
tar -czf backup_$DATE.tar.gz $DATE/
rm -rf $DATE/

# حذف النسخ القديمة (أكثر من 30 يوم)
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +30 -delete

echo "تم إنشاء النسخة الاحتياطية: backup_$DATE.tar.gz"

# إعطاء صلاحيات التنفيذ
chmod +x /home/radarapp/backup-system.sh

# إضافة مهمة cron للنسخ الاحتياطي اليومي
crontab -e
# إضافة هذا السطر:
0 2 * * * /home/radarapp/backup-system.sh >> /var/log/radar-system/backup.log 2>&1
```

#### 2. إعداد مراقبة النظام
```bash
# إنشاء سكريبت مراقبة الخدمات
sudo nano /home/radarapp/monitor-services.sh

#!/bin/bash
# سكريبت مراقبة الخدمات

SERVICES=("radar-backend" "radar-imageserver" "nginx" "mysql")
LOG_FILE="/var/log/radar-system/monitor.log"

for service in "${SERVICES[@]}"; do
    if ! systemctl is-active --quiet $service; then
        echo "$(date): تحذير - الخدمة $service متوقفة" >> $LOG_FILE
        # إعادة تشغيل الخدمة
        sudo systemctl restart $service
        echo "$(date): تم إعادة تشغيل الخدمة $service" >> $LOG_FILE
    fi
done

# إعطاء صلاحيات التنفيذ
chmod +x /home/radarapp/monitor-services.sh

# إضافة مهمة cron للمراقبة كل 5 دقائق
crontab -e
# إضافة هذا السطر:
*/5 * * * * /home/radarapp/monitor-services.sh
```

### المرحلة السابعة: اختبار النشر

#### 1. اختبار الخدمات
```bash
# اختبار Backend API
curl -X GET http://localhost:3001/api/health

# اختبار Image Server
curl -X GET http://localhost:3003/api/discover/cameras

# اختبار الموقع عبر Nginx
curl -X GET http://your-domain.com/api/health
```

#### 2. اختبار قاعدة البيانات
```bash
# تسجيل الدخول إلى قاعدة البيانات
mysql -u radarapp -p potassium_backend

# اختبار الجداول
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM violations;
EXIT;
```

#### 3. اختبار تسجيل الدخول
```bash
# اختبار API تسجيل الدخول
curl -X POST http://your-domain.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@potasfactory.com","password":"admin123"}'
```

### المرحلة الثامنة: إعدادات الأمان الإضافية

#### 1. إعداد Fail2Ban
```bash
# تثبيت Fail2Ban
sudo apt install fail2ban -y

# إنشاء إعدادات مخصصة
sudo nano /etc/fail2ban/jail.local

[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

# إعادة تشغيل Fail2Ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

#### 2. إعداد تحديثات الأمان التلقائية
```bash
# تثبيت unattended-upgrades
sudo apt install unattended-upgrades -y

# تفعيل التحديثات التلقائية
sudo dpkg-reconfigure -plow unattended-upgrades

# تحرير إعدادات التحديثات
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

### المرحلة التاسعة: التحقق النهائي

#### 1. قائمة التحقق النهائية
```bash
# ✅ التحقق من الخدمات
sudo systemctl status radar-backend
sudo systemctl status radar-imageserver
sudo systemctl status nginx
sudo systemctl status mysql

# ✅ التحقق من المنافذ
sudo netstat -tlnp | grep -E ':(80|443|3001|3003|3306)'

# ✅ التحقق من السجلات
sudo journalctl -u radar-backend --since "1 hour ago"
sudo journalctl -u radar-imageserver --since "1 hour ago"

# ✅ التحقق من المجلدات
ls -la /srv/processing_inbox
ls -la /srv/camera_uploads
ls -la /srv/backups

# ✅ التحقق من قاعدة البيانات
mysql -u radarapp -p -e "USE potassium_backend; SHOW TABLES;"
```

#### 2. اختبار شامل للنظام
```bash
# اختبار الوصول للموقع
curl -I http://your-domain.com
curl -I https://your-domain.com

# اختبار API
curl -X GET https://your-domain.com/api/health

# اختبار تسجيل الدخول
curl -X POST https://your-domain.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@potasfactory.com","password":"admin123"}'
```

## إعدادات ما بعد النشر

### 1. مراقبة الأداء
```bash
# تثبيت htop لمراقبة النظام
sudo apt install htop -y

# مراقبة استخدام القرص
df -h

# مراقبة استخدام الذاكرة
free -h

# مراقبة العمليات
ps aux | grep node
```

### 2. إعداد التنبيهات
```bash
# إنشاء سكريبت التنبيهات
sudo nano /home/radarapp/alert-system.sh

#!/bin/bash
# سكريبت التنبيهات

# التحقق من استخدام القرص
DISK_USAGE=$(df / | grep -vE '^Filesystem' | awk '{print $5}' | sed 's/%//g')
if [ $DISK_USAGE -gt 80 ]; then
    echo "تحذير: استخدام القرص $DISK_USAGE%" | mail -s "تحذير النظام" admin@yourdomain.com
fi

# التحقق من استخدام الذاكرة
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "تحذير: استخدام الذاكرة $MEMORY_USAGE%" | mail -s "تحذير النظام" admin@yourdomain.com
fi
```

### 3. تحديث النظام
```bash
# إنشاء سكريبت التحديث
sudo nano /home/radarapp/update-system.sh

#!/bin/bash
# سكريبت تحديث النظام

echo "بدء تحديث النظام..."

# إيقاف الخدمات
sudo systemctl stop radar-backend
sudo systemctl stop radar-imageserver

# تحديث الكود من Git
cd /home/radarapp/radar-system
git pull origin main

# تحديث التبعيات
cd backend && npm install --production
cd ../frontend && npm install && npm run build

# إعادة تشغيل الخدمات
sudo systemctl start radar-backend
sudo systemctl start radar-imageserver

# التحقق من حالة الخدمات
sleep 5
sudo systemctl status radar-backend
sudo systemctl status radar-imageserver

echo "تم تحديث النظام بنجاح"
```

---

## ملخص النشر

### الخدمات المُشغلة
- ✅ **Backend API**: http://localhost:3001
- ✅ **Image Server**: http://localhost:3003  
- ✅ **Frontend**: https://your-domain.com
- ✅ **MySQL Database**: localhost:3306
- ✅ **Nginx Reverse Proxy**: Port 80/443

### الملفات المهمة
- `/etc/systemd/system/radar-backend.service`
- `/etc/systemd/system/radar-imageserver.service`
- `/etc/nginx/sites-available/radar-system`
- `/home/radarapp/radar-system/backend/.env`

### أوامر الإدارة
```bash
# إعادة تشغيل الخدمات
sudo systemctl restart radar-backend radar-imageserver nginx

# مراقبة السجلات
sudo journalctl -f -u radar-backend
sudo journalctl -f -u radar-imageserver

# النسخ الاحتياطي
/home/radarapp/backup-system.sh

# التحديث
/home/radarapp/update-system.sh
```

**تم إنشاء هذا الدليل لضمان نشر آمن وموثوق لنظام رادار كشف السرعة في بيئة الإنتاج.**
