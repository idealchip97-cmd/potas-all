# Email Notification System - SETUP GUIDE 📧

## 🎯 **Overview**
Automatic email notifications are sent to `ahmedalhloul@idealchip.com` whenever new violation cases are detected with complete verdict.json files.

---

## ⚙️ **SETUP INSTRUCTIONS**

### **Step 1: Configure Email Credentials**

You need to set up email credentials as environment variables. Create a `.env` file or set them directly:

```bash
# Option 1: Create .env file
echo "EMAIL_USER=fines@idealchip.com" >> .env
echo "EMAIL_PASS=idealchip123" >> .env

# Option 2: Export directly (temporary)
export EMAIL_USER="fines@idealchip.com"
export EMAIL_PASS="idealchip123"
```

**📧 Email Setup:**
- **Sender**: `fines@idealchip.com` (sends notifications)
- **Receiver**: `ahmedalhloul@idealchip.com` (receives notifications)
- **Password**: `idealchip123` (for fines@idealchip.com account)

### **Step 2: A2 Hosting cPanel Email Setup**
1. **Login to cPanel** at your A2 Hosting account
2. **Sender Email Configuration** (`fines@idealchip.com`):
   - Email account: `fines@idealchip.com` 
   - Password: `idealchip123`
   - SMTP server: `mail.idealchip.com`
   - Port: 587 (STARTTLS) or 465 (SSL)
3. **Receiver Email** (`ahmedalhloul@idealchip.com`):
   - This email will receive all violation notifications
4. **No App Password needed** - use regular email account password

### **Step 3: A2 Hosting SMTP Configuration (Already Set)**
The system is now configured for A2 Hosting cPanel email:

```javascript
const EMAIL_CONFIG = {
  host: 'mail.idealchip.com',      // A2 Hosting SMTP server
  port: 587,                       // Standard SMTP port
  secure: false,                   // false for 587, true for 465
  auth: {
    user: process.env.EMAIL_USER,  // fines@idealchip.com (sender)
    pass: process.env.EMAIL_PASS   // idealchip123 (sender password)
  },
  tls: {
    rejectUnauthorized: false      // Allow self-signed certificates
  }
};
```

---

## 🚀 **HOW IT WORKS**

### **Automatic Detection:**
- **Checks every 30 seconds** for new violation cases
- **Scans all cameras** in `/srv/processing_inbox/`
- **Only processes cases** with complete `verdict.json` files
- **Sends notifications** only for violations (not compliant cases)
- **Prevents duplicates** by tracking processed cases

### **Email Content Includes:**
- 🚨 **Violation Alert** with severity level (Minor/Major/Severe)
- 📹 **Camera Information** (camera001, camera002, etc.)
- ⚡ **Speed Details** (detected speed vs limit)
- 📅 **Date & Timestamp** of violation
- 🆔 **Case ID** and source IP
- 📸 **Photo Count** and folder location
- 📎 **ALL PHOTOS ATTACHED** - Direct access to evidence photos
- 📋 **Next Steps** for processing

### **Severity Levels:**
- **Minor**: 1-9 km/h over limit
- **Major**: 10-19 km/h over limit  
- **Severe**: 20+ km/h over limit

---

## 🧪 **TESTING THE SYSTEM**

### **Test 1: Check Email Service Status**
```bash
curl http://localhost:3003/api/notifications/status
```

**Expected Response:**
```json
{
  "success": true,
  "emailService": {
    "enabled": true,
    "adminEmail": "ahmedalhloul@idealchip.com",
    "smtpHost": "mail.idealchip.com"
  },
  "processedCases": 0,
  "lastCheck": "2025-10-06T10:00:00.000Z"
}
```

### **Test 2: Send Test Email**
```bash
curl -X POST http://localhost:3003/api/notifications/test
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "messageId": "...",
  "recipient": "ahmedalhloul@idealchip.com"
}
```

### **Test 3: Manual Violation Check**
```bash
curl -X POST http://localhost:3003/api/notifications/check
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Violation check completed",
  "processedCases": 2
}
```

---

## 📧 **EMAIL SAMPLE**

When a violation is detected, the admin receives an email like this:

**Subject:** `🚨 NEW VIOLATION DETECTED - CAMERA002 - Major (38 km/h)`

**Content:**
- Beautiful HTML email with violation details
- Speed alert: "⚡ 38 km/h in 30 km/h zone"
- Camera: CAMERA002
- Case ID: case018
- Photos: 5 photos captured **+ ALL PHOTOS ATTACHED**
- Timestamp: October 5, 2025 at 7:46:33 PM
- Next steps for processing

**📎 Photo Attachments:**
- All violation photos are automatically attached to the email
- Photos can be viewed directly from email without accessing the system
- File names and sizes are listed in the email content
- Maximum 25MB total attachment size (handles ~50-100 photos typically)

---

## 🔧 **API ENDPOINTS**

### **GET /api/notifications/status**
Check email service status and configuration

### **POST /api/notifications/test**
Send a test email to verify email service is working

### **POST /api/notifications/check**
Manually trigger violation check (normally runs automatically)

---

## 🚨 **TROUBLESHOOTING**

### **Issue: Email service not enabled**
```bash
# Check status
curl http://localhost:3003/api/notifications/status

# Look for "enabled": false
```
**Solution:** Set EMAIL_USER and EMAIL_PASS environment variables

### **Issue: Authentication failed**
**Solution:** 
1. Use cPanel email account password (not cPanel login password)
2. Verify the email account exists in cPanel
3. Check EMAIL_USER=ahmedalhloul@idealchip.com and EMAIL_PASS are correct
4. Ensure SMTP server mail.idealchip.com is accessible

### **Issue: No emails received**
**Solution:**
1. Check spam folder
2. Verify admin email: `ahmedalhloul@idealchip.com`
3. Test with: `curl -X POST http://localhost:3003/api/notifications/test`

### **Issue: Duplicate notifications**
**Solution:** System automatically prevents duplicates by tracking processed cases

---

## 📊 **MONITORING**

### **Server Logs:**
```bash
# Watch for email notifications
tail -f logs/server.log | grep "📧"

# Expected log messages:
# 📧 ✅ Violation notification sent for camera002_2025-10-05_case018
# 📧 Message ID: <message-id>
```

### **Check Processed Cases:**
```bash
curl http://localhost:3003/api/notifications/status | jq '.processedCases'
```

---

## 🎯 **PRODUCTION DEPLOYMENT**

### **Environment Variables:**
```bash
# Set in production environment
EMAIL_USER=your-production-email@company.com
EMAIL_PASS=your-app-password
NODE_ENV=production
```

### **Email Provider Options:**
- **A2 Hosting (Current)**: mail.idealchip.com:587
- **Gmail**: smtp.gmail.com:587
- **Outlook**: smtp-mail.outlook.com:587  
- **Custom SMTP**: Update EMAIL_CONFIG in local-image-server.js

### **Security Best Practices:**
- ✅ Use cPanel email account passwords (stored securely)
- ✅ Store credentials in environment variables
- ✅ Use secure SMTP connections (STARTTLS)
- ✅ Monitor email delivery logs
- ✅ Verify SMTP server accessibility

---

## ✅ **VERIFICATION CHECKLIST**

- [ ] **nodemailer installed**: `npm list nodemailer`
- [ ] **Environment variables set**: EMAIL_USER and EMAIL_PASS
- [ ] **cPanel email account configured** (ahmedalhloul@idealchip.com)
- [ ] **Test email successful**: `POST /api/notifications/test`
- [ ] **Status shows enabled**: `GET /api/notifications/status`
- [ ] **Server logs show email service**: "📧 Email service initialized"
- [ ] **Automatic checking active**: Every 30 seconds
- [ ] **Admin email correct**: ahmedalhloul@idealchip.com
- [ ] **Photo attachments working**: Check server logs for "📎 Attaching X photos"

---

## 🚀 **READY FOR PRODUCTION**

Once configured, the system will:
- ✅ **Automatically detect** new violation cases
- ✅ **Send instant notifications** to admin email
- ✅ **Include all case details** (camera, speed, photos, timestamp)
- ✅ **Attach ALL violation photos** directly to email
- ✅ **Prevent duplicate emails** for same case
- ✅ **Work with any number of cameras** (2 to 12+)
- ✅ **Provide beautiful HTML emails** with all violation info
- ✅ **Smart attachment handling** (25MB limit, size optimization)

**The email notification system is now ready to alert the admin of every new speed violation!** 🎉
