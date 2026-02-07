# Port Configuration - RESOLVED

## The Confusion

You had **TWO different ports** being used:
- **Port 3000**: Originally used by `server.js` for cloud deployment
- **Port 3001**: Used by Electron desktop app

This caused confusion because:
1. Fly.io was trying to connect to port 3000
2. Electron was running on port 3001
3. Another application on your system uses port 3000

## The Fix

**Now EVERYTHING uses port 3001!** ✅

### Files Changed

1. **`server.js` (line 34)**
   ```javascript
   // Before
   const PORT = process.env.PORT || 3000;
   
   // After
   const PORT = process.env.PORT || 3001;
   ```

2. **`Dockerfile` (line 38)**
   ```dockerfile
   # Before
   EXPOSE 3000
   
   # After
   EXPOSE 3001
   ```

3. **`fly.toml` (line 20)**
   ```toml
   # Before
   internal_port = 3000
   
   # After
   internal_port = 3001
   ```

4. **`electron.cjs` (line 126)**
   ```javascript
   // Already correct!
   PORT: '3001',
   ```

## Current Port Usage

```
┌─────────────────────────────────────┐
│  ALL ENVIRONMENTS USE PORT 3001     │
└─────────────────────────────────────┘

Local Development:
  - Server: http://localhost:3001
  - API: http://localhost:3001/api

Electron Desktop App:
  - Server: http://localhost:3001
  - Frontend: file:// (loads from dist/)

Fly.io Cloud:
  - Internal: 0.0.0.0:3001
  - External: https://attendance-app-v5jdla.fly.dev
  - Fly.io proxy maps HTTPS → internal port 3001
```

## How It Works

### Local Development
```bash
npm run server
# Server starts on port 3001
# Access: http://localhost:3001
```

### Electron Desktop App
```bash
npm run electron:dev
# Electron starts server on port 3001
# Loads frontend from Vite dev server (port 5173)
```

### Fly.io Cloud
```bash
flyctl deploy
# Docker container runs server on port 3001
# Fly.io proxy routes HTTPS traffic to port 3001
# Users access: https://attendance-app-v5jdla.fly.dev
```

## Environment Variables

### Local/Electron
```bash
PORT=3001  # Default, can be overridden
```

### Fly.io
```bash
PORT=3001  # Set by fly.toml internal_port
```

## Testing

### Test Local Server
```bash
# Start server
npm run server

# Test health endpoint
curl http://localhost:3001/api/health
```

### Test Electron App
```bash
# Build and run
npm run electron:dist

# Server automatically starts on port 3001
```

### Test Fly.io
```bash
# Deploy
flyctl deploy --app attendance-app-v5jdla

# Test
curl https://attendance-app-v5jdla.fly.dev/api/health
```

## No More Confusion!

✅ **Port 3001 everywhere**
✅ **No conflict with other apps on port 3000**
✅ **Consistent across all environments**
✅ **Easy to remember and debug**

## Next Steps

1. Commit changes
2. Deploy to Fly.io
3. Test all environments
4. Rebuild Electron app if needed

---

**Summary**: Everything now uses port **3001**. No more port confusion! 🎉
