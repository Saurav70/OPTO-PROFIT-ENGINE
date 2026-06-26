/**
 * OPTO-PROFIT Desktop — Native Application Menu
 * ================================================
 * Provides a standard native menu bar with File, Edit, View, and Help menus.
 */

const { app, Menu, shell, dialog } = require('electron');
const path = require('path');
const log = require('electron-log/main');

/**
 * Create and apply the native application menu.
 * @param {Electron.BrowserWindow} mainWindow - The main application window
 */
function createAppMenu(mainWindow) {
  const isMac = process.platform === 'darwin';

  const template = [
    // ── File Menu ──────────────────────────────────────────
    {
      label: 'File',
      submenu: [
        {
          label: 'New Profile',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.executeJavaScript(
                `window.dispatchEvent(new CustomEvent('electron-new-profile'))`
              );
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Export Data…',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.executeJavaScript(
                `window.dispatchEvent(new CustomEvent('electron-export-data'))`
              );
            }
          },
        },
        {
          label: 'Import Data…',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.executeJavaScript(
                `window.dispatchEvent(new CustomEvent('electron-import-data'))`
              );
            }
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // ── Edit Menu ──────────────────────────────────────────
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    // ── View Menu ──────────────────────────────────────────
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.executeJavaScript(
                `window.dispatchEvent(new CustomEvent('electron-toggle-sidebar'))`
              );
            }
          },
        },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.toggleDevTools();
            }
          },
        },
      ],
    },

    // ── Help Menu ──────────────────────────────────────────
    {
      label: 'Help',
      submenu: [
        {
          label: 'About OPTO-PROFIT',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About OPTO-PROFIT',
              message: 'OPTO-PROFIT — Industrial Engineering Toolkit',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}\n\n© ${new Date().getFullYear()} OPTO-PROFIT Team`,
              buttons: ['OK'],
            });
          },
        },
        { type: 'separator' },
        {
          label: 'Open Logs Folder',
          click: () => {
            const logPath = log.transports.file.getFile().path;
            shell.showItemInFolder(logPath);
          },
        },
        {
          label: 'Open Data Folder',
          click: () => {
            const dataDir =
              process.platform === 'win32'
                ? path.join(process.env.LOCALAPPDATA || '', 'OPTO-PROFIT')
                : path.join(
                    process.env.XDG_DATA_HOME || path.join(require('os').homedir(), '.local', 'share'),
                    'OPTO-PROFIT'
                  );
            shell.openPath(dataDir);
          },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates…',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('check-for-updates');
            }
            // The actual check is triggered via the updater module
            try {
              const { autoUpdater } = require('electron-updater');
              autoUpdater.checkForUpdatesAndNotify();
            } catch (err) {
              log.warn('Auto-updater not available:', err.message);
            }
          },
        },
      ],
    },
  ];

  // On macOS, insert the app menu at the beginning
  if (isMac) {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { createAppMenu };
