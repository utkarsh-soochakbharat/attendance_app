# 🔧 Troubleshooting Blank Screen

## Issue: Electron app opens but shows blank screen

### **Quick Fixes:**

### **1. Check if Server is Running**

Press **F12** in the Electron window to open Developer Tools.

Look at the **Console** tab for errors.

Common errors:
- `ERR_CONNECTION_REFUSED` - Server not started
- `Failed to load` - Wrong URL

---

### **2. Wait Longer**

The app waits 5 seconds for the server to start. If your computer is slow:

1. Close the app
2. Edit `electron.js` line 40:
   ```javascript
   }, 5000); // Change to 10000 for 10 seconds
   ```
3. Rebuild: `npm run electron:dist`

---

### **3. Check Server Manually**

1. Open Command Prompt
2. Navigate to: `release\win-unpacked\resources\app.asar.unpacked`
3. Run: `node server.js`
4. Check if server starts on port 3001
5. Open browser: `http://localhost:3001`

If server works, the issue is with Electron loading it.

---

### **4. Use Development Mode**

Instead of the built version, run in development:

```bash
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run dev

# Terminal 3: Start Electron
npm run electron:dev
```

This helps debug the issue.

---

### **5. Check Console Output**

When you run `Attendance System.exe`, check the console for:

```
Starting server from: C:\...\resources\app.asar\server.js
Working directory: C:\...\resources\app.asar
Server running on port 3001
```

If you don't see this, the server isn't starting.

---

### **6. Alternative: Run Server Separately**

**Option A: Extract server from asar**

```bash
# Install asar
npm install -g asar

# Extract
cd release\win-unpacked\resources
asar extract app.asar app-extracted

# Run server
cd app-extracted
node server.js
```

Then modify `electron.js` to point to extracted folder.

---

**Option B: Use unpacked server**

Modify `package.json` build config:

```json
"asarUnpack": [
  "server.js",
  "emailService.js",
  "visitor_management.db"
]
```

Rebuild.

---

### **7. Check Paths**

In `electron.js`, add debug logging:

```javascript
console.log('__dirname:', __dirname);
console.log('process.resourcesPath:', process.resourcesPath);
console.log('app.isPackaged:', app.isPackaged);
console.log('Server path:', serverPath);
```

Rebuild and check console output.

---

### **8. Simplest Solution: Use Development Mode**

If the packaged version doesn't work, use development mode:

1. Install Node.js on client machine
2. Copy entire project folder
3. Run: `npm install`
4. Run: `npm run dev:all`
5. Open: `http://localhost:5173`

Not as clean, but works 100%.

---

### **9. Check Windows Firewall**

Windows might be blocking Node.js:

1. Open Windows Firewall
2. Allow Node.js through firewall
3. Try again

---

### **10. Use Portable Server**

Create a standalone server:

```bash
# Install pkg
npm install -g pkg

# Package server
pkg server.js --targets node18-win-x64 --output server.exe

# Copy to release folder
copy server.exe release\win-unpacked\
```

Modify `electron.js` to run `server.exe` instead of `node server.js`.

---

## **Most Likely Issue:**

The server isn't starting because:
1. Path to `server.js` is wrong
2. Database file not found
3. Node modules not included in asar

## **Best Solution:**

Use `asarUnpack` to exclude server files from asar:

**In `package.json`:**

```json
"build": {
  "asar": true,
  "asarUnpack": [
    "**/*.node",
    "server.js",
    "emailService.js",
    "visitor_management.db",
    "node_modules/better-sqlite3/**/*"
  ]
}
```

Then rebuild.

---

## **Need Help?**

1. Press F12 in Electron window
2. Check Console tab
3. Copy any error messages
4. Share for debugging

---

## **Working Alternative:**

If all else fails, use the **development mode** which works perfectly:

```bash
npm run dev:all
```

This starts both frontend and backend, and you can access at `http://localhost:5173`.

For clients, you can:
1. Install Node.js
2. Copy project folder
3. Run `npm install`
4. Create a `start.bat`:
   ```batch
   @echo off
   start /B npm run server
   timeout /t 3
   start http://localhost:3001
   ```
5. Double-click `start.bat`

Not as elegant as Electron, but 100% reliable!
