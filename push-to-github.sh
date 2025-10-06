#!/bin/bash

# سكريبت رفع المشروع إلى GitHub
# Script to push project to GitHub

echo "🚀 بدء رفع المشروع إلى GitHub..."
echo "🚀 Starting GitHub push process..."
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

# التحقق من وجود Git
if ! command -v git &> /dev/null; then
    print_error "Git غير مثبت. يرجى تثبيت Git أولاً"
    exit 1
fi

# الحصول على المجلد الحالي
CURRENT_DIR=$(pwd)
PROJECT_DIR="/home/rnd2/Desktop/radar_system_clean"
TEMP_DIR="/tmp/potassium-frontend-$(date +%Y%m%d_%H%M%S)"

print_info "المجلد الحالي: $CURRENT_DIR"
print_info "مجلد المشروع: $PROJECT_DIR"
print_info "المجلد المؤقت: $TEMP_DIR"

# التأكد من وجود مجلد المشروع
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "مجلد المشروع غير موجود: $PROJECT_DIR"
    exit 1
fi

# الخطوة 1: استنساخ المستودع الحالي
print_info "الخطوة 1: استنساخ المستودع من GitHub..."
git clone https://github.com/basharagb/potassium-frontend.git "$TEMP_DIR"

if [ $? -ne 0 ]; then
    print_error "فشل في استنساخ المستودع"
    exit 1
fi

print_status "تم استنساخ المستودع بنجاح"

# الانتقال إلى المجلد المؤقت
cd "$TEMP_DIR"

# الخطوة 2: حذف جميع الملفات الموجودة (عدا .git)
print_info "الخطوة 2: حذف الملفات القديمة..."

# حذف جميع الملفات والمجلدات عدا .git
find . -maxdepth 1 ! -name '.git' ! -name '.' ! -name '..' -exec rm -rf {} + 2>/dev/null

# حذف الملفات المخفية
rm -f .env* .gitignore .dockerignore .eslintrc* .prettierrc* 2>/dev/null

print_status "تم حذف الملفات القديمة"

# الخطوة 3: نسخ جميع الملفات الجديدة
print_info "الخطوة 3: نسخ الملفات الجديدة..."

# نسخ جميع الملفات
cp -r "$PROJECT_DIR"/* . 2>/dev/null
cp -r "$PROJECT_DIR"/.* . 2>/dev/null || true

# التأكد من نسخ الملفات المهمة
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" . 2>/dev/null
fi

if [ -f "$PROJECT_DIR/.gitignore" ]; then
    cp "$PROJECT_DIR/.gitignore" . 2>/dev/null
fi

print_status "تم نسخ الملفات الجديدة"

# الخطوة 4: إنشاء .gitignore إذا لم يكن موجوداً
if [ ! -f ".gitignore" ]; then
    print_info "إنشاء ملف .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
/frontend/build
/backend/dist

# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.sqlite
*.db

# Logs
*.log
logs/

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory
coverage/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Temporary files
tmp/
temp/
EOF
    print_status "تم إنشاء ملف .gitignore"
fi

# الخطوة 5: إعطاء صلاحيات التنفيذ للسكريبتات
print_info "الخطوة 5: إعطاء صلاحيات التنفيذ..."
chmod +x *.sh 2>/dev/null || true
print_status "تم إعطاء صلاحيات التنفيذ"

# الخطوة 6: إضافة جميع الملفات لـ Git
print_info "الخطوة 6: إضافة الملفات لـ Git..."
git add .

if [ $? -ne 0 ]; then
    print_error "فشل في إضافة الملفات"
    exit 1
fi

print_status "تم إضافة جميع الملفات"

# الخطوة 7: إنشاء commit
print_info "الخطوة 7: إنشاء commit..."

COMMIT_MESSAGE="🚀 تحديث شامل: نظام رادار كشف السرعة المحدث

✨ الميزات الجديدة:
- واجهة مستخدم محدثة بالكامل مع دعم اللغة العربية
- نظام مصادقة محسن مع تشفير bcrypt
- دعم كاميرات متعددة مع اكتشاف تلقائي
- نظام صور متعدد (4-9 صور لكل مخالفة)
- API محسن للانتهاكات مع endpoints جديدة
- دعم MySQL محسن مع فهرسة متقدمة
- نظام FTP محدث للاتصال بالكاميرات

📚 الوثائق الشاملة باللغة العربية:
- README.md - الدليل الشامل للمشروع
- CONFIG.md - دليل الإعدادات والتكوين التفصيلي
- DEPLOYMENT.md - دليل النشر على الخادم
- INSTALL.md - دليل التثبيت السريع
- GITHUB_OVERRIDE.md - دليل تحديث GitHub
- SUMMARY.md - ملخص المشروع
- install.sh - سكريبت التثبيت التلقائي الكامل

🔧 التحسينات التقنية:
- حل مشاكل HTTP 429 مع rate limiting محسن
- تحسين أداء قاعدة البيانات مع connection pooling
- نظام مراقبة محسن مع logging متقدم
- أمان محسن مع JWT tokens وvalidation
- دعم SSL/HTTPS مع إعدادات Nginx
- نظام نسخ احتياطي تلقائي

📱 واجهة المستخدم:
- تصميم حديث ومتجاوب مع Material-UI
- دعم كامل للغة العربية
- لوحة تحكم محسنة مع إحصائيات تفاعلية
- نظام تنبيهات محسن
- تجربة مستخدم محسنة

🗄️ قاعدة البيانات:
- هيكل محسن مع علاقات صحيحة
- بيانات تجريبية شاملة
- نسخ احتياطي تلقائي مجدول
- فهرسة محسنة للأداء
- دعم MySQL 8.0+

🚀 نظام التشغيل:
- سكريبتات تشغيل وإيقاف تلقائية
- مراقبة الخدمات التلقائية
- إعدادات systemd للإنتاج
- دعم Docker للنشر
- تكامل مع Nginx reverse proxy

📊 الإحصائيات والتقارير:
- تقارير يومية وشهرية
- رسوم بيانية تفاعلية
- تحليل الاتجاهات
- تصدير البيانات
- لوحة معلومات في الوقت الفعلي

🔐 الأمان:
- مصادقة JWT آمنة
- تشفير كلمات المرور مع bcrypt
- حماية CORS محسنة
- rate limiting متقدم
- audit logging شامل
- حماية من XSS و CSRF

Version: 2.0.0
Date: $(date +%Y-%m-%d)
Author: Jarvis & Development Team
System: Potassium Factory Radar Speed Detection"

git commit -m "$COMMIT_MESSAGE"

if [ $? -ne 0 ]; then
    print_error "فشل في إنشاء commit"
    exit 1
fi

print_status "تم إنشاء commit بنجاح"

# الخطوة 8: رفع التحديثات إلى GitHub
print_info "الخطوة 8: رفع التحديثات إلى GitHub..."

git push origin main --force

if [ $? -ne 0 ]; then
    print_error "فشل في رفع التحديثات إلى GitHub"
    print_warning "قد تحتاج لتسجيل الدخول إلى GitHub أو التحقق من الصلاحيات"
    exit 1
fi

print_status "تم رفع التحديثات بنجاح إلى GitHub"

# الخطوة 9: التنظيف
print_info "الخطوة 9: تنظيف الملفات المؤقتة..."
cd "$CURRENT_DIR"
rm -rf "$TEMP_DIR"
print_status "تم تنظيف الملفات المؤقتة"

# النتيجة النهائية
echo ""
echo "=================================================="
print_status "تم رفع المشروع بنجاح إلى GitHub! 🎉"
echo "=================================================="
echo ""

print_info "رابط المستودع:"
echo "  https://github.com/basharagb/potassium-frontend"
echo ""

print_info "الملفات المرفوعة تشمل:"
echo "  📚 الوثائق العربية الشاملة"
echo "  🔧 سكريبتات التثبيت والتشغيل"
echo "  🖥️  كود Backend محسن"
echo "  🎨 كود Frontend محدث"
echo "  🗄️  ملفات قاعدة البيانات"
echo "  ⚙️  ملفات الإعدادات"
echo ""

print_info "للتثبيت على جهاز جديد:"
echo "  git clone https://github.com/basharagb/potassium-frontend.git"
echo "  cd potassium-frontend"
echo "  chmod +x install.sh"
echo "  ./install.sh"
echo ""

print_warning "ملاحظة: تأكد من مراجعة ملف README.md للحصول على التعليمات الكاملة"
echo ""

echo "🎯 المشروع جاهز للاستخدام على GitHub!"
