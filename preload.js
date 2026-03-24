const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setTradeMode: (enabled) => ipcRenderer.invoke('set-trade-mode', !!enabled),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('set-always-on-top', !!enabled),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', String(url || '')),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForAppUpdate: () => ipcRenderer.invoke('check-for-app-update'),
  downloadAppUpdate: () => ipcRenderer.invoke('download-app-update'),
  installDownloadedUpdate: () => ipcRenderer.invoke('install-downloaded-update'),
  onAppUpdateEvent: (callback) => {
    if (typeof callback !== 'function') return () => {};
    var listener = (_event, payload) => callback(payload || {});
    ipcRenderer.on('app-update-event', listener);
    return () => ipcRenderer.removeListener('app-update-event', listener);
  }
});
