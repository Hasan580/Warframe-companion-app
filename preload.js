const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setTradeMode: (enabled) => ipcRenderer.invoke('set-trade-mode', !!enabled),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('set-always-on-top', !!enabled),
  setRelicOverlayEnabled: (enabled) => ipcRenderer.invoke('set-relic-overlay-enabled', !!enabled),
  getRelicOverlayStatus: () => ipcRenderer.invoke('get-relic-overlay-status'),
  updateRelicOverlay: (payload) => ipcRenderer.invoke('update-relic-overlay', payload || {}),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', String(url || '')),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getVersionHint: () => '',
  resolveAssetUrl: (relativePath) => {
    return String(relativePath || '')
      .replace(/^[/\\]+/, '')
      .replace(/\\/g, '/');
  },
  checkForAppUpdate: () => ipcRenderer.invoke('check-for-app-update'),
  downloadAppUpdate: () => ipcRenderer.invoke('download-app-update'),
  installDownloadedUpdate: () => ipcRenderer.invoke('install-downloaded-update'),
  detectWarframeProcess: () => ipcRenderer.invoke('detect-warframe-process'),
  getWarframeLogConfig: () => ipcRenderer.invoke('get-warframe-log-config'),
  selectWarframeLogFile: () => ipcRenderer.invoke('select-warframe-log-file'),
  resetWarframeLogPath: () => ipcRenderer.invoke('reset-warframe-log-path'),
  fetchWarframeProfile: () => ipcRenderer.invoke('fetch-warframe-profile'),
  scanImageForItems: (imageDataUrl) => ipcRenderer.invoke('scan-image-for-items', String(imageDataUrl || '')),
  onAppUpdateEvent: (callback) => {
    if (typeof callback !== 'function') return () => {};
    var listener = (_event, payload) => callback(payload || {});
    ipcRenderer.on('app-update-event', listener);
    return () => ipcRenderer.removeListener('app-update-event', listener);
  },
  onOcrScanProgress: (callback) => {
    if (typeof callback !== 'function') return () => {};
    var listener = (_event, payload) => callback(payload || {});
    ipcRenderer.on('ocr-scan-progress', listener);
    return () => ipcRenderer.removeListener('ocr-scan-progress', listener);
  },
  onRelicOverlayEvent: (callback) => {
    if (typeof callback !== 'function') return () => {};
    var listener = (_event, payload) => callback(payload || {});
    ipcRenderer.on('relic-overlay-event', listener);
    return () => ipcRenderer.removeListener('relic-overlay-event', listener);
  }
});
