# 📦 Client Deployment Guide - Attendance System

## Overview

This guide explains how to package and deploy the Attendance System for clients who need a simple "double-click and run" solution.

---

## 🎯 Deployment Options

### **Option 1: Electron Desktop App (RECOMMENDED)**

Package as a standalone Windows/Mac application.

**Client Experience:**
1. Receives `AttendanceSystem_Setup.exe` (one file)
2. Double-clicks to install
3. Desktop shortcut created
4. Double-click icon → App runs
5. No technical knowledge needed

**Setup Steps:**

1. **Install Electron dependencies:**
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. **Create `electron.js` in project root:**
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const path = require('path');
   const { spawn } = require('child_process');

   let mainWindow;
   let serverProcess;

   function createWindow() {
       mainWindow = new BrowserWindow({
           width: 1200,
           height: 800,
           webPreferences: {
               nodeIntegration: false,
               contextIsolation: true
           },
           icon: path.join(__dirname, 'icon.png')
       });

       // Start backend server
       serverProcess = spawn('node', ['server.js'], {
           cwd: __dirname
       });

       // Wait for server, then load frontend
       setTimeout(() => {
           mainWindow.loadURL('http://localhost:3001');
       }, 3000);
   }

   app.whenReady().then(createWindow);

   app.on('window-all-closed', () => {
       if (serverProcess) serverProcess.kill();
       app.quit();
   });
   ```

3. **Update `package.json`:**
   ```json
   {
     "main": "electron.js",
     "scripts": {
       "electron": "electron .",
       "electron-build": "electron-builder",
       "pack": "electron-builder --dir",
       "dist": "electron-builder"
     },
     "build": {
       "appId": "com.soochakbharat.attendance",
       "productName": "Attendance System",
       "files": [
         "dist/**/*",
         "server.js",
         "emailService.js",
         "visitor_management.db",
         "node_modules/**/*",
         "public/**/*"
       ],
       "win": {
         "target": "nsis",
         "icon": "icon.ico"
       },
       "nsis": {
         "oneClick": false,
         "allowToChangeInstallationDirectory": true
       }
     }
   }
   ```

4. **Build for production:**
   ```bash
   npm run build        # Build frontend
   npm run dist         # Create installer
   ```

5. **Output:**
   - `dist/Attendance System Setup.exe` (Windows installer)
   - Size: ~150-200MB
   - Includes everything: frontend, backend, database

---

### **Option 2: Portable Executable (Simpler)**

Create a portable version using `pkg`.

**Steps:**

1. **Install pkg:**
   ```bash
   npm install -g pkg
   ```

2. **Build frontend:**
   ```bash
   npm run build
   ```

3. **Package backend:**
   ```bash
   pkg server.js --targets node18-win-x64 --output AttendanceServer.exe
   ```

4. **Create batch file `start.bat`:**
   ```batch
   @echo off
   start AttendanceServer.exe
   timeout /t 3
   start http://localhost:3001
   ```

5. **Distribute:**
   - Folder with: `AttendanceServer.exe`, `start.bat`, `dist/`, `visitor_management.db`
   - Client double-clicks `start.bat`
   - Browser opens automatically

---

### **Option 3: Docker Container (For Tech-Savvy Clients)**

**Create `docker-compose.yml`:**
```yaml
version: '3.8'
services:
  attendance-system:
    build: .
    ports:
      - "3001:3001"
      - "5173:5173"
    volumes:
      - ./visitor_management.db:/app/visitor_management.db
    restart: always
```

**Client usage:**
```bash
docker-compose up
```

---

## 🚀 Recommended: Electron Desktop App

### **Why Electron?**

✅ **Professional** - Looks like a real desktop app
✅ **Easy** - Client just double-clicks
✅ **Bundled** - Everything included (no dependencies)
✅ **Auto-start** - Backend starts automatically
✅ **Cross-platform** - Works on Windows, Mac, Linux
✅ **Offline** - Works without internet
✅ **Updates** - Can add auto-update feature

### **Build Process:**

```bash
# 1. Install dependencies
npm install

# 2. Build frontend
npm run build

# 3. Create Electron package
npm run dist

# 4. Find installer in dist/ folder
# dist/Attendance System Setup.exe
```

### **What Client Gets:**

```
AttendanceSystem_Setup.exe (150MB)
```

**Installation:**
1. Double-click installer
2. Choose install location
3. Click Install
4. Desktop shortcut created

**Usage:**
1. Double-click "Attendance System" icon
2. App window opens
3. System ready to use!

---

## 📱 Kiosk Mode Deployment

For dedicated kiosk devices at office entrance:

### **Hardware:**
- Tablet (10"+) or Desktop with webcam
- Wall mount or stand
- Power supply

### **Software Setup:**

1. **Install app** (using Electron installer)

2. **Create kiosk shortcut:**
   - Target: `"C:\Program Files\Attendance System\Attendance System.exe" --kiosk-url=http://localhost:3001/#/kiosk`

3. **Auto-start on boot:**
   - Place shortcut in: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp`

4. **Browser kiosk mode:**
   - Or use Chrome: `chrome.exe --kiosk --app=http://localhost:3001/#/kiosk`

---

## 🔧 Configuration for Clients

### **Email Setup:**

Client needs to configure `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=their-email@company.com
EMAIL_PASS=their-app-password
EMAIL_FROM=attendance@company.com
```

**For Electron app**, include a settings page in the app to configure this.

---

## 📊 Database

### **Included:**
- SQLite database (`visitor_management.db`)
- No external database server needed
- Portable and lightweight

### **Backup:**
- Automatic daily backups
- Stored in `backups/` folder
- Client can copy database file for backup

---

## 🎨 Branding

### **Customize for Client:**

1. **Logo:** Replace `public/logo.png`
2. **Company Name:** Update in `index.html`
3. **Colors:** Modify CSS variables
4. **Icon:** Replace `icon.ico` for Windows

---

## 📝 Client Documentation

### **Include with delivery:**

1. **Installation Guide** (PDF)
2. **User Manual** (PDF)
3. **Admin Guide** (PDF)
4. **Troubleshooting** (PDF)
5. **Video Tutorial** (optional)

---

## 🔐 Security

### **For Production:**

1. **Change default passwords**
2. **Configure email credentials**
3. **Set up HTTPS** (if using web deployment)
4. **Regular backups**
5. **Update face recognition models**

---

## 💰 Pricing Model

### **License Options:**

1. **One-time Purchase:**
   - Client buys software once
   - Includes 1 year support
   - Updates for 1 year

2. **Subscription:**
   - Monthly/Yearly fee
   - Includes updates
   - Includes support

3. **Per-Device:**
   - Price per kiosk device
   - Unlimited employees

---

## 🎯 Summary

### **Best for Most Clients:**

**Electron Desktop App** because:
- ✅ Professional installer
- ✅ No technical knowledge needed
- ✅ Works offline
- ✅ Easy to use
- ✅ Auto-starts backend
- ✅ Cross-platform

### **Delivery:**

```
AttendanceSystem_v1.0_Setup.exe (150MB)
+ Installation_Guide.pdf
+ User_Manual.pdf
```

Client receives 2 files, installs, and starts using!

---

## 🚀 Next Steps

1. **Build Electron app** (when npm memory issue resolved)
2. **Test on clean Windows machine**
3. **Create documentation**
4. **Package for delivery**
5. **Provide to client**

**Ready to deploy!** 🎉
