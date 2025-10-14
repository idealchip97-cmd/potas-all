#!/bin/bash

# سكريبت التثبيت التلقائي لنظام رادار كشف السرعة
# Automatic Installation Script for Radar Speed Detection System

echo "🚀 بدء تثبيت نظام رادار كشف السرعة..."
echo "🚀 Starting Radar Speed Detection System Installation..."
echo "=================================================="

# ألوان للنص
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# دالة لطباعة الرسائل الملونة
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# دالة للتحقق من نجاح الأوامر
check_command() {
    if [ $? -eq 0 ]; then
        print_status "$1"
    else
        print_error "فشل في: $1"
        exit 1
    fi
}

# التحقق من صلاحيات المدير
if [[ $EUID -eq 0 ]]; then
   print_error "لا تشغل هذا السكريبت كمدير (root). استخدم مستخدم عادي مع sudo."
   exit 1
fi

print_info "التحقق من متطلبات النظام..."

# التحقق من نظام التشغيل
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_error "هذا السكريبت يعمل على Linux فقط"
    exit 1
fi

print_status "نظام التشغيل متوافق"

# الخطوة 1: تحديث النظام
print_info "الخطوة 1: تحديث النظام..."
sudo apt update && sudo apt upgrade -y
check_command "تم تحديث النظام"

# الخطوة 2: تثبيت الأدوات الأساسية
print_info "الخطوة 2: تثبيت الأدوات الأساسية..."
sudo apt install -y curl wget git unzip software-properties-common
check_command "تم تثبيت الأدوات الأساسية"

# الخطوة 3: تثبيت Node.js
print_info "الخطوة 3: تثبيت Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    check_command "تم تثبيت Node.js"
else
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_warning "إصدار Node.js قديم ($NODE_VERSION). سيتم تحديثه..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        check_command "تم تحديث Node.js"
    else
        print_status "Node.js متوفر بالإصدار المطلوب"
    fi
fi

# التحقق من إصدار Node.js
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js: $NODE_VERSION, npm: $NPM_VERSION"

# الخطوة 4: تثبيت MySQL
print_info "الخطوة 4: تثبيت MySQL..."
if ! command -v mysql &> /dev/null; then
    sudo apt install mysql-server -y
    check_command "تم تثبيت MySQL"
    
    print_warning "يرجى تشغيل الأمر التالي لتأمين MySQL:"
    print_warning "sudo mysql_secure_installation"
else
    print_status "MySQL متوفر مسبقاً"
fi

# الخطوة 5: إعداد قاعدة البيانات
print_info "الخطوة 5: إعداد قاعدة البيانات..."
print_warning "سيتم إنشاء قاعدة البيانات. قد تحتاج لإدخال كلمة مرور MySQL..."

# إنشاء ملف SQL مؤقت
cat > /tmp/setup_db.sql << EOF
CREATE DATABASE IF NOT EXISTS potassium_backend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY 'RootPass2025';
GRANT ALL PRIVILEGES ON potassium_backend.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
EOF

# تنفيذ إعداد قاعدة البيانات
sudo mysql < /tmp/setup_db.sql 2>/dev/null || {
    print_warning "فشل في إعداد قاعدة البيانات تلقائياً. سيتم المحاولة مع كلمة مرور..."
    mysql -u root -p < /tmp/setup_db.sql
}
rm /tmp/setup_db.sql
check_command "تم إعداد قاعدة البيانات"

# الخطوة 6: إنشاء المجلدات المطلوبة
print_info "الخطوة 6: إنشاء المجلدات المطلوبة..."
sudo mkdir -p /srv/processing_inbox
sudo mkdir -p /srv/camera_uploads
sudo chown -R $USER:$USER /srv/processing_inbox
sudo chown -R $USER:$USER /srv/camera_uploads
sudo chmod -R 755 /srv/processing_inbox
sudo chmod -R 755 /srv/camera_uploads
check_command "تم إنشاء المجلدات"

# الخطوة 7: إنشاء بيانات تجريبية
print_info "إنشاء بيانات تجريبية للاختبار..."
mkdir -p /srv/processing_inbox/camera001/2025-10-06/case001
mkdir -p /srv/processing_inbox/camera002/2025-10-06/case001
mkdir -p /srv/processing_inbox/camera002/2025-10-06/case002
mkdir -p /srv/processing_inbox/camera002/2025-10-06/case003

# إنشاء ملفات JSON تجريبية
cat > /srv/processing_inbox/camera002/2025-10-06/case001/violation_data.json << EOF
{
  "violation_id": "case001",
  "camera_id": "camera002",
  "detected_speed": 38,
  "speed_limit": 25,
  "violation_date": "2025-10-06",
  "violation_time": "11:50:58",
  "location": "Main Gate",
  "photos": ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg"]
}
EOF

cat > /srv/processing_inbox/camera002/2025-10-06/case002/violation_data.json << EOF
{
  "violation_id": "case002",
  "camera_id": "camera002",
  "detected_speed": 53,
  "speed_limit": 25,
  "violation_date": "2025-10-06",
  "violation_time": "14:22:15",
  "location": "Main Gate",
  "photos": ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg"]
}
EOF

print_status "تم إنشاء البيانات التجريبية"

# الخطوة 8: تثبيت تبعيات المشروع
print_info "الخطوة 8: تثبيت تبعيات المشروع..."

# التحقق من وجود المشروع
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "لم يتم العثور على مجلدات المشروع (backend/frontend)"
    print_info "تأكد من تشغيل السكريبت من داخل مجلد المشروع"
    exit 1
fi

# تثبيت تبعيات Backend
print_info "تثبيت تبعيات Backend..."
cd backend
npm install
check_command "تم تثبيت تبعيات Backend"

# تثبيت تبعيات Frontend
print_info "تثبيت تبعيات Frontend..."
cd ../frontend
npm install
check_command "تم تثبيت تبعيات Frontend"
cd ..

# الخطوة 9: إعداد قاعدة البيانات
print_info "الخطوة 9: إعداد هيكل قاعدة البيانات..."
if [ -f "backend/potassium_backend.sql" ]; then
    mysql -u root -pRootPass2025 potassium_backend < backend/potassium_backend.sql 2>/dev/null || {
        print_warning "فشل في استيراد قاعدة البيانات تلقائياً. جرب يدوياً:"
        print_info "mysql -u root -p potassium_backend < backend/potassium_backend.sql"
    }
    check_command "تم إعداد هيكل قاعدة البيانات"
else
    print_warning "لم يتم العثور على ملف قاعدة البيانات"
fi

# تشغيل البذور
print_info "إنشاء البيانات التجريبية..."
cd backend
npm run seed 2>/dev/null || print_warning "فشل في تشغيل البذور - يمكن تشغيلها لاحقاً"
cd ..

# الخطوة 10: إعطاء صلاحيات التنفيذ للسكريبتات
print_info "الخطوة 10: إعداد سكريبتات التشغيل..."
chmod +x start-all.sh 2>/dev/null || print_warning "لم يتم العثور على start-all.sh"
chmod +x stop-all.sh 2>/dev/null || print_warning "لم يتم العثور على stop-all.sh"

# الخطوة 11: اختبار التثبيت
print_info "الخطوة 11: اختبار التثبيت..."

# التحقق من MySQL
if mysql -u root -pRootPass2025 -e "USE potassium_backend; SHOW TABLES;" &>/dev/null; then
    print_status "قاعدة البيانات تعمل بشكل صحيح"
else
    print_warning "قد تحتاج لإعداد قاعدة البيانات يدوياً"
fi

# التحقق من المجلدات
if [ -d "/srv/processing_inbox" ] && [ -d "/srv/camera_uploads" ]; then
    print_status "المجلدات المطلوبة متوفرة"
else
    print_error "المجلدات المطلوبة غير متوفرة"
fi

# الانتهاء
echo ""
echo "=================================================="
print_status "تم تثبيت نظام رادار كشف السرعة بنجاح! 🎉"
echo "=================================================="
echo ""

print_info "لتشغيل النظام:"
echo "  ./start-all.sh"
echo ""

print_info "روابط الوصول:"
echo "  • الواجهة الرئيسية: http://localhost:3000"
echo "  • API الخادم الخلفي: http://localhost:3001"
echo "  • خادم الصور: http://localhost:3003"
echo ""

print_info "بيانات تسجيل الدخول التجريبية:"
echo "  • المدير: admin@potasfactory.com / admin123"
echo "  • المشغل: operator@potasfactory.com / operator123"
echo "  • المراقب: viewer@potasfactory.com / viewer123"
echo ""

print_info "لإيقاف النظام:"
echo "  ./stop-all.sh"
echo ""

print_info "للحصول على المساعدة، راجع:"
echo "  • README.md - الدليل الشامل"
echo "  • CONFIG.md - دليل الإعدادات"
echo "  • DEPLOYMENT.md - دليل النشر"
echo ""

print_warning "ملاحظة: إذا واجهت مشاكل في قاعدة البيانات، قم بتشغيل:"
echo "  sudo mysql_secure_installation"
echo "  mysql -u root -p potassium_backend < backend/potassium_backend.sql"
echo ""

echo "🎯 التثبيت مكتمل! يمكنك الآن تشغيل النظام."
