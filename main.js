const { app, BrowserWindow, ipcMain, shell, dialog, desktopCapturer, screen } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { autoUpdater } = require('electron-updater');
const { createWorker, PSM } = require('tesseract.js');

let mainWindow;
let relicOverlayWindow;
const DEFAULT_MIN_WIDTH = 900;
const DEFAULT_MIN_HEIGHT = 600;
const isDev = !app.isPackaged;
let updateDownloaded = false;
let ocrWorkerPromise = null;
let activeOcrProgressTarget = null;
let relicOverlayEnabled = false;
let relicOverlayTimer = null;
let relicOverlayScanning = false;
let relicOverlayLastHash = '';
let relicOverlayLastHashAt = 0;
let relicOverlayLastDetectionAt = 0;
let relicOverlayLastCaptureAt = 0;
let relicOverlayBurstUntil = 0;
let relicOverlayLogTimer = null;
let relicOverlayLogPath = '';
let relicOverlayLogOffset = 0;
let relicOverlayLogMissingNotified = false;
const PROFILE_FETCH_TIMEOUT_MS = 15000;
const PROFILE_REMOTE_FETCH_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours between successful Warframe profile calls.
const PROFILE_REMOTE_RETRY_COOLDOWN_MS = 15 * 60 * 1000; // Failed remote calls must cool down too.
const PROFILE_LOG_CONFIG_FILE = 'warframe-profile-log.json';
const PROFILE_CACHE_FILE = 'warframe-profile-cache.json';
const PROFILE_INTRINSIC_RANK_XP = 1500;
const PROFILE_NORMAL_STAR_CHART_XP_MAX = 27519;
const PROFILE_STEEL_PATH_XP_MAX = 27519;
const RELIC_OVERLAY_IDLE_SCAN_INTERVAL_MS = 4500;
const RELIC_OVERLAY_ACTIVE_SCAN_INTERVAL_MS = 450;
const RELIC_OVERLAY_DUPLICATE_SCAN_MS = 1800;
const RELIC_OVERLAY_MAX_CAPTURE_WIDTH = 1280;
const RELIC_OVERLAY_MAX_CAPTURE_HEIGHT = 720;
const RELIC_OVERLAY_HOLD_MS = 1800;
const RELIC_OVERLAY_TRIGGER_WINDOW_MS = 8000;
const RELIC_OVERLAY_LOG_POLL_INTERVAL_MS = 750;
const RELIC_OVERLAY_LOG_TAIL_BYTES = 64 * 1024;
const WARFRAME_PROCESS_NAMES = ['Warframe.x64.exe', 'Warframe.exe'];
const EXPORT_REGIONS_URL = 'https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/senpai/ExportRegions.json';
const JUNCTION_MASTERY_XP = 1000;
let regionMasteryCache = null;
let regionMasteryCacheFetchedAt = 0;
const REGION_MASTERY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function sendUpdaterEvent(type, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send('app-update-event', Object.assign({ type: type }, payload || {}));
}

function sendOcrProgress(payload) {
  if (!activeOcrProgressTarget || activeOcrProgressTarget.isDestroyed()) {
    return;
  }
  activeOcrProgressTarget.send('ocr-scan-progress', payload || {});
}

function sendRelicOverlayEvent(type, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('relic-overlay-event', Object.assign({ type }, payload || {}));
}

function sanitizeForInlineScript(payload) {
  return JSON.stringify(payload || {}).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function getDisplayForRelicOverlay(bounds) {
  if (bounds && Number.isFinite(Number(bounds.x)) && Number.isFinite(Number(bounds.y))) {
    return screen.getDisplayNearestPoint({
      x: Math.round(Number(bounds.x)),
      y: Math.round(Number(bounds.y))
    });
  }

  try {
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  } catch (err) {
    return screen.getPrimaryDisplay();
  }
}

function getDisplayCaptureSize(display) {
  const bounds = display && display.bounds ? display.bounds : { width: 1280, height: 720 };
  const scaleFactor = Number(display && display.scaleFactor) || 1;
  const rawWidth = Math.max(1, Math.round(bounds.width * scaleFactor));
  const rawHeight = Math.max(1, Math.round(bounds.height * scaleFactor));
  const downscale = Math.min(
    1,
    RELIC_OVERLAY_MAX_CAPTURE_WIDTH / rawWidth,
    RELIC_OVERLAY_MAX_CAPTURE_HEIGHT / rawHeight
  );
  return {
    width: Math.max(1, Math.round(rawWidth * downscale)),
    height: Math.max(1, Math.round(rawHeight * downscale))
  };
}

async function ensureRelicOverlayWindow(display) {
  const targetDisplay = display || screen.getPrimaryDisplay();
  const bounds = targetDisplay.bounds || { x: 0, y: 0, width: 1280, height: 720 };

  if (relicOverlayWindow && !relicOverlayWindow.isDestroyed()) {
    relicOverlayWindow.setBounds(bounds);
    return relicOverlayWindow;
  }

  relicOverlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    focusable: false,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  relicOverlayWindow.setIgnoreMouseEvents(true);
  relicOverlayWindow.setAlwaysOnTop(true, 'screen-saver');
  relicOverlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  try {
    relicOverlayWindow.setContentProtection(true);
  } catch (err) {
    // Best effort: prevents the overlay labels from being read by our own screen OCR on supported systems.
  }
  relicOverlayWindow.on('closed', () => {
    relicOverlayWindow = null;
  });

  await relicOverlayWindow.loadFile(path.join(__dirname, 'relic-overlay.html'));
  return relicOverlayWindow;
}

async function updateRelicOverlayWindow(payload) {
  const safePayload = payload || {};
  const display = getDisplayForRelicOverlay(safePayload.displayBounds);
  const overlay = await ensureRelicOverlayWindow(display);
  if (!overlay || overlay.isDestroyed()) return { ok: false };

  const labels = Array.isArray(safePayload.labels) ? safePayload.labels : [];
  const shouldShow = safePayload.detected === true && labels.length > 0 && relicOverlayEnabled;
  const script = 'window.renderRelicOverlay && window.renderRelicOverlay(' + sanitizeForInlineScript(safePayload) + ');';
  await overlay.webContents.executeJavaScript(script, true);

  if (shouldShow) {
    overlay.setBounds((display && display.bounds) || overlay.getBounds());
    overlay.showInactive();
  } else {
    overlay.hide();
  }

  return { ok: true, visible: shouldShow };
}

async function clearRelicOverlayWindow(message) {
  if (!relicOverlayWindow || relicOverlayWindow.isDestroyed()) return;
  try {
    await updateRelicOverlayWindow({
      detected: false,
      labels: [],
      message: message || ''
    });
  } catch (err) {
    relicOverlayWindow.hide();
  }
}

function getRelicOverlayTextSignature(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 600);
}

function isLikelyRelicRewardScreen(text, lines) {
  const normalized = getRelicOverlayTextSignature(text);
  if (/\bvoid\b.*\bfissure\b.*\brewards?\b/.test(normalized)) return true;
  if (/\bfissure\b.*\brewards?\b/.test(normalized)) return true;
  const rewardMatches = String(text || '').match(/(?:\bforma\s+blueprint\b|\bprime\b\s+(?:blueprint|chassis|neuroptics|systems|blade|barrel|receiver|stock|string|handle|hilt|grip|link|pouch|guard|gauntlet|cerebrum|carapace|wings|harness|fuselage|stars|disc|ornament|chain|head|boot|upper limb|lower limb)\b)/ig);
  if (rewardMatches && rewardMatches.length >= 2) return true;
  if (rewardMatches && rewardMatches.length >= 1 && Date.now() < relicOverlayBurstUntil) return true;
  const sourceLines = Array.isArray(lines) ? lines : [];
  let rewardLineCount = 0;
  for (const line of sourceLines) {
    const value = String(line && line.text ? line.text : '');
    if (/\bforma\s+blueprint\b/i.test(value) || (/\bprime\b/i.test(value) && /\b(blueprint|chassis|neuroptics|systems|blade|barrel|receiver|stock|string|handle|hilt|grip|link|pouch|guard|gauntlet|cerebrum|carapace|wings|harness|fuselage|stars)\b/i.test(value))) {
      rewardLineCount += 1;
    }
  }
  return rewardLineCount >= 2 && /\b(relic|opened|owned|reward|fissure|prime|forma)\b/.test(normalized);
}

async function captureRelicOverlayScreen() {
  const display = getDisplayForRelicOverlay();
  const captureSize = getDisplayCaptureSize(display);
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: captureSize
  });
  const displayId = String(display && display.id ? display.id : '');
  let source = sources.find((entry) => String(entry.display_id || '') === displayId);
  if (!source) {
    source = sources.find((entry) => String(entry.id || '').indexOf(displayId) !== -1) || sources[0];
  }
  if (!source || !source.thumbnail || source.thumbnail.isEmpty()) {
    throw new Error('Screen capture is unavailable. Check OS screen recording permission or use borderless/windowed mode.');
  }

  return {
    display,
    image: source.thumbnail,
    imageSize: source.thumbnail.getSize()
  };
}

function createRelicOverlayOcrRegion(image) {
  const size = image && image.getSize ? image.getSize() : { width: 0, height: 0 };
  const width = Math.max(1, Number(size.width) || 1);
  const height = Math.max(1, Number(size.height) || 1);
  const crop = {
    x: Math.max(0, Math.round(width * 0.235)),
    y: Math.max(0, Math.round(height * 0.315)),
    width: Math.max(1, Math.round(width * 0.53)),
    height: Math.max(1, Math.round(height * 0.18))
  };

  if (crop.x + crop.width > width) crop.width = width - crop.x;
  if (crop.y + crop.height > height) crop.height = height - crop.y;

  const targetWidth = Math.min(1150, Math.max(900, crop.width * 1.7));
  const scale = targetWidth / crop.width;
  const targetHeight = Math.max(1, Math.round(crop.height * scale));
  const prepared = image
    .crop(crop)
    .resize({
      width: Math.round(targetWidth),
      height: targetHeight,
      quality: 'best'
    });

  return {
    image: prepared,
    offsetX: crop.x,
    offsetY: crop.y,
    scale
  };
}

function isRelicOverlayRewardLogText(text) {
  return /(?:Got rewards|Pause countdown done|Relic rewards initialized|ProjectionRewardChoice)/i.test(String(text || ''));
}

function isRelicOverlayRewardEndLogText(text) {
  return /(?:Relic timer closed|MatchingService::EndSession)/i.test(String(text || ''));
}

function getRelicOverlayScanDelay() {
  return Date.now() < relicOverlayBurstUntil
    ? RELIC_OVERLAY_ACTIVE_SCAN_INTERVAL_MS
    : RELIC_OVERLAY_IDLE_SCAN_INTERVAL_MS;
}

function scheduleRelicOverlayScan(delayMs) {
  if (!relicOverlayEnabled) return;
  if (relicOverlayTimer) {
    clearTimeout(relicOverlayTimer);
    relicOverlayTimer = null;
  }

  relicOverlayTimer = setTimeout(async () => {
    relicOverlayTimer = null;
    try {
      await scanRelicOverlayOnce();
    } catch (err) {
      sendRelicOverlayEvent('error', {
        ok: false,
        message: err && err.message ? err.message : 'Relic overlay scan failed.'
      });
    }

    if (relicOverlayEnabled) {
      scheduleRelicOverlayScan(getRelicOverlayScanDelay());
    }
  }, Math.max(0, Number(delayMs) || 0));
}

function triggerRelicOverlayBurst(reason) {
  if (!relicOverlayEnabled) return;
  relicOverlayBurstUntil = Math.max(relicOverlayBurstUntil, Date.now() + RELIC_OVERLAY_TRIGGER_WINDOW_MS);
  relicOverlayLastHash = '';
  relicOverlayLastHashAt = 0;
  sendRelicOverlayEvent('status', {
    enabled: true,
    message: reason || 'Reward screen detected in EE.log. Reading platinum values...'
  });
  scheduleRelicOverlayScan(80);
}

async function readRelicOverlayLogChunk(filePath, start, end) {
  const length = Math.max(0, Math.min(RELIC_OVERLAY_LOG_TAIL_BYTES, end - start));
  if (!filePath || length <= 0) return '';

  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const read = await handle.read(buffer, 0, length, start);
    return buffer.subarray(0, read.bytesRead || 0).toString('utf8');
  } finally {
    await handle.close();
  }
}

async function pollRelicOverlayLog() {
  if (!relicOverlayEnabled) return;

  try {
    const logInfo = await findWarframeLog();
    if (!logInfo || !logInfo.path) {
      if (!relicOverlayLogMissingNotified) {
        relicOverlayLogMissingNotified = true;
        sendRelicOverlayEvent('status', {
          enabled: true,
          message: 'EE.log not found. Overlay is using slower screen fallback scanning.'
        });
      }
      return;
    }

    const currentPath = path.normalize(logInfo.path);
    if (currentPath !== relicOverlayLogPath) {
      relicOverlayLogPath = currentPath;
      relicOverlayLogOffset = logInfo.size;
      relicOverlayLogMissingNotified = false;
      sendRelicOverlayEvent('status', {
        enabled: true,
        message: 'Watching EE.log for Void Fissure rewards...'
      });
      return;
    }

    if (logInfo.size < relicOverlayLogOffset) {
      relicOverlayLogOffset = 0;
    }

    if (logInfo.size <= relicOverlayLogOffset) return;

    const start = Math.max(relicOverlayLogOffset, logInfo.size - RELIC_OVERLAY_LOG_TAIL_BYTES);
    const chunk = await readRelicOverlayLogChunk(currentPath, start, logInfo.size);
    relicOverlayLogOffset = logInfo.size;

    if (isRelicOverlayRewardEndLogText(chunk)) {
      relicOverlayBurstUntil = 0;
      relicOverlayLastHash = '';
      relicOverlayLastHashAt = 0;
      relicOverlayLastDetectionAt = 0;
      await clearRelicOverlayWindow('Watching EE.log for Void Fissure rewards...');
      sendRelicOverlayEvent('status', {
        enabled: true,
        message: 'Reward screen closed. Watching EE.log for the next relic.'
      });
    } else if (isRelicOverlayRewardLogText(chunk)) {
      triggerRelicOverlayBurst('Void Fissure reward screen detected. Reading platinum values...');
    }
  } catch (err) {
    if (!relicOverlayLogMissingNotified) {
      relicOverlayLogMissingNotified = true;
      sendRelicOverlayEvent('status', {
        enabled: true,
        message: 'Could not read EE.log, using slower screen fallback scanning.'
      });
    }
  }
}

async function startRelicOverlayLogWatcher() {
  if (relicOverlayLogTimer) {
    clearInterval(relicOverlayLogTimer);
    relicOverlayLogTimer = null;
  }

  relicOverlayLogPath = '';
  relicOverlayLogOffset = 0;
  relicOverlayLogMissingNotified = false;
  await pollRelicOverlayLog();
  relicOverlayLogTimer = setInterval(() => {
    pollRelicOverlayLog().catch(() => {});
  }, RELIC_OVERLAY_LOG_POLL_INTERVAL_MS);
}

function stopRelicOverlayLogWatcher() {
  if (relicOverlayLogTimer) {
    clearInterval(relicOverlayLogTimer);
    relicOverlayLogTimer = null;
  }
  relicOverlayLogPath = '';
  relicOverlayLogOffset = 0;
  relicOverlayLogMissingNotified = false;
}

async function scanRelicOverlayOnce() {
  if (!relicOverlayEnabled || relicOverlayScanning) return;
  relicOverlayScanning = true;
  relicOverlayLastCaptureAt = Date.now();

  try {
    const capture = await captureRelicOverlayScreen();
    const ocrRegion = createRelicOverlayOcrRegion(capture.image);
    const imageHash = crypto.createHash('sha1').update(ocrRegion.image.toBitmap()).digest('hex');
    const now = Date.now();

    if (imageHash === relicOverlayLastHash && (now - relicOverlayLastHashAt) < RELIC_OVERLAY_DUPLICATE_SCAN_MS) {
      return;
    }
    relicOverlayLastHash = imageHash;
    relicOverlayLastHashAt = now;

    const worker = await getOcrWorker();
    const result = await worker.recognize(ocrRegion.image.toPNG(), {
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1'
    });
    const data = result && result.data ? result.data : {};
    const lines = transformOcrLines(extractOcrLines(data), ocrRegion);
    const text = String(data.text || lines.map((line) => line.text).join('\n'));
    const detected = isLikelyRelicRewardScreen(text, lines);
    if (detected) relicOverlayLastDetectionAt = now;

    sendRelicOverlayEvent('scan', {
      ok: true,
      detected,
      text,
      lines,
      imageSize: capture.imageSize,
      displayBounds: capture.display && capture.display.bounds ? capture.display.bounds : null,
      scaleFactor: capture.display && capture.display.scaleFactor ? capture.display.scaleFactor : 1,
      capturedAt: now
    });

    if (!detected && (!relicOverlayLastDetectionAt || Date.now() - relicOverlayLastDetectionAt > RELIC_OVERLAY_HOLD_MS)) {
      await clearRelicOverlayWindow('Watching EE.log for Void Fissure rewards...');
    }
  } catch (err) {
    sendRelicOverlayEvent('error', {
      ok: false,
      message: err && err.message ? err.message : 'Relic overlay scan failed.'
    });
    if (!relicOverlayLastDetectionAt || Date.now() - relicOverlayLastDetectionAt > RELIC_OVERLAY_HOLD_MS) {
      await clearRelicOverlayWindow('');
    }
  } finally {
    relicOverlayScanning = false;
  }
}

async function startRelicOverlayLoop() {
  if (relicOverlayTimer) {
    clearTimeout(relicOverlayTimer);
    relicOverlayTimer = null;
  }
  relicOverlayBurstUntil = 0;
  relicOverlayLastHash = '';
  relicOverlayLastHashAt = 0;
  relicOverlayLastDetectionAt = 0;
  await startRelicOverlayLogWatcher();
  scheduleRelicOverlayScan(250);
}

async function stopRelicOverlayLoop() {
  relicOverlayEnabled = false;
  if (relicOverlayTimer) {
    clearTimeout(relicOverlayTimer);
    relicOverlayTimer = null;
  }
  stopRelicOverlayLogWatcher();
  relicOverlayLastHash = '';
  relicOverlayLastHashAt = 0;
  relicOverlayLastDetectionAt = 0;
  relicOverlayBurstUntil = 0;
  await clearRelicOverlayWindow('');
  if (relicOverlayWindow && !relicOverlayWindow.isDestroyed()) {
    relicOverlayWindow.close();
    relicOverlayWindow = null;
  }
}

function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = createWorker('eng', 1, {
      cachePath: path.join(app.getPath('userData'), 'tesseract-cache'),
      logger: (message) => {
        if (!message || typeof message !== 'object') return;
        sendOcrProgress({
          status: message.status || '',
          progress: typeof message.progress === 'number' ? message.progress : 0
        });
      }
    }).catch((err) => {
      ocrWorkerPromise = null;
      throw err;
    });
  }

  return ocrWorkerPromise;
}

function dataUrlToBuffer(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i);
  if (!match) {
    throw new Error('Invalid image data.');
  }
  return Buffer.from(match[1], 'base64');
}

function normalizeOcrBbox(box) {
  if (!box || typeof box !== 'object') return null;
  const x0 = Number(box.x0);
  const y0 = Number(box.y0);
  const x1 = Number(box.x1);
  const y1 = Number(box.y1);
  if (![x0, y0, x1, y1].every((value) => Number.isFinite(value))) return null;
  if (x1 <= x0 || y1 <= y0) return null;
  return { x0, y0, x1, y1 };
}

function transformOcrBbox(box, transform) {
  const bbox = normalizeOcrBbox(box);
  if (!bbox) return null;
  const scale = Number(transform && transform.scale) || 1;
  const offsetX = Number(transform && transform.offsetX) || 0;
  const offsetY = Number(transform && transform.offsetY) || 0;
  return {
    x0: bbox.x0 / scale + offsetX,
    y0: bbox.y0 / scale + offsetY,
    x1: bbox.x1 / scale + offsetX,
    y1: bbox.y1 / scale + offsetY
  };
}

function transformOcrLines(lines, transform) {
  if (!Array.isArray(lines)) return [];
  if (!transform) return lines;
  return lines.map((line) => {
    const words = Array.isArray(line && line.words) ? line.words : [];
    return Object.assign({}, line, {
      bbox: transformOcrBbox(line && line.bbox, transform),
      words: words.map((word) => Object.assign({}, word, {
        bbox: transformOcrBbox(word && word.bbox, transform)
      }))
    });
  });
}

function extractOcrWords(line) {
  const words = Array.isArray(line && line.words) ? line.words : [];
  return words
    .map((word) => {
      const text = String(word && word.text ? word.text : '').trim();
      if (!text) return null;
      const bbox = normalizeOcrBbox(word.bbox);
      if (bbox && (bbox.x1 - bbox.x0 < 3 || bbox.y1 - bbox.y0 < 6)) return null;
      return {
        text,
        confidence: typeof word.confidence === 'number' ? word.confidence : 0,
        bbox
      };
    })
    .filter(Boolean);
}

function extractOcrLines(data) {
  const output = [];
  const pushLine = (line) => {
    const text = String(line && line.text ? line.text : '').trim();
    if (!text) return;
    const bbox = normalizeOcrBbox(line.bbox);
    if (bbox && (bbox.x1 - bbox.x0 < 6 || bbox.y1 - bbox.y0 < 8)) return;
    output.push({
      text,
      confidence: typeof line.confidence === 'number' ? line.confidence : 0,
      bbox,
      words: extractOcrWords(line)
    });
  };

  const directLines = Array.isArray(data && data.lines) ? data.lines : [];
  for (const line of directLines) {
    pushLine(line);
  }

  if (output.length > 0) {
    return output;
  }

  const blocks = Array.isArray(data && data.blocks) ? data.blocks : [];

  for (const block of blocks) {
    const paragraphs = Array.isArray(block && block.paragraphs) ? block.paragraphs : [];
    for (const paragraph of paragraphs) {
      const lines = Array.isArray(paragraph && paragraph.lines) ? paragraph.lines : [];
      for (const line of lines) {
        pushLine(line);
      }
    }
  }

  if (output.length > 0) {
    return output;
  }

  const text = String(data && data.text ? data.text : '');
  return text
    .split(/\r?\n/)
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .map((line) => ({ text: line, confidence: 0 }));
}

function execFileAsync(command, args, timeoutMs) {
  return new Promise((resolve) => {
    execFile(command, args || [], { timeout: timeoutMs || 5000, windowsHide: true }, (error, stdout) => {
      resolve({
        ok: !error,
        stdout: String(stdout || ''),
        message: error && error.message ? error.message : ''
      });
    });
  });
}

function parseTasklistCsv(output) {
  return String(output || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      var firstCell = line.match(/^"([^"]+)"/);
      return firstCell ? firstCell[1] : line.split(',')[0];
    })
    .filter((name) => /\.exe$/i.test(name));
}

async function detectWarframeProcess() {
  if (process.platform === 'win32') {
    for (const processName of WARFRAME_PROCESS_NAMES) {
      const result = await execFileAsync('tasklist.exe', ['/FI', `IMAGENAME eq ${processName}`, '/FO', 'CSV', '/NH'], 5000);
      const matches = parseTasklistCsv(result.stdout);
      if (matches.some((name) => name.toLowerCase() === processName.toLowerCase())) {
        return { running: true, name: processName };
      }
    }

    return { running: false, name: '' };
  }

  const result = await execFileAsync('ps', ['-A', '-o', 'comm='], 5000);
  const processNames = String(result.stdout || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const match = processNames.find((name) => /^Warframe/i.test(path.basename(name)));
  return match ? { running: true, name: match } : { running: false, name: '' };
}

function uniquePaths(paths) {
  const seen = new Set();
  const output = [];
  for (const candidate of paths) {
    if (!candidate) continue;
    const normalized = path.normalize(candidate);
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function getDefaultWarframeLogPath() {
  const homeDir = app.getPath('home');

  if (process.platform === 'win32') {
    if (process.env.LOCALAPPDATA) {
      return path.join(process.env.LOCALAPPDATA, 'Warframe', 'EE.log');
    }
    return path.join(homeDir, 'AppData', 'Local', 'Warframe', 'EE.log');
  }

  if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'CrossOver', 'Bottles', 'Warframe', 'drive_c', 'users', 'crossover', 'AppData', 'Local', 'Warframe', 'EE.log');
  }

  return path.join(homeDir, '.steam', 'steam', 'steamapps', 'compatdata', '230410', 'pfx', 'drive_c', 'users', 'steamuser', 'AppData', 'Local', 'Warframe', 'EE.log');
}

function getWarframeLogCandidates() {
  const candidates = [getDefaultWarframeLogPath()];
  const homeDir = app.getPath('home');

  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Warframe', 'EE.log'));
  }

  if (homeDir) {
    candidates.push(path.join(homeDir, 'AppData', 'Local', 'Warframe', 'EE.log'));
    candidates.push(path.join(homeDir, '.steam', 'steam', 'steamapps', 'compatdata', '230410', 'pfx', 'drive_c', 'users', 'steamuser', 'AppData', 'Local', 'Warframe', 'EE.log'));
    candidates.push(path.join(homeDir, '.local', 'share', 'Steam', 'steamapps', 'compatdata', '230410', 'pfx', 'drive_c', 'users', 'steamuser', 'AppData', 'Local', 'Warframe', 'EE.log'));
    candidates.push(path.join(homeDir, 'Library', 'Application Support', 'CrossOver', 'Bottles', 'Warframe', 'drive_c', 'users', 'crossover', 'AppData', 'Local', 'Warframe', 'EE.log'));
  }

  return uniquePaths(candidates);
}

function getProfileLogConfigPath() {
  return path.join(app.getPath('userData'), PROFILE_LOG_CONFIG_FILE);
}

function getProfileCachePath() {
  return path.join(app.getPath('userData'), PROFILE_CACHE_FILE);
}

async function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallbackValue;
  } catch (err) {
    return fallbackValue;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function normalizeConfiguredLogPath(value) {
  const rawPath = String(value || '').trim();
  return rawPath ? path.normalize(rawPath) : '';
}

function normalizeManualAccountId(value) {
  const accountId = String(value || '').trim();
  if (!accountId) return '';
  if (!/^(?:[a-f0-9]{16,32}|[0-9]{8,})$/i.test(accountId)) {
    throw new Error('Enter a valid Warframe account ID (at least 8 digits, or a 16–32 character hexadecimal ID).');
  }
  return accountId;
}

async function readProfileLogConfig() {
  const config = await readJsonFile(getProfileLogConfigPath(), {});
  return {
    customPath: normalizeConfiguredLogPath(config && config.customPath),
    manualAccountId: normalizeManualAccountId(config && config.manualAccountId)
  };
}

async function getConfiguredWarframeLogPath() {
  const config = await readProfileLogConfig();
  return config.customPath || '';
}

async function writeProfileLogConfig(patch) {
  const current = await readProfileLogConfig();
  const next = Object.assign({}, current, patch || {});
  await writeJsonFile(getProfileLogConfigPath(), {
    customPath: normalizeConfiguredLogPath(next.customPath),
    manualAccountId: normalizeManualAccountId(next.manualAccountId),
    updatedAt: Date.now()
  });
}

async function setConfiguredWarframeLogPath(filePath) {
  const customPath = normalizeConfiguredLogPath(filePath);
  if (!customPath) {
    throw new Error('No EE.log path was selected.');
  }

  const stat = await fs.stat(customPath);
  if (!stat.isFile()) {
    throw new Error('Selected path is not a file.');
  }

  await writeProfileLogConfig({ customPath });
  return getWarframeLogConfigSummary();
}

async function clearConfiguredWarframeLogPath() {
  await writeProfileLogConfig({ customPath: '' });
  return getWarframeLogConfigSummary();
}

async function setManualProfileAccountId(accountId) {
  await writeProfileLogConfig({ manualAccountId: accountId });
  return getWarframeLogConfigSummary();
}

async function clearManualProfileAccountId() {
  await writeProfileLogConfig({ manualAccountId: '' });
  return getWarframeLogConfigSummary();
}

async function pathExistsAsFile(filePath) {
  if (!filePath) return false;
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch (err) {
    return false;
  }
}

async function getWarframeLogConfigSummary() {
  const config = await readProfileLogConfig();
  const defaultPath = getDefaultWarframeLogPath();
  const configuredPath = config.customPath || '';
  const activePath = configuredPath || defaultPath;

  return {
    ok: true,
    defaultPath,
    configuredPath,
    activePath,
    usingCustomPath: !!configuredPath,
    manualAccountId: config.manualAccountId,
    usingManualAccountId: !!config.manualAccountId,
    exists: await pathExistsAsFile(activePath)
  };
}

async function findWarframeLog() {
  const configuredPath = await getConfiguredWarframeLogPath();
  const candidates = configuredPath ? [configuredPath] : getWarframeLogCandidates();
  const found = [];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (!stat.isFile()) continue;
      found.push({ path: candidate, mtimeMs: stat.mtimeMs, size: stat.size });
    } catch (err) {
      // Missing candidates are expected on machines without Warframe installed in that location.
    }
  }

  found.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return found[0] || null;
}

async function readWarframeLogText(logInfo) {
  const maxWholeFileBytes = 32 * 1024 * 1024;
  const edgeBytes = 8 * 1024 * 1024;
  const filePath = logInfo && logInfo.path ? logInfo.path : '';
  if (!filePath) return '';

  if (logInfo.size <= maxWholeFileBytes) {
    return fs.readFile(filePath, 'utf8');
  }

  const handle = await fs.open(filePath, 'r');
  try {
    const head = Buffer.alloc(edgeBytes);
    const tail = Buffer.alloc(edgeBytes);
    await handle.read(head, 0, edgeBytes, 0);
    await handle.read(tail, 0, edgeBytes, Math.max(0, logInfo.size - edgeBytes));
    return head.toString('utf8') + '\n' + tail.toString('utf8');
  } finally {
    await handle.close();
  }
}

function collectRegexMatches(text, regex) {
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) matches.push(String(match[1]).trim());
  }
  return matches;
}

function extractAccountIdFromLog(text) {
  const idPattern = '([a-f0-9]{16,32}|[0-9]{8,})';
  const patterns = [
    new RegExp('AccountId:\\s*' + idPattern, 'gi'),
    new RegExp('Logged in[^\\r\\n]*\\(' + idPattern + '\\)', 'gi'),
    new RegExp('playerId\\s*[=:]\\s*' + idPattern, 'gi'),
    new RegExp('account(?:\\s*id)?\\s*[=:]\\s*' + idPattern, 'gi')
  ];
  const matches = [];

  for (const pattern of patterns) {
    matches.push(...collectRegexMatches(text, pattern));
  }

  const validMatches = matches.filter((value) => value && !/^0+$/.test(value));
  return validMatches.length > 0 ? validMatches[validMatches.length - 1] : '';
}

function extractDisplayNameFromLog(text) {
  const names = collectRegexMatches(text, /Player name changed to\s+(.+?)(?:\s+Clan:|\r?\n|$)/gi)
    .map((name) => name.replace(/\s+AccountId:.*$/i, '').trim())
    .filter(Boolean);
  return names.length > 0 ? names[names.length - 1] : '';
}

function normalizeProfileXpEntry(rawEntry, source) {
  if (!rawEntry || typeof rawEntry !== 'object') return null;
  const itemType = String(rawEntry.ItemType || rawEntry.itemType || rawEntry.type || rawEntry.uniqueName || '').trim();
  if (!itemType) return null;

  const rawXp = rawEntry.XP ?? rawEntry.xp ?? rawEntry.Experience ?? rawEntry.experience ?? 0;
  const xp = Number(rawXp);

  return {
    itemType,
    xp: Number.isFinite(xp) ? xp : 0,
    source: source || 'profile'
  };
}

function mergeProfileXpEntry(entry, map) {
  if (!entry || !entry.itemType) return;
  const key = entry.itemType.toLowerCase();
  const existing = map.get(key);
  if (!existing || entry.xp > existing.xp) {
    map.set(key, entry);
  }
}

function collectNamedArrayEntries(root, keyName, map, source, depth) {
  if (!root || depth > 8) return;

  if (Array.isArray(root)) {
    for (const entry of root) {
      collectNamedArrayEntries(entry, keyName, map, source, depth + 1);
    }
    return;
  }

  if (typeof root !== 'object') return;

  for (const [key, value] of Object.entries(root)) {
    if (String(key).toLowerCase() === String(keyName).toLowerCase() && Array.isArray(value)) {
      for (const entry of value) {
        mergeProfileXpEntry(normalizeProfileXpEntry(entry, source), map);
      }
      continue;
    }
    collectNamedArrayEntries(value, keyName, map, source, depth + 1);
  }
}

function collectProfileStatsWeaponEntries(profileData, map) {
  const stats = profileData && typeof profileData === 'object' ? (profileData.Stats || profileData.stats) : null;
  if (!stats || typeof stats !== 'object') return;

  const weaponLists = [
    stats.Weapons,
    stats.weapons
  ].filter(Array.isArray);

  for (const weapons of weaponLists) {
    for (const entry of weapons) {
      mergeProfileXpEntry(normalizeProfileXpEntry(entry, 'statsWeapons'), map);
    }
  }
}

function collectInlineProfileXpEntries(root, map, depth) {
  if (!root || depth > 10) return;

  if (Array.isArray(root)) {
    for (const entry of root) {
      collectInlineProfileXpEntries(entry, map, depth + 1);
    }
    return;
  }

  if (typeof root !== 'object') return;

  const itemType = root.ItemType || root.itemType || root.uniqueName || root.UniqueName || root.TypeName || root.typeName;
  const xp = root.XP ?? root.xp ?? root.Experience ?? root.experience;
  if (itemType && xp !== undefined) {
    mergeProfileXpEntry(normalizeProfileXpEntry({
      ItemType: itemType,
      XP: xp
    }, 'inlineProfileXp'), map);
  }

  for (const value of Object.values(root)) {
    collectInlineProfileXpEntries(value, map, depth + 1);
  }
}

function extractProfileXpEntries(profileData) {
  const map = new Map();
  collectNamedArrayEntries(profileData, 'XPInfo', map, 'xpInfo', 0);
  collectProfileStatsWeaponEntries(profileData, map);
  collectInlineProfileXpEntries(profileData, map, 0);
  return Array.from(map.values()).sort((a, b) => a.itemType.localeCompare(b.itemType));
}

function toProfileExtraLookupKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function getProfileMasteryExtraKey(itemType) {
  const key = toProfileExtraLookupKey(itemType);
  if (!key) return '';
  const looksLikeXpField = key.includes('xp') || key.includes('experience') || key.includes('mastery');
  if (!looksLikeXpField && (key.includes('completed') || key.includes('cleared') || key.includes('count'))) return '';

  if ((key.includes('steel') && (key.includes('mission') || key.includes('star chart') || key.includes('node'))) || key.includes('steel path')) return 'steelPathXp';
  if ((key.includes('hard mode') || key.includes('hardmode')) && (key.includes('mission') || key.includes('node'))) return 'steelPathXp';
  if ((key.includes('mission') || key.includes('star chart') || key.includes('starchart') || key.includes('node')) && !key.includes('steel') && !key.includes('hardmode') && !key.includes('hard mode')) return 'normalStarChartXp';
  if ((key.includes('railjack') || key.includes('rail jack') || key.includes('crewship')) && (key.includes('intrinsic') || key.includes('skill') || looksLikeXpField)) return 'railjackRanks';
  if ((key.includes('duviri') || key.includes('drifter')) && (key.includes('intrinsic') || key.includes('skill') || looksLikeXpField)) return 'duviriRanks';
  return '';
}

function recordProfileMasteryExtra(extras, found, key, value, isRankValue) {
  if (!key) return;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return;

  found.add(key);
  if (key === 'railjackRanks' || key === 'duviriRanks') {
    const ranks = isRankValue ? numeric : Math.floor(numeric / PROFILE_INTRINSIC_RANK_XP);
    extras[key] = Math.max(extras[key], Math.floor(ranks));
  } else if (key === 'normalStarChartXp') {
    extras[key] = Math.max(extras[key], Math.min(Math.floor(numeric), PROFILE_NORMAL_STAR_CHART_XP_MAX));
  } else if (key === 'steelPathXp') {
    extras[key] = Math.max(extras[key], Math.min(Math.floor(numeric), PROFILE_STEEL_PATH_XP_MAX));
  } else {
    extras[key] = Math.max(extras[key], Math.floor(numeric));
  }
}

async function fetchRegionMasteryMap() {
  if (regionMasteryCache && Date.now() - regionMasteryCacheFetchedAt < REGION_MASTERY_CACHE_TTL_MS) {
    return regionMasteryCache;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROFILE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(EXPORT_REGIONS_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Warframe Companion App'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const regions = await response.json();
    const masteryMap = new Map();
    for (const [tag, region] of Object.entries(regions || {})) {
      const rawXp = Number(region && region.masteryExp);
      const missionType = String(region && region.missionType ? region.missionType : '');
      masteryMap.set(String(tag), {
        masteryExp: Number.isFinite(rawXp) && rawXp > 0 ? Math.floor(rawXp) : 0,
        missionType
      });
    }

    regionMasteryCache = masteryMap;
    regionMasteryCacheFetchedAt = Date.now();
    return masteryMap;
  } finally {
    clearTimeout(timeout);
  }
}

function getPrimaryProfileResult(profileData) {
  return Array.isArray(profileData && profileData.Results) ? profileData.Results[0] : null;
}

function getProfileMissionMasteryValue(mission, regionInfo) {
  if (!mission || Number(mission.Completes || mission.completes || 0) <= 0) return 0;

  const tag = String(mission.Tag || mission.tag || '');
  const missionType = String(regionInfo && regionInfo.missionType ? regionInfo.missionType : '');
  const isJunction = /junction/i.test(tag) || missionType === 'MT_JUNCTION';
  const baseXp = Number(regionInfo && regionInfo.masteryExp);
  return (Number.isFinite(baseXp) && baseXp > 0 ? Math.floor(baseXp) : 0) + (isJunction ? JUNCTION_MASTERY_XP : 0);
}

async function applyProfileMissionMasteryExtras(profileData, extras, found) {
  const profile = getPrimaryProfileResult(profileData);
  const missions = Array.isArray(profile && profile.Missions) ? profile.Missions : [];
  if (missions.length === 0) return;

  let masteryMap;
  try {
    masteryMap = await fetchRegionMasteryMap();
  } catch (err) {
    return;
  }

  let normalStarChartXp = 0;
  let steelPathXp = 0;

  for (const mission of missions) {
    const tag = String(mission && (mission.Tag || mission.tag) ? (mission.Tag || mission.tag) : '');
    const regionInfo = masteryMap.get(tag) || null;
    const missionXp = getProfileMissionMasteryValue(mission, regionInfo);
    if (missionXp <= 0) continue;

    normalStarChartXp += missionXp;
    if (Number(mission.Tier || mission.tier || 0) >= 1) {
      steelPathXp += missionXp;
    }
  }

  recordProfileMasteryExtra(extras, found, 'normalStarChartXp', normalStarChartXp, false);
  recordProfileMasteryExtra(extras, found, 'steelPathXp', steelPathXp, false);
}

function applyProfileSkillMasteryExtras(profileData, extras, found) {
  const profile = getPrimaryProfileResult(profileData);
  const skills = profile && profile.PlayerSkills && typeof profile.PlayerSkills === 'object'
    ? profile.PlayerSkills
    : null;
  if (!skills) return;

  const railjackSkillKeys = [
    'LPS_COMMAND',
    'LPS_ENGINEERING',
    'LPS_GUNNERY',
    'LPS_PILOTING',
    'LPS_TACTICAL'
  ];
  const duviriSkillKeys = [
    'LPS_DRIFT_RIDING',
    'LPS_DRIFT_COMBAT',
    'LPS_DRIFT_ENDURANCE',
    'LPS_DRIFT_OPPORTUNITY'
  ];

  const railjackRanks = railjackSkillKeys.reduce((sum, key) => sum + Math.max(0, Math.floor(Number(skills[key]) || 0)), 0);
  const duviriRanks = duviriSkillKeys.reduce((sum, key) => sum + Math.max(0, Math.floor(Number(skills[key]) || 0)), 0);

  recordProfileMasteryExtra(extras, found, 'railjackRanks', railjackRanks, true);
  recordProfileMasteryExtra(extras, found, 'duviriRanks', duviriRanks, true);
}

function collectProfileMasteryExtras(root, extras, found, depth) {
  if (!root || depth > 10) return;

  if (Array.isArray(root)) {
    for (const entry of root) {
      collectProfileMasteryExtras(entry, extras, found, depth + 1);
    }
    return;
  }

  if (typeof root !== 'object') return;

  const label = root.ItemType || root.itemType || root.type || root.Name || root.name || root.Label || root.label || root.title || '';
  const labelKey = getProfileMasteryExtraKey(label);
  if (labelKey) {
    const xpValue = root.XP ?? root.xp ?? root.Experience ?? root.experience ?? root.Mastery ?? root.mastery;
    recordProfileMasteryExtra(extras, found, labelKey, xpValue, false);
  }

  for (const [rawKey, value] of Object.entries(root)) {
    const key = String(rawKey || '');
    const extraKey = getProfileMasteryExtraKey(key);
    if (extraKey && typeof value !== 'object') {
      const lookupKey = toProfileExtraLookupKey(key);
      const isRankValue = lookupKey.includes('rank') || lookupKey.includes('level');
      recordProfileMasteryExtra(extras, found, extraKey, value, isRankValue);
    }
    collectProfileMasteryExtras(value, extras, found, depth + 1);
  }
}

async function extractProfileMasteryExtras(profileData, xpInfo) {
  const extras = {
    normalStarChartXp: 0,
    steelPathXp: 0,
    railjackRanks: 0,
    duviriRanks: 0,
    foundKeys: []
  };
  const found = new Set();

  for (const entry of Array.isArray(xpInfo) ? xpInfo : []) {
    const key = getProfileMasteryExtraKey(entry && entry.itemType);
    recordProfileMasteryExtra(extras, found, key, entry && entry.xp, false);
  }
  collectProfileMasteryExtras(profileData, extras, found, 0);
  await applyProfileMissionMasteryExtras(profileData, extras, found);
  applyProfileSkillMasteryExtras(profileData, extras, found);

  extras.foundKeys = Array.from(found);
  return extras;
}

function extractProfileSummary(profileData, fallbackDisplayName) {
  const profile = getPrimaryProfileResult(profileData);
  return {
    displayName: String((profile && profile.DisplayName) || fallbackDisplayName || '').trim(),
    masteryRank: Number.isFinite(Number(profile && profile.PlayerLevel)) ? Number(profile.PlayerLevel) : null
  };
}

function getProfileAccountCacheKey(accountId) {
  return crypto.createHash('sha256').update(String(accountId || '')).digest('hex');
}

async function readProfileCacheState() {
  const state = await readJsonFile(getProfileCachePath(), { entries: {} });
  if (!state.entries || typeof state.entries !== 'object') {
    state.entries = {};
  }
  return state;
}

async function writeProfileCacheState(state) {
  await writeJsonFile(getProfileCachePath(), Object.assign({ entries: {} }, state || {}));
}

async function getProfileCacheEntry(accountId) {
  const key = getProfileAccountCacheKey(accountId);
  if (!key) return null;
  const state = await readProfileCacheState();
  return state.entries[key] || null;
}

function createCacheableProfileResult(result) {
  const cached = Object.assign({}, result || {});
  delete cached.process;
  delete cached.logPath;
  delete cached.logUpdatedAt;
  delete cached.endpoint;
  delete cached.cacheControl;
  delete cached.expires;
  delete cached.cached;
  delete cached.cacheAgeMs;
  return cached;
}

async function updateProfileCacheEntry(accountId, patch) {
  const key = getProfileAccountCacheKey(accountId);
  if (!key) return;
  const state = await readProfileCacheState();
  const previous = state.entries[key] || {};
  state.entries[key] = Object.assign({}, previous, patch || {}, {
    accountHash: key,
    updatedAt: Date.now()
  });
  await writeProfileCacheState(state);
}

async function saveProfileCacheAttempt(accountId, attemptedAt) {
  await updateProfileCacheEntry(accountId, {
    lastAttemptAt: attemptedAt || Date.now()
  });
}

async function saveProfileCacheFailure(accountId, failedAt, message) {
  await updateProfileCacheEntry(accountId, {
    lastAttemptAt: failedAt || Date.now(),
    lastError: String(message || 'Profile fetch failed.')
  });
}

async function saveProfileCacheResult(accountId, result) {
  const fetchedAt = Number(result && result.fetchedAt) || Date.now();
  await updateProfileCacheEntry(accountId, {
    fetchedAt,
    lastAttemptAt: fetchedAt,
    lastError: '',
    result: createCacheableProfileResult(result)
  });
}

function formatCooldownMs(ms) {
  const totalMinutes = Math.max(1, Math.ceil(Number(ms || 0) / 60000));
  if (totalMinutes < 60) return totalMinutes + ' minute' + (totalMinutes === 1 ? '' : 's');
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours + ' hour' + (hours === 1 ? '' : 's') + (minutes ? ' ' + minutes + ' minute' + (minutes === 1 ? '' : 's') : '');
}

async function fetchProfileJson(accountId) {
  const encodedId = encodeURIComponent(accountId);
  const endpoint = `https://api.warframe.com/cdn/getProfileViewingData.php?playerId=${encodedId}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROFILE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Warframe Companion App'
      }
    });
    const text = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: response.status === 429
          ? 'Warframe rejected the profile request because too many requests were made. Wait before trying again.'
          : `${response.status} ${response.statusText || 'profile request failed'}`
      };
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      return {
        ok: false,
        message: 'Profile endpoint returned non-JSON data.'
      };
    }

    return {
      ok: true,
      data: json,
      endpoint,
      cacheControl: response.headers.get('cache-control') || '',
      expires: response.headers.get('expires') || ''
    };
  } catch (err) {
    return {
      ok: false,
      message: err && err.name === 'AbortError' ? 'Profile request timed out.' : (err && err.message ? err.message : 'Profile request failed.')
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWarframeProfileFromLog() {
  const profileConfig = await readProfileLogConfig();
  const manualAccountId = profileConfig.manualAccountId;
  const processInfo = await detectWarframeProcess();
  if (!manualAccountId && !processInfo.running) {
    return {
      ok: false,
      reason: 'process-not-running',
      process: processInfo,
      message: 'Open Warframe and log in. The app will detect the process before fetching your profile.'
    };
  }

  const logInfo = manualAccountId ? null : await findWarframeLog();
  if (!manualAccountId && !logInfo) {
    return {
      ok: false,
      reason: 'log-not-found',
      process: processInfo,
      message: 'Warframe is running, but EE.log was not found in the usual local Warframe folder.'
    };
  }

  const logText = logInfo ? await readWarframeLogText(logInfo) : '';
  const accountId = manualAccountId || extractAccountIdFromLog(logText);
  const fallbackDisplayName = extractDisplayNameFromLog(logText);
  const accountIdSource = manualAccountId ? 'manual' : 'ee-log';

  if (!accountId) {
    return {
      ok: false,
      reason: 'account-id-not-found',
      process: processInfo,
      logPath: logInfo && logInfo.path,
      logUpdatedAt: logInfo && logInfo.mtimeMs,
      message: 'Warframe was detected, but the account id is not in EE.log yet. Log in fully, then enter and leave a Relay or Dojo to refresh profile data.'
    };
  }

  const now = Date.now();
  const cacheEntry = await getProfileCacheEntry(accountId);
  const cachedFetchedAt = Number(cacheEntry && cacheEntry.fetchedAt) || 0;
  const cacheAgeMs = cachedFetchedAt ? now - cachedFetchedAt : Infinity;

  if (cacheEntry && cacheEntry.result && cachedFetchedAt && cacheAgeMs < PROFILE_REMOTE_FETCH_COOLDOWN_MS) {
    return Object.assign({}, cacheEntry.result, {
      ok: true,
      process: processInfo,
      logPath: logInfo && logInfo.path,
      logUpdatedAt: logInfo && logInfo.mtimeMs,
      accountIdSource,
      cached: true,
      cacheAgeMs,
      fetchedAt: cachedFetchedAt,
      message: 'Using locally cached Warframe profile data to avoid repeated requests.'
    });
  }

  const lastAttemptAt = Number(cacheEntry && cacheEntry.lastAttemptAt) || 0;
  const retryAgeMs = lastAttemptAt ? now - lastAttemptAt : Infinity;
  const lastAttemptWasFailed = lastAttemptAt && (!cachedFetchedAt || lastAttemptAt > cachedFetchedAt);
  if (lastAttemptWasFailed && retryAgeMs < PROFILE_REMOTE_RETRY_COOLDOWN_MS) {
    const remainingMs = PROFILE_REMOTE_RETRY_COOLDOWN_MS - retryAgeMs;
    return {
      ok: false,
      reason: 'profile-cooldown',
      process: processInfo,
      logPath: logInfo && logInfo.path,
      logUpdatedAt: logInfo && logInfo.mtimeMs,
      accountIdSource,
      cooldownMs: remainingMs,
      message: 'Profile fetch is cooling down for about ' + formatCooldownMs(remainingMs) + ' to protect you from Warframe rate limits.'
    };
  }

  await saveProfileCacheAttempt(accountId, now);

  const profileResponse = await fetchProfileJson(accountId);
  if (!profileResponse.ok) {
    await saveProfileCacheFailure(accountId, now, profileResponse.message);
    return {
      ok: false,
      reason: 'profile-fetch-failed',
      process: processInfo,
      logPath: logInfo && logInfo.path,
      logUpdatedAt: logInfo && logInfo.mtimeMs,
      accountIdSource,
      message: profileResponse.message || 'Profile data could not be fetched.'
    };
  }

  const profileData = profileResponse.data || {};
  const xpInfo = extractProfileXpEntries(profileData);
  const masteryExtras = await extractProfileMasteryExtras(profileData, xpInfo);
  const summary = extractProfileSummary(profileData, fallbackDisplayName);

  if (xpInfo.length === 0) {
    await saveProfileCacheFailure(accountId, now, 'No mastery XP entries were found.');
    return {
      ok: false,
      reason: 'profile-empty',
      process: processInfo,
      logPath: logInfo && logInfo.path,
      logUpdatedAt: logInfo && logInfo.mtimeMs,
      accountIdSource,
      displayName: summary.displayName,
      masteryRank: summary.masteryRank,
      message: 'Profile data was fetched, but no mastery XP entries were found. Enter and leave a Relay or Dojo, then try again.'
    };
  }

  const result = {
    ok: true,
    process: processInfo,
    logPath: logInfo && logInfo.path,
    logUpdatedAt: logInfo && logInfo.mtimeMs,
    accountIdSource,
    displayName: summary.displayName,
    masteryRank: summary.masteryRank,
    xpInfo,
    xpInfoCount: xpInfo.length,
    masteryExtras,
    endpoint: profileResponse.endpoint,
    cacheControl: profileResponse.cacheControl,
    expires: profileResponse.expires,
    fetchedAt: Date.now()
  };

  await saveProfileCacheResult(accountId, result);
  return result;
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
      sandbox: false,
      nodeIntegration: false,
      webSecurity: false,
      spellcheck: false
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

ipcMain.handle('set-relic-overlay-enabled', async (_event, enabled) => {
  const next = !!enabled;
  relicOverlayEnabled = next;

  if (!next) {
    await stopRelicOverlayLoop();
    sendRelicOverlayEvent('status', {
      enabled: false,
      message: 'Relic reward overlay disabled.'
    });
    return { ok: true, enabled: false };
  }

  try {
    await ensureRelicOverlayWindow(getDisplayForRelicOverlay());
    relicOverlayEnabled = true;
    await startRelicOverlayLoop();
    sendRelicOverlayEvent('status', {
      enabled: true,
      message: 'Watching EE.log for Void Fissure rewards...'
    });
    return { ok: true, enabled: true };
  } catch (err) {
    relicOverlayEnabled = false;
    await stopRelicOverlayLoop();
    return {
      ok: false,
      enabled: false,
      message: err && err.message ? err.message : 'Could not start relic reward overlay.'
    };
  }
});

ipcMain.handle('get-relic-overlay-status', () => {
  return {
    ok: true,
    enabled: relicOverlayEnabled,
    scanning: relicOverlayScanning,
    lastCaptureAt: relicOverlayLastCaptureAt,
    lastDetectionAt: relicOverlayLastDetectionAt,
    logPath: relicOverlayLogPath,
    burstActive: Date.now() < relicOverlayBurstUntil
  };
});

ipcMain.handle('update-relic-overlay', async (_event, payload) => {
  if (!relicOverlayEnabled) return { ok: false, visible: false, reason: 'disabled' };
  try {
    return await updateRelicOverlayWindow(payload || {});
  } catch (err) {
    return {
      ok: false,
      visible: false,
      message: err && err.message ? err.message : 'Could not update relic overlay.'
    };
  }
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
  var version = String(app.getVersion() || '').trim();
  if (version) return version;
  try {
    var pkg = require(path.join(__dirname, 'package.json'));
    return pkg && pkg.version ? String(pkg.version) : '';
  } catch (err) {
    return '';
  }
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

ipcMain.handle('detect-warframe-process', async () => {
  try {
    return { ok: true, process: await detectWarframeProcess() };
  } catch (err) {
    return {
      ok: false,
      process: { running: false, name: '' },
      message: err && err.message ? err.message : 'Warframe process detection failed.'
    };
  }
});

ipcMain.handle('get-warframe-log-config', async () => {
  try {
    return await getWarframeLogConfigSummary();
  } catch (err) {
    return {
      ok: false,
      message: err && err.message ? err.message : 'Could not read EE.log location settings.'
    };
  }
});

ipcMain.handle('select-warframe-log-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose Warframe EE.log',
      properties: ['openFile'],
      filters: [
        { name: 'Warframe EE.log', extensions: ['log'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result || result.canceled || !result.filePaths || !result.filePaths[0]) {
      return Object.assign({ canceled: true }, await getWarframeLogConfigSummary());
    }

    return await setConfiguredWarframeLogPath(result.filePaths[0]);
  } catch (err) {
    return {
      ok: false,
      message: err && err.message ? err.message : 'Could not change EE.log location.'
    };
  }
});

ipcMain.handle('reset-warframe-log-path', async () => {
  try {
    return await clearConfiguredWarframeLogPath();
  } catch (err) {
    return {
      ok: false,
      message: err && err.message ? err.message : 'Could not reset EE.log location.'
    };
  }
});

ipcMain.handle('set-manual-profile-account-id', async (event, accountId) => {
  try {
    return await setManualProfileAccountId(accountId);
  } catch (err) {
    return {
      ok: false,
      message: err && err.message ? err.message : 'Could not save the manual account ID.'
    };
  }
});

ipcMain.handle('clear-manual-profile-account-id', async () => {
  try {
    return await clearManualProfileAccountId();
  } catch (err) {
    return {
      ok: false,
      message: err && err.message ? err.message : 'Could not clear the manual account ID.'
    };
  }
});

ipcMain.handle('fetch-warframe-profile', async () => {
  try {
    return await fetchWarframeProfileFromLog();
  } catch (err) {
    return {
      ok: false,
      reason: 'unexpected-error',
      message: err && err.message ? err.message : 'Profile fetch failed.'
    };
  }
});

ipcMain.handle('scan-image-for-items', async (event, imageDataUrl) => {
  activeOcrProgressTarget = event.sender;
  sendOcrProgress({ status: 'queued', progress: 0 });

  try {
    const imageBuffer = dataUrlToBuffer(imageDataUrl);
    const worker = await getOcrWorker();
    const result = await worker.recognize(imageBuffer, {}, { blocks: true });
    const data = result && result.data ? result.data : {};

    sendOcrProgress({ status: 'done', progress: 1 });

    return {
      ok: true,
      text: String(data.text || ''),
      lines: extractOcrLines(data)
    };
  } catch (err) {
    return {
      ok: false,
      message: err && err.message ? err.message : 'Image scan failed.'
    };
  } finally {
    activeOcrProgressTarget = null;
  }
});

app.on('before-quit', () => {
  if (relicOverlayTimer) {
    clearTimeout(relicOverlayTimer);
    relicOverlayTimer = null;
  }
  stopRelicOverlayLogWatcher();
  if (relicOverlayWindow && !relicOverlayWindow.isDestroyed()) {
    relicOverlayWindow.close();
    relicOverlayWindow = null;
  }
  if (!ocrWorkerPromise) return;
  ocrWorkerPromise
    .then((worker) => worker && typeof worker.terminate === 'function' ? worker.terminate() : null)
    .catch(() => {});
});
