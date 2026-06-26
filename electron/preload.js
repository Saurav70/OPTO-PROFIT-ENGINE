/**
 * OPTO-PROFIT Desktop — Preload Script
 * ======================================
 * Runs in a sandboxed renderer context with access to Node.js APIs.
 * Exposes a minimal, secure API to the React frontend via contextBridge.
 *
 * The renderer can access these via `window.electronAPI`.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** Whether the app is running inside Electron */
  isElectron: true,

  /** The OS platform (win32, darwin, linux) */
  platform: process.platform,

  /** Get the app version (reads from package.json via main process) */
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  /** Get the OS platform via IPC (alternative to the static value above) */
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  /** Restart the backend sidecar process */
  restartBackend: () => ipcRenderer.invoke('restart-backend'),

  /** Listen for update events from the main process */
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },

  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },

  /** Trigger update installation */
  installUpdate: () => ipcRenderer.send('install-update'),
});
