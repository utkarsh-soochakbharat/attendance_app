const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const isDev = !app.isPackaged;

// Simple file logger so we can debug portable exe startup
const logPath = path.join(process.cwd(), 'electron-main-log.txt');
function log(...args) {
    try {
        fs.appendFileSync(
            logPath,
            `${new Date().toISOString()} ${args.map(String).join(' ')}\n`
        );
    } catch {
        // ignore logging errors
    }
}

let mainWindow;
let serverProcess;

function createWindow() {
    log('createWindow() called. isDev =', isDev, 'resourcesPath =', process.resourcesPath);

    // Determine preload script path
    let preloadPath;
    if (isDev) {
        // In dev, use the built preload from dist-electron
        preloadPath = path.join(__dirname, 'dist-electron', 'preload.mjs');
    } else {
        // In production, use the simple preload.js from unpacked folder
        preloadPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'preload.js');
    }
    log('Preload script path:', preloadPath);
    log('Preload script exists:', fs.existsSync(preloadPath));

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: preloadPath
        },
        title: 'Attendance System - Soochak Bharat',
        backgroundColor: '#1a1a2e',
        show: false
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        log('mainWindow ready-to-show');
        mainWindow.show();
    });

    // Start backend server
    startBackendServer();

    // Load frontend
    if (isDev) {
        // Development mode - served by Vite dev server
        log('Loading dev URL http://localhost:5173');
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // Production mode - load built React app directly from disk (no HTTP)
        const indexPath = path.join(__dirname, 'dist', 'index.html');
        log('Loading prod file:// index from', indexPath);
        mainWindow.loadFile(indexPath).catch(err => {
            log('loadFile error:', err?.message || err);
        });
    }

    // Create menu
    createMenu();

    mainWindow.on('closed', () => {
        log('mainWindow closed');
        mainWindow = null;
    });

    // Debug: Log when page fails to load
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log('did-fail-load', 'code=', errorCode, 'desc=', errorDescription);
        console.error('Failed to load:', errorCode, errorDescription);
        // Retry after 2 seconds
        setTimeout(() => {
            mainWindow.loadURL('http://localhost:3001');
        }, 2000);
    });
}

function startBackendServer() {
    log('startBackendServer() called. isPackaged =', app.isPackaged);
    const isPackaged = app.isPackaged;

    let serverPath;
    let cwd;

    if (isPackaged) {
        // Production: server.js is in resources/app.asar.unpacked
        serverPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'server.js');
        cwd = path.join(process.resourcesPath, 'app.asar.unpacked');
    } else {
        // Development
        serverPath = path.join(__dirname, 'server.js');
        cwd = __dirname;
    }

    log('Starting server from:', serverPath);
    log('Working directory:', cwd);

    // IMPORTANT:
    // - Don't rely on an external system Node installation.
    // - Ensure native modules (e.g., better-sqlite3) match Electron's ABI.
    // We run the backend using Electron's bundled Node by setting ELECTRON_RUN_AS_NODE=1.
    serverProcess = spawn(process.execPath, [serverPath], {
        cwd: cwd,
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1',
            PORT: '3001',
            NODE_ENV: isPackaged ? 'production' : 'development'
        },
        // In dev this will still show in the terminal, in prod we capture and log it.
        stdio: ['ignore', 'pipe', 'pipe']
    });

    if (serverProcess.stdout) {
        serverProcess.stdout.on('data', (data) => {
            log('server stdout:', String(data).trim());
        });
    }
    if (serverProcess.stderr) {
        serverProcess.stderr.on('data', (data) => {
            log('server stderr:', String(data).trim());
        });
    }

    serverProcess.on('error', (error) => {
        log('serverProcess error:', error.message || error);
        console.error('Failed to start server:', error);
    });

    serverProcess.on('close', (code) => {
        log('serverProcess exited with code', code);
        console.log(`Server process exited with code ${code}`);
    });
}

function createMenu() {
    log('createMenu() called');
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Home',
                    click: () => {
                        mainWindow.loadURL('http://localhost:3001/#/dashboard');
                    }
                },
                {
                    label: 'Kiosk Mode',
                    click: () => {
                        mainWindow.loadURL('http://localhost:3001/#/kiosk');
                        mainWindow.setFullScreen(true);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit Fullscreen',
                    accelerator: 'Esc',
                    click: () => {
                        mainWindow.setFullScreen(false);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'Alt+F4',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
                { type: 'separator' },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Attendance System',
                            message: 'Attendance System v1.0.0',
                            detail: 'Face Recognition Based Attendance Management\\n\\nDeveloped by Soochak Bharat\\n\\n© 2026 All Rights Reserved'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// App lifecycle
app.whenReady().then(() => {
    log('app.whenReady()');
    createWindow();
});

app.on('window-all-closed', () => {
    log('window-all-closed');
    if (serverProcess) {
        serverProcess.kill();
    }
    app.quit();
});

app.on('activate', () => {
    log('app activate');
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    log('before-quit');
    if (serverProcess) {
        serverProcess.kill();
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log('uncaughtException', error.message || error);
    console.error('Uncaught Exception:', error);
});


