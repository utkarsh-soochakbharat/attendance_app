# 🚀 Electron Build Instructions

## ✅ Setup Complete!

All Electron files are now configured. Here's how to build the installer:

---

## 📋 Prerequisites

Before building, ensure you have:
- ✅ Node.js installed
- ✅ All npm packages installed
- ✅ Icon file in `build/` folder (optional)

---

## 🎯 Build Steps

### **Step 1: Build Frontend**

```bash
npm run build
```

This compiles TypeScript and builds the React app into `dist/` folder.

**Output:** `dist/` folder with compiled frontend

---

### **Step 2: Test in Electron (Development)**

```bash
npm run electron:dev
```

This will:
1. Start Vite dev server
2. Start backend server
3. Open Electron window

**Use this to test before building the installer!**

---

### **Step 3: Build Installer**

```bash
npm run electron:dist
```

This will:
1. Build frontend (`npm run build`)
2. Package everything with Electron Builder
3. Create Windows installer

**Output:** `release/Attendance System_Setup_1.0.0.exe`

---

## 📦 What Gets Packaged

The installer includes:
- ✅ Frontend (React app in `dist/`)
- ✅ Backend (`server.js`, `emailService.js`)
- ✅ Database (`visitor_management.db`)
- ✅ Face recognition models (`public/models/`)
- ✅ All node_modules
- ✅ Electron runtime

**Total size:** ~150-200MB

---

## 🎨 Customization (Optional)

### **Add Icon:**

1. Create/download an icon
2. Convert to `.ico` format (256x256px)
3. Save as `build/icon.ico`
4. Rebuild

**Tools for icon conversion:**
- https://convertio.co/png-ico/
- https://icoconvert.com/

### **Change App Name:**

Edit `package.json`:
```json
{
  "productName": "Your App Name",
  "build": {
    "productName": "Your App Name"
  }
}
```

---

## 🧪 Testing the Installer

### **Test on Development Machine:**

1. Build installer: `npm run electron:dist`
2. Find installer in `release/` folder
3. Double-click to install
4. Test the installed app

### **Test on Clean Machine:**

1. Copy installer to USB/cloud
2. Transfer to clean Windows machine
3. Install and test
4. Verify all features work

---

## 🚨 Common Issues & Solutions

### **Issue 1: Out of Memory**

**Error:** `Fatal process out of memory`

**Solution:**
```bash
# Increase Node memory
set NODE_OPTIONS=--max-old-space-size=4096
npm run electron:dist
```

Or build on a machine with more RAM (8GB+).

---

### **Issue 2: Icon Not Found**

**Error:** `icon.ico not found`

**Solution:**
- Create `build/` folder
- Add a placeholder `icon.ico` file
- Or remove icon from `package.json` build config

---

### **Issue 3: Database Not Included**

**Error:** Database file missing in built app

**Solution:**
- Ensure `visitor_management.db` exists in project root
- Check `package.json` build.files includes it
- Rebuild

---

### **Issue 4: Models Not Loading**

**Error:** Face recognition models not found

**Solution:**
- Ensure `public/models/` folder exists
- Check models are downloaded
- Verify `package.json` includes `public/models/**/*`

---

## 📱 Alternative: Portable Version

If Electron build fails, create a portable version:

### **Method 1: Using pkg**

```bash
# Install pkg globally
npm install -g pkg

# Build frontend
npm run build

# Package backend
pkg server.js --targets node18-win-x64 --output AttendanceServer.exe

# Create start.bat
echo @echo off > start.bat
echo start AttendanceServer.exe >> start.bat
echo timeout /t 3 >> start.bat
echo start http://localhost:3001 >> start.bat
```

**Distribute:**
- Folder with: `AttendanceServer.exe`, `start.bat`, `dist/`, `visitor_management.db`

---

### **Method 2: Node.js Required**

Create `start.bat`:
```batch
@echo off
echo Starting Attendance System...
start /B node server.js
timeout /t 3
start http://localhost:3001
```

**Distribute:**
- Entire project folder
- Client needs Node.js installed
- Double-click `start.bat`

---

## 🎯 Recommended Build Process

### **For Production Release:**

```bash
# 1. Clean previous builds
rmdir /s /q release
rmdir /s /q dist

# 2. Install dependencies (if needed)
npm install

# 3. Build frontend
npm run build

# 4. Test in Electron
npm run electron:dev
# (Test all features)

# 5. Build installer
npm run electron:dist

# 6. Test installer
# Install on clean machine and test

# 7. Distribute
# Upload to cloud/USB
# Send to client
```

---

## 📊 Build Output

After successful build, you'll find:

```
release/
├── Attendance System_Setup_1.0.0.exe  (Installer - 150MB)
├── win-unpacked/                       (Unpacked app folder)
└── builder-debug.yml                   (Build log)
```

**Distribute:** `Attendance System_Setup_1.0.0.exe`

---

## 🎉 Client Installation

Client receives: `Attendance System_Setup_1.0.0.exe`

**Installation:**
1. Double-click installer
2. Choose install location
3. Click Install
4. Desktop shortcut created

**Usage:**
1. Double-click "Attendance System" icon
2. App window opens
3. Backend starts automatically
4. System ready!

---

## 🔐 Security Notes

### **Before Distribution:**

1. **Remove sensitive data:**
   - Clear test employee data
   - Remove development `.env` values
   - Clean database of test records

2. **Configure for client:**
   - Provide blank `.env.example`
   - Include setup instructions
   - Document email configuration

3. **Test thoroughly:**
   - All features working
   - Face recognition accurate
   - Email sending works
   - Database operations correct

---

## 📝 Next Steps After Build

1. ✅ Test installer on clean machine
2. ✅ Create user documentation
3. ✅ Prepare setup guide for client
4. ✅ Package with documentation
5. ✅ Deliver to client

---

## 🚀 Quick Commands Reference

```bash
# Development
npm run dev              # Start frontend dev server
npm run server           # Start backend server
npm run dev:all          # Start both
npm run electron:dev     # Test in Electron

# Production
npm run build            # Build frontend
npm run electron:dist    # Build installer
npm run pack             # Build without installer (faster)

# Clean
rmdir /s /q dist release node_modules
npm install
```

---

## ✅ You're Ready!

Everything is configured. Just run:

```bash
npm run electron:dist
```

And you'll get: `Attendance System_Setup_1.0.0.exe`

**That's it!** 🎉
