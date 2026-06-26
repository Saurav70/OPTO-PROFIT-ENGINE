/**
 * OPTO-PROFIT Desktop — Electron Main Process
 * =============================================
 * Entry point for the Electron application.
 *
 * Execution flow:
 *   1. Show a splash screen while the backend boots
 *   2. Spawn the PyInstaller-bundled FastAPI backend as a child process
 *   3. Poll /api/status until the server is ready
 *   4. Load the React frontend in a BrowserWindow
 *   5. Wire up native menus, system tray, and auto-updater
 *   6. On quit, gracefully kill the backend process
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const log = require('electron-log/main');

// Modules split into separate files for maintainability
const { createAppMenu } = require('./menu');
const { createTray, destroyTray } = require('./tray');
const { setupAutoUpdater } = require('./updater');

// ── Configuration ────────────────────────────────────────────────
const HOST = '127.0.0.1';
const PORT = 48157;
const BASE_URL = `http://${HOST}:${PORT}`;
const IS_DEV = process.env.NODE_ENV === 'development';

log.initialize();
log.info(`OPTO-PROFIT Desktop starting (dev=${IS_DEV})…`);

// ── Global references (prevent GC) ──────────────────────────────
let mainWindow = null;
let splashWindow = null;
let backendProcess = null;

// ── Resolve resource paths ──────────────────────────────────────
function getBackendExePath() {
  if (IS_DEV) {
    // In dev, assume the backend .exe has been pre-built to backend/dist/
    return path.join(__dirname, '..', 'backend', 'dist', 'OPTO-PROFIT.exe');
  }
  // In production, the .exe is bundled as an extraResource
  return path.join(process.resourcesPath, 'backend', 'OPTO-PROFIT.exe');
}

function getFrontendURL() {
  if (IS_DEV) {
    // Point to Vite dev server for hot-reloading
    return 'http://localhost:5173';
  }
  // In production, serve from the bundled dist/ folder
  return `file://${path.join(__dirname, '..', 'frontend', 'dist', 'index.html')}`;
}

// ── Backend process management ──────────────────────────────────
function spawnBackend() {
  const exePath = getBackendExePath();
  log.info(`Spawning backend: ${exePath}`);

  try {
    backendProcess = spawn(exePath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        OPTO_DESKTOP: '1',
      },
      // Detach so it doesn't block Electron, but we track it to kill on exit
      detached: false,
    });

    backendProcess.stdout.on('data', (data) => {
      log.info(`[backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      log.warn(`[backend:err] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
      log.error(`Backend process error: ${err.message}`);
      dialog.showErrorBox(
        'OPTO-PROFIT — Backend Error',
        `Failed to start the backend engine.\n\n${err.message}\n\nPlease ensure the backend has been built (see scripts/build-electron.ps1).`
      );
    });

    backendProcess.on('exit', (code, signal) => {
      log.info(`Backend process exited (code=${code}, signal=${signal})`);
      backendProcess = null;
    });
  } catch (err) {
    log.error(`Failed to spawn backend: ${err.message}`);
    backendProcess = null;
  }
}

function killBackend() {
  if (backendProcess && !backendProcess.killed) {
    log.info('Killing backend process…');
    try {
      // On Windows, taskkill is needed for tree-kill
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(backendProcess.pid), '/f', '/t']);
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch (err) {
      log.warn(`Error killing backend: ${err.message}`);
    }
    backendProcess = null;
  }
}

// ── Health-check polling ────────────────────────────────────────
function waitForBackend(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const url = `${BASE_URL}/api/status`;

    const poll = () => {
      if (Date.now() > deadline) {
        return reject(new Error('Backend did not start within timeout'));
      }

      http
        .get(url, (res) => {
          if (res.statusCode === 200) {
            log.info('Backend is ready.');
            return resolve();
          }
          setTimeout(poll, 300);
        })
        .on('error', () => {
          setTimeout(poll, 300);
        });
    };

    poll();
  });
}

// ── Splash screen ───────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

// ── Main application window ─────────────────────────────────────
function createMainWindow() {
  const iconPath = path.join(__dirname, '..', 'desktop', 'optoprofit_icon.ico');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false, // Don't show until ready-to-show
    title: 'OPTO-PROFIT — Industrial Engineering Toolkit',
    icon: iconPath,
    backgroundColor: '#0a0a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  });

  // Graceful show: wait until the page has rendered
  mainWindow.once('ready-to-show', () => {
    closeSplash();
    mainWindow.show();
    mainWindow.focus();
  });

  // Load the frontend
  const frontendURL = getFrontendURL();
  log.info(`Loading frontend: ${frontendURL}`);

  if (frontendURL.startsWith('http')) {
    mainWindow.loadURL(frontendURL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
    );
  }

  // Open DevTools in dev mode
  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimize to tray instead of closing (optional — handled in tray.js)
  mainWindow.on('close', (event) => {
    if (mainWindow && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

// ── Application lifecycle ───────────────────────────────────────
app.on('ready', async () => {
  log.info('Electron app ready.');

  // 1. Show splash screen
  createSplashWindow();

  // 2. Spawn backend
  spawnBackend();

  // 3. Wait for backend to be ready
  try {
    await waitForBackend(30000);
  } catch (err) {
    log.error(err.message);
    closeSplash();
    dialog.showErrorBox(
      'OPTO-PROFIT — Startup Error',
      'The backend engine failed to start within 30 seconds.\n\nPlease check the logs and ensure the backend .exe is available.'
    );
    app.quit();
    return;
  }

  // 4. Create the main window
  const win = createMainWindow();

  // 5. Set up native menu
  createAppMenu(win);

  // 6. Set up system tray
  createTray(win);

  // 7. Set up auto-updater (production only)
  if (!IS_DEV) {
    setupAutoUpdater(win);
  }
});

app.on('window-all-closed', () => {
  // On macOS, apps typically stay open until Cmd+Q.
  // On Windows/Linux, quit when all windows are closed.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // macOS: re-create window when dock icon clicked
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  killBackend();
  destroyTray();
});

// ── IPC handlers ────────────────────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('restart-backend', async () => {
  killBackend();
  spawnBackend();
  try {
    await waitForBackend(20000);
    return { success: true };
  } catch {
    return { success: false, error: 'Backend failed to restart' };
  }
});
