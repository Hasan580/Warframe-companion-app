'use strict';

const WARFRAME_FEATURE = 'match_info';
const MAX_ITEM_TYPE_LENGTH = 512;
const MAX_INVENTORY_ENTRIES = 20000;
const MAX_TRAVERSAL_DEPTH = 24;

function parseJsonValue(value) {
  var current = value;

  for (var index = 0; index < 2 && typeof current === 'string'; index += 1) {
    var trimmed = current.trim();
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) break;
    try {
      current = JSON.parse(trimmed);
    } catch (err) {
      break;
    }
  }

  return current;
}

function normalizeCount(value) {
  var count = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(count) || count < 0) return null;
  return Math.floor(count);
}

function collectInventoryItems(value, items, seen, depth) {
  if (items.length >= MAX_INVENTORY_ENTRIES || depth > MAX_TRAVERSAL_DEPTH) return;

  var parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== 'object') return;
  if (seen.has(parsed)) return;
  seen.add(parsed);

  if (
    Object.prototype.hasOwnProperty.call(parsed, 'ItemType') &&
    Object.prototype.hasOwnProperty.call(parsed, 'ItemCount')
  ) {
    var itemType = typeof parsed.ItemType === 'string' ? parsed.ItemType.trim() : '';
    var count = normalizeCount(parsed.ItemCount);
    if (itemType && itemType.length <= MAX_ITEM_TYPE_LENGTH && count !== null) {
      items.push({ itemType: itemType, count: count });
    }
  }

  if (Array.isArray(parsed)) {
    for (var arrayIndex = 0; arrayIndex < parsed.length; arrayIndex += 1) {
      collectInventoryItems(parsed[arrayIndex], items, seen, depth + 1);
      if (items.length >= MAX_INVENTORY_ENTRIES) break;
    }
    return;
  }

  var keys = Object.keys(parsed);
  for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    collectInventoryItems(parsed[keys[keyIndex]], items, seen, depth + 1);
    if (items.length >= MAX_INVENTORY_ENTRIES) break;
  }
}

function normalizeInventorySnapshot(rawInventory, metadata) {
  var items = [];
  collectInventoryItems(rawInventory, items, new WeakSet(), 0);
  items.sort((left, right) => {
    var typeOrder = left.itemType.localeCompare(right.itemType);
    return typeOrder || left.count - right.count;
  });

  return {
    source: 'overwolf-gep',
    game: 'Warframe',
    gameId: Number.isFinite(Number(metadata && metadata.gameId))
      ? Number(metadata.gameId)
      : null,
    capturedAt: Number.isFinite(Number(metadata && metadata.capturedAt))
      ? Number(metadata.capturedAt)
      : Date.now(),
    items: items
  };
}

function getCurrentInventoryValue(info) {
  var parsed = parseJsonValue(info);
  if (!parsed || typeof parsed !== 'object') return undefined;

  var candidates = [
    parsed.match_info,
    parsed.info && parsed.info.match_info,
    parsed.feature === WARFRAME_FEATURE ? parsed : null
  ];

  for (var index = 0; index < candidates.length; index += 1) {
    var candidate = parseJsonValue(candidates[index]);
    if (!candidate || typeof candidate !== 'object') continue;
    if (Object.prototype.hasOwnProperty.call(candidate, 'inventory')) {
      return candidate.inventory;
    }
    if (
      candidate.key === 'inventory' &&
      Object.prototype.hasOwnProperty.call(candidate, 'value')
    ) {
      return candidate.value;
    }
  }

  return undefined;
}

function isWarframe(name) {
  return String(name || '').trim().toLowerCase() === 'warframe';
}

function safeErrorMessage(error, fallback) {
  var message = '';
  if (typeof error === 'string') message = error;
  else if (error && typeof error.message === 'string') message = error.message;
  message = message.replace(/[\r\n\t]+/g, ' ').trim();
  return message ? message.slice(0, 300) : fallback;
}

class OverwolfInventoryAdapter {
  constructor(options) {
    var config = options || {};
    this.app = config.app;
    this.now = typeof config.now === 'function' ? config.now : Date.now;
    this.onStatus = typeof config.onStatus === 'function' ? config.onStatus : () => {};
    this.onSnapshot = typeof config.onSnapshot === 'function' ? config.onSnapshot : () => {};
    this.gep = null;
    this.gameId = null;
    this.latestSnapshot = null;
    this.listeners = [];
    this.started = false;
    this.status = {
      runtime: 'electron',
      gepAvailable: false,
      state: 'unavailable',
      gameId: null,
      message: 'Overwolf GEP is not available in this Electron runtime.',
      error: ''
    };
  }

  getStatus() {
    return Object.assign({}, this.status);
  }

  getSnapshot() {
    if (!this.latestSnapshot) return null;
    return {
      source: this.latestSnapshot.source,
      game: this.latestSnapshot.game,
      gameId: this.latestSnapshot.gameId,
      capturedAt: this.latestSnapshot.capturedAt,
      items: this.latestSnapshot.items.map((item) => ({
        itemType: item.itemType,
        count: item.count
      }))
    };
  }

  setStatus(patch) {
    this.status = Object.assign({}, this.status, patch || {});
    this.onStatus(this.getStatus());
  }

  addListener(eventName, listener) {
    this.gep.on(eventName, listener);
    this.listeners.push([eventName, listener]);
  }

  initialize() {
    if (this.started) return this.getStatus();
    this.started = true;

    var overwolf = this.app && this.app.overwolf;
    var gep = overwolf && overwolf.packages && overwolf.packages.gep;
    if (!overwolf) {
      this.setStatus({
        runtime: 'electron',
        gepAvailable: false,
        state: 'unavailable',
        message: 'Overwolf GEP is not available in this Electron runtime.',
        error: ''
      });
      return this.getStatus();
    }

    if (
      !gep ||
      typeof gep.on !== 'function' ||
      typeof gep.setRequiredFeatures !== 'function'
    ) {
      this.setStatus({
        runtime: 'ow-electron',
        gepAvailable: false,
        state: 'unavailable',
        message: 'Overwolf Electron was detected, but its GEP package is unavailable.',
        error: 'Verify local credentials or production signing and GEP access.'
      });
      return this.getStatus();
    }

    this.gep = gep;
    this.setStatus({
      runtime: 'ow-electron',
      gepAvailable: true,
      state: 'waiting-for-game',
      gameId: null,
      message: 'Waiting for Warframe.',
      error: ''
    });

    this.addListener('game-detected', (event, gameId, name) => {
      if (!isWarframe(name)) return;
      Promise.resolve(this.handleGameDetected(event, gameId)).catch((error) => {
        this.setStatus({
          state: 'error',
          gameId: Number.isFinite(Number(gameId)) ? Number(gameId) : null,
          message: 'Could not start Warframe inventory events.',
          error: safeErrorMessage(error, 'GEP setup failed.')
        });
      });
    });

    this.addListener('new-info-update', (_event, gameId, data) => {
      this.handleInfoUpdate(gameId, data);
    });

    this.addListener('game-exit', (_event, gameId, name) => {
      if (Number(gameId) !== this.gameId && !isWarframe(name)) return;
      this.gameId = null;
      this.latestSnapshot = null;
      this.setStatus({
        state: 'waiting-for-game',
        gameId: null,
        message: 'Warframe exited. Waiting for Warframe.',
        error: ''
      });
    });

    this.addListener('elevated-privileges-required', (_event, gameId, name) => {
      if (!isWarframe(name)) return;
      this.setStatus({
        state: 'privileges-required',
        gameId: Number.isFinite(Number(gameId)) ? Number(gameId) : null,
        message: 'Warframe is elevated; GEP requires the app to run at the same privilege level.',
        error: 'Inventory events are unavailable until privilege levels match.'
      });
    });

    this.addListener('error', (_event, gameId, error) => {
      if (this.gameId !== null && Number(gameId) !== this.gameId) return;
      this.setStatus({
        state: 'error',
        gameId: Number.isFinite(Number(gameId)) ? Number(gameId) : this.gameId,
        message: 'Overwolf GEP reported an error.',
        error: safeErrorMessage(error, 'GEP error.')
      });
    });

    return this.getStatus();
  }

  async handleGameDetected(event, gameId) {
    var normalizedGameId = Number(gameId);
    if (!Number.isFinite(normalizedGameId)) {
      throw new Error('GEP returned an invalid Warframe game ID.');
    }
    if (!event || typeof event.enable !== 'function') {
      throw new Error('GEP did not provide a game enable callback.');
    }

    this.gameId = normalizedGameId;
    this.setStatus({
      state: 'subscribing',
      gameId: normalizedGameId,
      message: 'Enabling Warframe inventory events.',
      error: ''
    });

    await Promise.resolve(event.enable());
    await this.gep.setRequiredFeatures(normalizedGameId, [WARFRAME_FEATURE]);

    this.setStatus({
      state: 'active',
      gameId: normalizedGameId,
      message: 'Warframe inventory events are active.',
      error: ''
    });

    if (typeof this.gep.getInfo === 'function') {
      try {
        var info = await this.gep.getInfo(normalizedGameId);
        var currentInventory = getCurrentInventoryValue(info);
        if (currentInventory !== undefined) {
          this.publishSnapshot(currentInventory, normalizedGameId);
        }
      } catch (error) {
        this.setStatus({
          state: 'active',
          gameId: normalizedGameId,
          message: 'Warframe inventory events are active; the initial snapshot was unavailable.',
          error: safeErrorMessage(error, 'Could not read the initial inventory snapshot.')
        });
      }
    }
  }

  handleInfoUpdate(gameId, data) {
    if (Number(gameId) !== this.gameId || !data || typeof data !== 'object') return;
    if (data.feature !== WARFRAME_FEATURE && data.category !== WARFRAME_FEATURE) return;
    if (data.key !== 'inventory') return;
    try {
      this.publishSnapshot(data.value, this.gameId);
    } catch (error) {
      this.setStatus({
        state: 'error',
        gameId: this.gameId,
        message: 'Could not normalize a Warframe inventory update.',
        error: 'The GEP inventory payload was invalid.'
      });
    }
  }

  publishSnapshot(rawInventory, gameId) {
    this.latestSnapshot = normalizeInventorySnapshot(rawInventory, {
      gameId: gameId,
      capturedAt: this.now()
    });
    this.onSnapshot(this.getSnapshot());
  }

  stop() {
    if (this.gep) {
      for (var index = 0; index < this.listeners.length; index += 1) {
        var entry = this.listeners[index];
        if (typeof this.gep.off === 'function') this.gep.off(entry[0], entry[1]);
        else if (typeof this.gep.removeListener === 'function') {
          this.gep.removeListener(entry[0], entry[1]);
        }
      }
    }

    this.listeners = [];
    this.gep = null;
    this.gameId = null;
    this.latestSnapshot = null;
    this.started = false;
  }
}

function createOverwolfInventoryAdapter(options) {
  return new OverwolfInventoryAdapter(options);
}

module.exports = {
  WARFRAME_FEATURE,
  createOverwolfInventoryAdapter,
  getCurrentInventoryValue,
  normalizeInventorySnapshot
};
