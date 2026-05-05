const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { execFile } = require('child_process');
const { autoUpdater } = require('electron-updater');
const { createWorker } = require('tesseract.js');

let mainWindow;
const DEFAULT_MIN_WIDTH = 900;
const DEFAULT_MIN_HEIGHT = 600;
const isDev = !app.isPackaged;
let updateDownloaded = false;
let ocrWorkerPromise = null;
let activeOcrProgressTarget = null;
const PROFILE_FETCH_TIMEOUT_MS = 15000;
const PROFILE_INTRINSIC_RANK_XP = 1500;
const PROFILE_NORMAL_STAR_CHART_XP_MAX = 27519;
const PROFILE_STEEL_PATH_XP_MAX = 27519;
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

function extractOcrLines(data) {
  const output = [];
  const blocks = Array.isArray(data && data.blocks) ? data.blocks : [];

  for (const block of blocks) {
    const paragraphs = Array.isArray(block && block.paragraphs) ? block.paragraphs : [];
    for (const paragraph of paragraphs) {
      const lines = Array.isArray(paragraph && paragraph.lines) ? paragraph.lines : [];
      for (const line of lines) {
        const text = String(line && line.text ? line.text : '').trim();
        if (!text) continue;
        output.push({
          text,
          confidence: typeof line.confidence === 'number' ? line.confidence : 0
        });
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

function getWarframeLogCandidates() {
  const candidates = [];
  const homeDir = app.getPath('home');

  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Warframe', 'EE.log'));
  }

  if (homeDir) {
    candidates.push(path.join(homeDir, 'AppData', 'Local', 'Warframe', 'EE.log'));
    candidates.push(path.join(homeDir, '.steam', 'steam', 'steamapps', 'compatdata', '230410', 'pfx', 'drive_c', 'users', 'steamuser', 'AppData', 'Local', 'Warframe', 'EE.log'));
    candidates.push(path.join(homeDir, '.local', 'share', 'Steam', 'steamapps', 'compatdata', '230410', 'pfx', 'drive_c', 'users', 'steamuser', 'AppData', 'Local', 'Warframe', 'EE.log'));
  }

  return uniquePaths(candidates);
}

async function findWarframeLog() {
  const candidates = getWarframeLogCandidates();
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

async function fetchProfileJson(accountId) {
  const encodedId = encodeURIComponent(accountId);
  const endpoints = [
    `https://api.warframe.com/cdn/getProfileViewingData.php?playerId=${encodedId}`,
    `http://content.warframe.com/dynamic/getProfileViewingData.php?playerId=${encodedId}`
  ];
  const errors = [];

  for (const endpoint of endpoints) {
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
        errors.push(`${response.status} ${response.statusText || 'profile request failed'}`);
        continue;
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (err) {
        errors.push('Profile endpoint returned non-JSON data.');
        continue;
      }

      return {
        ok: true,
        data: json,
        endpoint,
        cacheControl: response.headers.get('cache-control') || '',
        expires: response.headers.get('expires') || ''
      };
    } catch (err) {
      errors.push(err && err.name === 'AbortError' ? 'Profile request timed out.' : (err && err.message ? err.message : 'Profile request failed.'));
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    message: errors.filter(Boolean).join(' / ') || 'Profile request failed.'
  };
}

async function fetchWarframeProfileFromLog() {
  const processInfo = await detectWarframeProcess();
  if (!processInfo.running) {
    return {
      ok: false,
      reason: 'process-not-running',
      process: processInfo,
      message: 'Open Warframe and log in. The app will detect the process before fetching your profile.'
    };
  }

  const logInfo = await findWarframeLog();
  if (!logInfo) {
    return {
      ok: false,
      reason: 'log-not-found',
      process: processInfo,
      message: 'Warframe is running, but EE.log was not found in the usual local Warframe folder.'
    };
  }

  const logText = await readWarframeLogText(logInfo);
  const accountId = extractAccountIdFromLog(logText);
  const fallbackDisplayName = extractDisplayNameFromLog(logText);

  if (!accountId) {
    return {
      ok: false,
      reason: 'account-id-not-found',
      process: processInfo,
      logPath: logInfo.path,
      logUpdatedAt: logInfo.mtimeMs,
      message: 'Warframe was detected, but the account id is not in EE.log yet. Log in fully, then enter and leave a Relay or Dojo to refresh profile data.'
    };
  }

  const profileResponse = await fetchProfileJson(accountId);
  if (!profileResponse.ok) {
    return {
      ok: false,
      reason: 'profile-fetch-failed',
      process: processInfo,
      logPath: logInfo.path,
      logUpdatedAt: logInfo.mtimeMs,
      message: profileResponse.message || 'Profile data could not be fetched.'
    };
  }

  const profileData = profileResponse.data || {};
  const xpInfo = extractProfileXpEntries(profileData);
  const masteryExtras = await extractProfileMasteryExtras(profileData, xpInfo);
  const summary = extractProfileSummary(profileData, fallbackDisplayName);

  if (xpInfo.length === 0) {
    return {
      ok: false,
      reason: 'profile-empty',
      process: processInfo,
      logPath: logInfo.path,
      logUpdatedAt: logInfo.mtimeMs,
      displayName: summary.displayName,
      masteryRank: summary.masteryRank,
      message: 'Profile data was fetched, but no mastery XP entries were found. Enter and leave a Relay or Dojo, then try again.'
    };
  }

  return {
    ok: true,
    process: processInfo,
    logPath: logInfo.path,
    logUpdatedAt: logInfo.mtimeMs,
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
  if (!ocrWorkerPromise) return;
  ocrWorkerPromise
    .then((worker) => worker && typeof worker.terminate === 'function' ? worker.terminate() : null)
    .catch(() => {});
});
