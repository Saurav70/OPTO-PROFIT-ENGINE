/**
 * OPTO-PROFIT Desktop — Auto-Updater Module
 * =============================================
 * Handles automatic update checking, downloading, and installation
 * using electron-updater (backed by GitHub Releases or generic server).
 */

const { autoUpdater } = require('electron-updater');
const { dialog, ipcMain } = require('electron');
const log = require('electron-log/main');

/**
 * Set up the auto-updater.
 * @param {Electron.BrowserWindow} mainWindow - The main application window
 */
function setupAutoUpdater(mainWindow) {
  // Route electron-updater logs through electron-log
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';

  // Don't auto-download — let the user decide
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // ── Event: Update available ──────────────────────────────
  autoUpdater.on('update-available', (info) => {
    log.info(`Update available: v${info.version}`);

    // Notify the renderer process
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    }

    // Show a native dialog
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (v${info.version}) is available.`,
        detail: 'Would you like to download and install it now?',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  // ── Event: No update available ───────────────────────────
  autoUpdater.on('update-not-available', () => {
    log.info('No updates available.');
  });

  // ── Event: Download progress ─────────────────────────────
  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${Math.round(progress.percent)}%`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      });
    }
  });

  // ── Event: Update downloaded ─────────────────────────────
  autoUpdater.on('update-downloaded', (info) => {
    log.info(`Update downloaded: v${info.version}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
      });
    }

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded.`,
        detail: 'The update will be installed when you restart the application.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  // ── Event: Error ─────────────────────────────────────────
  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err.message);
  });

  // ── IPC: Manual install trigger from renderer ────────────
  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  // ── Check for updates on startup (after a short delay) ───
  setTimeout(() => {
    log.info('Checking for updates…');
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.warn('Update check failed:', err.message);
    });
  }, 10000); // Wait 10s after launch to avoid slowing startup
}

module.exports = { setupAutoUpdater };
