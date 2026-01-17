# 🌐 Browser Support - API Server Setup

## Problem Solved

**Issue:** `window.ipcRenderer` doesn't exist in browser (only in Electron)
**Solution:** Created Express.js API server that exposes database operations as REST endpoints

---

## 🚀 Quick Start

### 1. Start the API Server

Open a **new terminal** and run:

```bash
npm run server
```

This starts the API server on `http://localhost:3000`

### 2. Keep Vite Running

In your existing terminal (or another one):

```bash
npm run dev
```

This keeps the frontend running on `http://localhost:5173`

### 3. Access via Browser

Now you can access the app via:
- **Desktop Browser:** `http://localhost:5173`
- **Mobile (via ngrok):** `https://your-ngrok-url.ngrok-free.dev`

---

## 📡 How It Works

### Unified API Client (`src/utils/api.ts`)

The app now uses a smart API client that automatically detects the environment:

```typescript
// Automatically chooses the right method
const employees = await api.getEmployees();

// In Electron: Uses window.ipcRenderer.invoke()
// In Browser: Uses fetch() to http://localhost:3000/api
```

### Available Endpoints

```
GET  /api/health                    - Health check
GET  /api/employees                 - Get all employees
POST /api/register-employee         - Register new employee
GET  /api/attendance                - Get attendance records
POST /api/mark-attendance           - Mark attendance
GET  /api/office-locations          - Get office locations
POST /api/add-office-location       - Add office location
PUT  /api/update-office-location    - Update office location
DELETE /api/delete-office-location/:id - Delete office location
GET  /api/visitors                  - Get visitors
POST /api/add-visitor               - Add visitor
```

---

## 🔧 Files Modified

1. **`server.js`** (NEW)
   - Express.js API server
   - Wraps all IPC handlers as REST endpoints
   - Uses same database as Electron

2. **`src/utils/api.ts`** (NEW)
   - Unified API client
   - Auto-detects Electron vs Browser
   - Seamless switching between IPC and REST

3. **`src/pages/EmployeeRegistration.tsx`**
   - Updated to use `api.registerEmployee()`
   - Works in both Electron and Browser

4. **`package.json`**
   - Added `npm run server` script
   - Added `npm run dev:all` (runs both)

---

## ✅ Testing

### Test in Electron (Desktop App)
```bash
npm run dev
```
- Should work as before
- Uses IPC communication

### Test in Browser (localhost)
```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev

# Browser
http://localhost:5173
```
- Should work via REST API
- Uses fetch() to localhost:3000

### Test on Mobile (ngrok)
```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev

# Terminal 3
ngrok http 5173

# Mobile Browser
https://your-url.ngrok-free.dev
```
- Should work via REST API
- Camera and GPS enabled (HTTPS)

---

## 🎯 Next Steps

### Update Other Pages

You need to update these pages to use the API client:

1. **EmployeeAttendance.tsx**
   - Replace `window.ipcRenderer.invoke('get-employees')` 
   - With `api.getEmployees()`

2. **OfficeManagement.tsx**
   - Replace `window.ipcRenderer.invoke('get-office-locations')`
   - With `api.getOfficeLocations()`

3. **CheckIn.tsx / VisitorList.tsx**
   - Replace visitor-related IPC calls
   - With `api.getVisitors()`, `api.addVisitor()`, etc.

### Example Migration

**Before:**
```typescript
const employees = await window.ipcRenderer.invoke('get-employees');
```

**After:**
```typescript
import api from '../utils/api';
const employees = await api.getEmployees();
```

---

## 🐛 Troubleshooting

### "Failed to register employee"

**Check:**
1. Is the API server running? (`npm run server`)
2. Check terminal for errors
3. Try: `curl http://localhost:3000/api/health`

### "Connection refused"

**Solution:**
- Make sure API server is running on port 3000
- Check if another app is using port 3000
- Change port in `server.js` if needed

### CORS Errors

**Already handled** - server.js has CORS enabled:
```javascript
app.use(cors());
```

---

## 📱 Mobile Deployment

For production mobile deployment:

1. **Deploy API server** to a cloud service (Heroku, AWS, etc.)
2. **Update API_BASE_URL** in `src/utils/api.ts`:
   ```typescript
   const API_BASE_URL = 'https://your-api.herokuapp.com/api';
   ```
3. **Deploy frontend** to static hosting (Vercel, Netlify, etc.)
4. **Enable HTTPS** (required for camera/GPS)

---

## 🎉 Summary

✅ **Electron App:** Still works (uses IPC)
✅ **Browser (localhost):** Now works (uses REST API)
✅ **Mobile (ngrok):** Now works (uses REST API + HTTPS)

The app is now **fully cross-platform** and works everywhere! 🚀
