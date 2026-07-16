const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onOpenFile: (callback) => {
    // Listen for the 'open-opto-file' IPC message from the main process
    ipcRenderer.on('open-opto-file', (event, fileContent) => {
      callback(fileContent);
    });
  }
});
