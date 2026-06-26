/**
 * OPTO-PROFIT Desktop — System Tray Integration
 * =================================================
 * Adds a system tray icon with a context menu for quick actions.
 * Minimizing the app hides it to the tray instead of the taskbar.
 */

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const log = require('electron-log/main');

let tray = null;

/**
 * Create the system tray icon and context menu.
 * @param {Electron.BrowserWindow} mainWindow - The main application window
 */
function createTray(mainWindow) {
  const iconPath = path.join(__dirname, '..', 'desktop', 'optoprofit_icon.ico');

  // Use nativeImage for cross-platform support
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    // Resize for tray (16x16 is standard on Windows)
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } catch (err) {
    log.warn(`Could not load tray icon from ${iconPath}: ${err.message}`);
    return; // Skip tray if icon is missing
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('OPTO-PROFIT — Industrial Engineering Toolkit');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show OPTO-PROFIT',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Restart Backend',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.executeJavaScript(
            `window.electronAPI && window.electronAPI.restartBackend()`
          );
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click on tray icon shows the window
  tray.on('double-click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  log.info('System tray created.');
}

/**
 * Destroy the tray icon on app quit.
 */
function destroyTray() {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, destroyTray };
