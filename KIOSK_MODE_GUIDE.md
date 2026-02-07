# 🏢 Biometric Kiosk Mode - Complete Guide

## Overview

For high-security offices where personal devices (laptops, mobiles) are not allowed, we've implemented a **dedicated Biometric Kiosk Mode** for attendance marking at office entrances.

## Features

✅ **Fullscreen Mode** - No navigation, dedicated to attendance only
✅ **Auto Camera Start** - Automatically opens camera on load
✅ **Continuous Face Detection** - Scans every second
✅ **Auto Recognition** - Automatically marks attendance when face detected
✅ **Large Display** - Easy to see from distance
✅ **Visual Feedback** - Success/error messages in large font
✅ **No Login Required** - Direct access for quick attendance

## How It Works

1. **Dedicated Device** - Set up a tablet/computer at office entrance
2. **Open Kiosk URL** - Navigate to `/kiosk` route
3. **Auto Start** - Camera starts automatically
4. **Face Scan** - Employees look at camera
5. **Auto Mark** - Attendance marked automatically
6. **Confirmation** - Large message shows success

## Setup Instructions

### 1. Hardware Setup

**Recommended:**
- Tablet (10" or larger) or Desktop with webcam
- Wall mount or stand at entrance
- Good lighting at entrance
- Network connection

**Minimum Requirements:**
- Device with camera
- Modern browser (Chrome/Edge)
- Internet connection

### 2. Software Setup

**Access Kiosk Mode:**
```
http://localhost:5173/#/kiosk
```

**For Production:**
```
https://your-domain.com/#/kiosk
```

### 3. Browser Settings

**Enable Fullscreen:**
- Press `F11` on keyboard
- Or use browser fullscreen option

**Auto-start on Boot:**
1. Set browser to open on startup
2. Set kiosk URL as homepage
3. Enable kiosk mode in browser settings

**Chrome Kiosk Mode:**
```bash
chrome.exe --kiosk --app=http://localhost:5173/#/kiosk
```

## Usage

### For Employees:

1. **Approach kiosk**
2. **Look at camera**
3. **Wait for recognition** (1-2 seconds)
4. **See confirmation** - "Welcome [Name]!"
5. **Done** - Attendance marked

### For Administrators:

**Initial Setup:**
1. Register all employees with face data
2. Set up kiosk device at entrance
3. Open kiosk URL
4. Enable fullscreen
5. Test with few employees

**Maintenance:**
- Keep camera lens clean
- Ensure good lighting
- Monitor network connection
- Check attendance logs regularly

## Features Explained

### Auto Detection
- Scans for faces every second
- No button press needed
- Automatic check-in/check-out logic

### Large Display
- 48px heading
- 32px messages
- Easy to read from 2-3 meters

### Visual Feedback
- **Green** - Success (Welcome message)
- **Red** - Error (Face not recognized)
- **Blue** - Info messages

### Employee Info Display
- Name
- Employee ID
- Department
- Shown for 5 seconds

## Advantages

✅ **No Personal Devices** - Works without phones/laptops
✅ **Fast** - 1-2 second recognition
✅ **Contactless** - No touch required
✅ **Hygienic** - No fingerprint scanner
✅ **Accurate** - Face recognition technology
✅ **Audit Trail** - All attendance logged
✅ **Real-time** - Instant database update

## Security Features

✅ **No Navigation** - Can't access other pages
✅ **No Login** - Direct attendance only
✅ **Face Verification** - Biometric security
✅ **Geofencing** - Works with office location
✅ **Audit Logs** - All attempts recorded

## Troubleshooting

### Camera Not Starting
- Check browser permissions
- Allow camera access
- Refresh page

### Face Not Recognized
- Ensure good lighting
- Look directly at camera
- Remove glasses/mask if needed
- Re-register face data

### Slow Recognition
- Check network speed
- Reduce detection frequency
- Upgrade device hardware

## Deployment Options

### Option 1: Dedicated Tablet
- Mount tablet at entrance
- Power via USB
- Auto-start kiosk on boot

### Option 2: Desktop Computer
- Place at reception
- External webcam
- Larger screen for better visibility

### Option 3: Raspberry Pi
- Low-cost solution
- Small footprint
- Touchscreen display

## Best Practices

1. **Lighting** - Ensure good, even lighting
2. **Height** - Mount at face level (5-6 feet)
3. **Distance** - 2-3 feet from camera
4. **Angle** - Straight on, not tilted
5. **Background** - Plain, non-distracting
6. **Maintenance** - Clean camera weekly

## Technical Details

**Route:** `/kiosk`
**Component:** `KioskMode.tsx`
**Layout:** Fullscreen, no sidebar
**Detection:** Every 1 second
**Threshold:** 0.6 (60% match)
**Display Time:** 5 seconds

## Integration

Works with existing:
- Employee database
- Face descriptors
- Attendance API
- Geofencing (optional)
- Email reports

## Access URL

**Development:**
```
http://localhost:5173/#/kiosk
```

**Production:**
```
https://your-domain.com/#/kiosk
```

**Direct Link:**
- Bookmark this URL
- Set as browser homepage
- Use in kiosk mode

## Summary

The Biometric Kiosk Mode provides a **dedicated, touchless, fast attendance solution** for high-security offices where personal devices are not allowed. Simply set up a device at the entrance, open the kiosk URL, and employees can mark attendance by looking at the camera!

**Perfect for:**
- Manufacturing facilities
- Research labs
- Government offices
- Secure corporate offices
- Clean rooms
- Data centers

🚀 **Ready to deploy!**
