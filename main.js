const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;
const DEFAULT_MIN_WIDTH = 900;
const DEFAULT_MIN_HEIGHT = 600;
const isDev = !app.isPackaged;
let updateDownloaded = false;

function sendUpdaterEvent(type, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send('app-update-event', Object.assign({ type: type }, payload || {}));
}

function setupAutoUpdater() {
  if (isDev) {
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterEvent('checking-for-update');
  });

  autoUpdater.on('update-available', (info) => {
    updateDownloaded = false;
    sendUpdaterEvent('update-available', {
      version: info && info.version ? info.version : '',
      releaseName: info && info.releaseName ? info.releaseName : '',
      releaseNotes: info && info.releaseNotes ? info.releaseNotes : ''
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    updateDownloaded = false;
    sendUpdaterEvent('update-not-available', {
      version: info && info.version ? info.version : ''
    });
  });

  autoUpdater.on('error', (error) => {
    sendUpdaterEvent('error', {
      message: error && error.message ? error.message : 'Updater error'
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdaterEvent('download-progress', {
      percent: progress && typeof progress.percent === 'number' ? progress.percent : 0,
      transferred: progress && typeof progress.transferred === 'number' ? progress.transferred : 0,
      total: progress && typeof progress.total === 'number' ? progress.total : 0,
      bytesPerSecond: progress && typeof progress.bytesPerSecond === 'number' ? progress.bytesPerSecond : 0
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true;
    sendUpdaterEvent('update-downloaded', {
      version: info && info.version ? info.version : ''
    });

    setTimeout(() => {
      sendUpdaterEvent('installing-update');
      autoUpdater.quitAndInstall(false, true);
    }, 1200);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: DEFAULT_MIN_WIDTH,
    minHeight: DEFAULT_MIN_HEIGHT,
    frame: false,
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('set-trade-mode', (_event, enabled) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, enabled: false };
  }

  var next = !!enabled;
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setMinimumSize(DEFAULT_MIN_WIDTH, DEFAULT_MIN_HEIGHT);

  return { ok: true, enabled: next };
});

ipcMain.handle('set-always-on-top', (_event, enabled) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, enabled: false };
  }

  var next = !!enabled;
  mainWindow.setAlwaysOnTop(next, next ? 'screen-saver' : 'normal');
  return { ok: true, enabled: next };
});

ipcMain.handle('open-external-url', async (_event, url) => {
  var target = String(url || '').trim();
  if (!/^https?:\/\//i.test(target)) {
    return { ok: false, message: 'Only http and https links are allowed.' };
  }

  try {
    await shell.openExternal(target);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err && err.message ? err.message : 'Failed to open external link.'
    };
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-app-update', async () => {
  if (isDev) {
    return { ok: false, reason: 'dev-mode' };
  }
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err && err.message ? err.message : 'Update check failed.'
    };
  }
});

ipcMain.handle('download-app-update', async () => {
  if (isDev) {
    return { ok: false, reason: 'dev-mode' };
  }
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err && err.message ? err.message : 'Update download failed.'
    };
  }
});

ipcMain.handle('install-downloaded-update', () => {
  if (isDev || !updateDownloaded) {
    return { ok: false };
  }
  sendUpdaterEvent('installing-update');
  autoUpdater.quitAndInstall(false, true);
  return { ok: true };
});
