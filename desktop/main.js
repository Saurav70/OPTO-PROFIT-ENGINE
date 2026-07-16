const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow;
let backendProcess;
const PORT = 48157;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Make app a single instance to handle second-instance file opens
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    
    // Find the .opto file in command line args
    const optoFilePath = commandLine.find(arg => arg.endsWith('.opto'));
    if (optoFilePath && mainWindow) {
      handleOpenFile(optoFilePath);
    }
  });
}

function handleOpenFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('open-opto-file', fileContent);
  } catch (error) {
    console.error('Failed to read .opto file:', error);
  }
}

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  // If app is already ready and window exists, handle it
  if (app.isReady() && mainWindow) {
    handleOpenFile(filePath);
  } else {
    // Otherwise store it and handle when ready
    app.once('ready', () => {
      // Need to wait for window to be created and loaded
      setTimeout(() => handleOpenFile(filePath), 2000); 
    });
  }
});

function startBackend() {
  const isDev = process.env.NODE_ENV === 'development';
  let executablePath;

  if (isDev) {
    // In dev, we can just run the python script directly if needed, or assume it's already running.
    // Let's assume the user starts the backend separately in dev via `python backend/run_desktop.py --dev` 
    // or similar, but for simplicity here we just point to the URL.
    return Promise.resolve();
  } else {
    executablePath = path.join(process.resourcesPath, 'backend.exe');
    if (!fs.existsSync(executablePath)) {
        // Fallback for running packed app locally without installer
        executablePath = path.join(__dirname, 'dist_backend', 'backend.exe');
    }
  }

  console.log(`Starting backend from: ${executablePath}`);
  
  backendProcess = spawn(executablePath, [], {
    detached: false, // Ensure it gets killed when electron dies
    stdio: 'ignore'
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
    dialog.showErrorBox('Backend Error', `Failed to start the core engine.\n${err.message}`);
    app.quit();
  });

  return new Promise((resolve, reject) => {
    const timeout = Date.now() + 20000; // 20 seconds timeout
    
    const checkStatus = () => {
      http.get(`${BASE_URL}/api/status`, (res) => {
        if (res.statusCode === 200) {
          console.log('Backend is ready!');
          resolve();
        } else {
          retry();
        }
      }).on('error', (err) => {
        retry();
      });
    };

    const retry = () => {
      if (Date.now() > timeout) {
        reject(new Error('Backend timeout'));
      } else {
        setTimeout(checkStatus, 250);
      }
    };

    checkStatus();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "OPTO-PROFIT — Industrial Engineering Toolkit",
    icon: path.join(__dirname, 'optoprofit_icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  const isDev = process.env.NODE_ENV === 'development';
  const loadUrl = isDev ? 'http://localhost:5173' : BASE_URL;

  mainWindow.loadURL(loadUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Handle file passed via CLI on initial launch
  if (process.argv.length > 1) {
    const optoFilePath = process.argv.find(arg => arg.endsWith('.opto'));
    if (optoFilePath) {
      mainWindow.webContents.once('did-finish-load', () => {
        handleOpenFile(optoFilePath);
      });
    }
  }
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
  } catch (err) {
    dialog.showErrorBox('Startup Error', 'The backend engine failed to start in time. Please check your system logs or contact support.');
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Ensure the backend process is killed
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {
      console.error('Failed to kill backend:', e);
    }
  }
});
