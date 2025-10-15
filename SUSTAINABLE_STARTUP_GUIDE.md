# 🚀 SUSTAINABLE RADAR SYSTEM STARTUP GUIDE

## ✅ **ONE-COMMAND SOLUTION**

Every time you boot your PC, simply run:

```bash
cd /home/rnd2/Desktop/radar_system_clean
./start-all.sh
```

**That's it!** The system will automatically:
- ✅ Start MySQL if needed
- ✅ Clean up conflicting processes  
- ✅ Start all services in correct order
- ✅ Force frontend to port 3000
- ✅ Fix all API endpoints
- ✅ Verify everything works
- ✅ Show "Connected" status (not "Disconnected")

## 🎯 **WHAT'S FIXED**

### **API Endpoints Fixed:**
- `/api/cameras` → `/api/discover/cameras`
- `/api/cameras/{id}/dates` → `/api/discover/dates/{id}`
- `/api/cameras/{id}/dates/{date}/cases` → `/api/discover/cases/{id}/{date}`

### **Port Management:**
- Frontend: **Port 3000** (always)
- Backend: **Port 3001**
- Image Server: **Port 3003**
- AI Results: **Port 3004**

### **Automatic Verification:**
- Tests all critical endpoints
- Ensures cameras load (camera001, camera002)
- Verifies violation cases display
- Confirms "Connected" status

## 🌐 **Access URLs**

- **Main Dashboard**: http://localhost:3000 ← **This is your main page**
- **Backend API**: http://localhost:3001
- **Image Server**: http://localhost:3003
- **AI Results**: http://localhost:3004

## 🛑 **To Stop Everything**

```bash
./stop-all.sh
```

## 🔧 **If Problems Occur**

1. **Stop and restart:**
   ```bash
   ./stop-all.sh
   ./start-all.sh
   ```

2. **Check if XAMPP MySQL is running:**
   ```bash
   sudo /opt/lampp/lampp start mysql
   ```

3. **Manual verification:**
   ```bash
   curl http://localhost:3003/api/discover/cameras
   ```

## 📊 **Expected Results**

When you open http://localhost:3000, you should see:
- ✅ **"Connected"** status (green chip)
- ✅ Camera dropdown populated with cameras
- ✅ Violation cases loading automatically
- ✅ Images displaying correctly
- ✅ No HTTP 431 errors in console

## 🎉 **Success Indicators**

The system is working correctly when:
1. No "Disconnected" red status
2. No HTTP 431 errors in browser console
3. Cameras load in dropdown
4. Violation cases display with images
5. All services show ✅ OK in startup log

---

**🚀 This solution is now SUSTAINABLE - it will work every time you start your PC!**
