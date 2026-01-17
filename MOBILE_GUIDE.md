# 📱 Mobile App Build Guide (Capacitor)

Your project is now configured to support building a native Android App using Capacitor.

## 🚀 Prerequisites
1. **Node.js** running on your PC.
2. **Android Studio** installed on your PC.
   - Download: [https://developer.android.com/studio](https://developer.android.com/studio)

## 🛠️ Step 1: Prepare the Project
The project is already initialized with Capacitor. The `android` folder contains the native project.

If you update the web code (`src`), always run:
```bash
npm run build
npx cap sync
```

## 🤖 Step 2: Build the Android App
1. Open the project in **Android Studio**:
   ```bash
   npx cap open android
   ```
   (Or manually open the `android` folder in Android Studio).

2. Wait for **Gradle Sync** to complete (this downloads necessary Android SDKs).

3. **Build APK**:
   - Go to menu: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - The APK will be generated (usually in `android/app/build/outputs/apk/debug/app-debug.apk`).

4. **Install on Phone**:
   - Transfer the APK to your phone and install it.
   - OR connect your phone via USB (with USB Debugging enabled) and click the **Run** (Play) button in Android Studio.

## ⚙️ Step 3: Configure the App on Mobile
Since the database and API server (`server.js`) run on your PC, the mobile app needs to know where to connect.

1. **Find your PC's Local IP Address**:
   - Open Command Prompt and run `ipconfig`.
   - Look for **IPv4 Address** (e.g., `192.168.1.105`).

2. **Open the App on Mobile**:
   - You might see a connection error initially because `localhost` on mobile refers to the phone itself.
   - Open the **Side Menu** (Hamburger icon).
   - Scroll down to the bottom and tap **⚙️ Server Config**.
   - Enter your PC's API URL:
     ```
     http://192.168.1.105:3000
     ```
     *(Replace `192.168.1.105` with your actual PC IP address)*.
   - Tap OK. The app will reload and connect to your PC.

## 🌐 Alternative: Testing without APK (Mobile Browser)
You can also test purely in the mobile browser if your PC and Phone are on the same WiFi.
1. Run `npm run dev -- --host` on your PC.
2. Note the Network URL printed in the terminal (e.g., `http://192.168.1.105:5173`).
3. Open Chrome on Android and visit that URL.
4. Use **Server Config** in the menu to point to your API (`http://192.168.1.105:3000`).

## ⚠️ Troubleshooting
- **Network Error**: Ensure your **Windows Firewall** allows connections to Node.js (Port 3000) and Vite (Port 5173).
- **Camera/GPS Permissions**: The native app handles permissions automatically. Android will ask for permission on first use.
