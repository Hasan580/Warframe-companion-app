// ==========================================
//  WARFRAME INVENTORY MODULE - Local Vault
// ==========================================
//  Fully local, manual inventory tracking for resources, relics and prime
//  parts. Nothing here reads game memory or any unauthorized data source:
//  every entry is typed in by the player or restored from their own JSON
//  backup. The pure helpers below are deterministic so they can be unit
//  tested outside Electron (see tests/inventory-helpers.test.js).

(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.warframeInventory = api;
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var STORAGE_KEY = 'warframe_inventory_v1';
  var SCHEMA_VERSION = 1;
  var EXPORT_APP_ID = 'warframe-companion-app';
  var EXPORT_TYPE = 'inventory';
  var MAX_QUANTITY = 999999;
  var MAX_TEXT_LENGTH = 80;
  var MAX_NOTE_LENGTH = 180;

  var KINDS = ['resources', 'relics', 'primeParts'];

  var KIND_LABELS = {
    resources: 'Resources',
    relics: 'Relics',
    primeParts: 'Prime Parts'
  };

  var RELIC_ERAS = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem'];
  var RELIC_REFINEMENTS = ['Intact', 'Exceptional', 'Flawless', 'Radiant'];
  var PRIME_PART_TYPES = [
    'Blueprint',
    'Neuroptics',
    'Chassis',
    'Systems',
    'Barrel',
    'Receiver',
    'Stock',
    'Blade',
    'Handle',
    'Link',
    'Grip',
    'String',
    'Ornament',
    'Carapace',
    'Cerebrum',
    'Harness',
    'Wings'
  ];

  // Suggestions only - the player still types/edits every value themselves.
  var RESOURCE_SUGGESTIONS = [
    'Orokin Cell',
    'Argon Crystal',
    'Neural Sensor',
    'Neurode',
    'Orokin Reactor',
    'Orokin Catalyst',
    'Tellurium',
    'Nitain Extract',
    'Oxium',
    'Kuva',
    'Hexenon',
    'Cryotic',
    'Gallium',
    'Morphics',
    'Control Module',
    'Rubedo',
    'Ferrite',
    'Plastids',
    'Polymer Bundle',
    'Circuits'
  ];

  // ------------------------------------------------------------------
  //  Pure helpers (no DOM, no clock, no randomness)
  // ------------------------------------------------------------------

  function cleanText(value, maxLength) {
    var limit = typeof maxLength === 'number' ? maxLength : MAX_TEXT_LENGTH;
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limit);
  }

  function slugify(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function clampQuantity(value) {
    var num = typeof value === 'number' ? value : parseFloat(String(value == null ? '' : value).replace(/,/g, ''));
    if (!isFinite(num)) return 0;
    num = Math.round(num);
    if (num < 0) return 0;
    if (num > MAX_QUANTITY) return MAX_QUANTITY;
    return num;
  }

  function matchOption(value, options, fallback) {
    var wanted = slugify(value);
    for (var i = 0; i < options.length; i++) {
      if (slugify(options[i]) === wanted) return options[i];
    }
    return fallback;
  }

  function formatQuantity(value) {
    // Locale-independent grouping so exports and tests stay deterministic.
    return String(clampQuantity(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function isKind(kind) {
    return KINDS.indexOf(kind) !== -1;
  }

  function entryKey(kind, entry) {
    var source = entry || {};
    if (kind === 'relics') {
      return 'relic:' + slugify(source.era) + ':' + slugify(source.name) + ':' + slugify(source.refinement);
    }
    if (kind === 'primeParts') {
      return 'prime:' + slugify(source.name) + ':' + slugify(source.part);
    }
    return 'resource:' + slugify(source.name);
  }

  // Entry ids are derived from their identity fields, which keeps upsert,
  // dedupe and merge deterministic without a clock or random source.
  function normalizeEntry(kind, raw) {
    if (!isKind(kind) || !raw || typeof raw !== 'object') return null;
    var name = cleanText(raw.name);
    if (!name) return null;

    var entry = {
      id: '',
      name: name,
      quantity: clampQuantity(raw.quantity),
      note: cleanText(raw.note, MAX_NOTE_LENGTH)
    };

    if (kind === 'relics') {
      entry.era = matchOption(raw.era, RELIC_ERAS, RELIC_ERAS[0]);
      entry.refinement = matchOption(raw.refinement, RELIC_REFINEMENTS, RELIC_REFINEMENTS[0]);
    } else if (kind === 'primeParts') {
      var part = cleanText(raw.part);
      entry.part = part || PRIME_PART_TYPES[0];
    }

    entry.id = entryKey(kind, entry);
    return entry;
  }

  function combineSum(existing, incoming) {
    return {
      quantity: clampQuantity(existing.quantity + incoming.quantity),
      note: incoming.note || existing.note
    };
  }

  function combineMax(existing, incoming) {
    return {
      quantity: Math.max(clampQuantity(existing.quantity), clampQuantity(incoming.quantity)),
      note: incoming.note || existing.note
    };
  }

  function dedupeEntries(list, combine) {
    var pick = typeof combine === 'function' ? combine : combineSum;
    var order = [];
    var byId = {};
    (Array.isArray(list) ? list : []).forEach(function (entry) {
      if (!entry || !entry.id) return;
      var current = byId[entry.id];
      if (!current) {
        byId[entry.id] = entry;
        order.push(entry.id);
        return;
      }
      var merged = pick(current, entry);
      var next = {};
      Object.keys(current).forEach(function (key) { next[key] = current[key]; });
      next.quantity = clampQuantity(merged.quantity);
      next.note = cleanText(merged.note, MAX_NOTE_LENGTH);
      byId[entry.id] = next;
    });
    return order.map(function (id) { return byId[id]; });
  }

  function normalizeList(kind, list, combine) {
    var normalized = (Array.isArray(list) ? list : [])
      .map(function (raw) { return normalizeEntry(kind, raw); })
      .filter(Boolean);
    return dedupeEntries(normalized, combine);
  }

  function createEmptyInventory() {
    return {
      version: SCHEMA_VERSION,
      updatedAt: '',
      resources: [],
      relics: [],
      primeParts: []
    };
  }

  // First run starts with the classic Orokin Cell counter so the panel is
  // never an empty void; the player edits or deletes it like any other row.
  function createSeedInventory() {
    var inventory = createEmptyInventory();
    inventory.resources = normalizeList('resources', [
      { name: 'Orokin Cell', quantity: 0, note: 'Starter row - update as you farm.' }
    ]);
    return inventory;
  }

  function normalizeInventory(raw, combine) {
    var source = raw && typeof raw === 'object' ? raw : {};
    var inventory = createEmptyInventory();
    inventory.updatedAt = cleanText(source.updatedAt, 40);
    KINDS.forEach(function (kind) {
      inventory[kind] = normalizeList(kind, source[kind], combine);
    });
    return inventory;
  }

  function upsertEntry(inventory, kind, raw, options) {
    var opts = options || {};
    var base = normalizeInventory(inventory);
    if (!isKind(kind)) return base;
    var entry = normalizeEntry(kind, raw);
    if (!entry) return base;

    var list = base[kind];
    var replaceId = opts.replaceId ? String(opts.replaceId) : '';
    if (replaceId && replaceId !== entry.id) {
      list = list.filter(function (item) { return item.id !== replaceId; });
    }

    var index = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === entry.id) { index = i; break; }
    }

    if (index === -1) {
      list = list.concat([entry]);
    } else {
      var next = list.slice();
      next[index] = entry;
      list = next;
    }

    base[kind] = list;
    return base;
  }

  function removeEntry(inventory, kind, id) {
    var base = normalizeInventory(inventory);
    if (!isKind(kind) || !id) return base;
    base[kind] = base[kind].filter(function (entry) { return entry.id !== String(id); });
    return base;
  }

  function adjustQuantity(inventory, kind, id, delta) {
    var base = normalizeInventory(inventory);
    if (!isKind(kind) || !id) return base;
    var step = clampQuantity(Math.abs(delta)) * (delta < 0 ? -1 : 1);
    base[kind] = base[kind].map(function (entry) {
      if (entry.id !== String(id)) return entry;
      var next = {};
      Object.keys(entry).forEach(function (key) { next[key] = entry[key]; });
      next.quantity = clampQuantity(entry.quantity + step);
      return next;
    });
    return base;
  }

  function summarizeInventory(inventory) {
    var base = normalizeInventory(inventory);
    var summary = { totalEntries: 0, totalUnits: 0 };
    KINDS.forEach(function (kind) {
      var units = base[kind].reduce(function (total, entry) {
        return total + clampQuantity(entry.quantity);
      }, 0);
      summary[kind] = { entries: base[kind].length, units: units };
      summary.totalEntries += base[kind].length;
      summary.totalUnits += units;
    });
    return summary;
  }

  function entrySearchText(kind, entry) {
    var parts = [entry.name, entry.note];
    if (kind === 'relics') parts.push(entry.era, entry.refinement);
    if (kind === 'primeParts') parts.push(entry.part);
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  function filterEntries(kind, list, query) {
    var tokens = cleanText(query, 120).toLowerCase().split(' ').filter(Boolean);
    var entries = Array.isArray(list) ? list : [];
    if (!tokens.length) return entries.slice();
    return entries.filter(function (entry) {
      var haystack = entrySearchText(kind, entry);
      return tokens.every(function (token) { return haystack.indexOf(token) !== -1; });
    });
  }

  function compareText(a, b) {
    var left = String(a || '').toLowerCase();
    var right = String(b || '').toLowerCase();
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }

  function sortEntries(kind, list, mode) {
    var entries = (Array.isArray(list) ? list : []).slice();
    var sortMode = String(mode || 'name-asc');
    entries.sort(function (a, b) {
      var result = 0;
      if (sortMode === 'qty-desc') result = clampQuantity(b.quantity) - clampQuantity(a.quantity);
      else if (sortMode === 'qty-asc') result = clampQuantity(a.quantity) - clampQuantity(b.quantity);
      else if (sortMode === 'name-desc') result = compareText(b.name, a.name);
      else result = compareText(a.name, b.name);
      if (result !== 0) return result;
      return compareText(a.id, b.id); // stable tie-break keeps renders deterministic
    });
    return entries;
  }

  function buildExportPayload(inventory, exportedAt) {
    return {
      app: EXPORT_APP_ID,
      type: EXPORT_TYPE,
      version: SCHEMA_VERSION,
      exportedAt: cleanText(exportedAt, 40),
      inventory: normalizeInventory(inventory)
    };
  }

  function parseImportPayload(text) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw) return { ok: false, error: 'The selected file is empty.', inventory: null };

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return { ok: false, error: 'That file is not valid JSON.', inventory: null };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Expected a JSON object exported from this app.', inventory: null };
    }

    var source = parsed.inventory && typeof parsed.inventory === 'object' ? parsed.inventory : parsed;
    var hasAnyList = KINDS.some(function (kind) { return Array.isArray(source[kind]); });
    if (!hasAnyList) {
      return {
        ok: false,
        error: 'No inventory data found. Expected resources, relics or primeParts arrays.',
        inventory: null
      };
    }

    return { ok: true, error: '', inventory: normalizeInventory(source) };
  }

  // mode 'replace' swaps the vault outright; 'merge' keeps the higher count
  // for matching entries so re-importing the same file is idempotent.
  function mergeInventories(base, incoming, mode) {
    if (String(mode) === 'replace') return normalizeInventory(incoming);
    var current = normalizeInventory(base);
    var next = normalizeInventory(incoming);
    var merged = createEmptyInventory();
    KINDS.forEach(function (kind) {
      merged[kind] = dedupeEntries(current[kind].concat(next[kind]), combineMax);
    });
    return merged;
  }

  function describeSyncStatus(inventory) {
    var summary = summarizeInventory(inventory);
    return {
      mode: 'manual',
      label: 'Manual tracking active',
      detail: 'Automatic sync is not available yet. Every count below is entered by you and stored only on this device.',
      trackedEntries: summary.totalEntries
    };
  }

  function exportFileName(exportedAt) {
    var iso = cleanText(exportedAt, 40);
    var day = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
    return 'warframe-inventory-' + (day ? day[1] : 'backup') + '.json';
  }

  // ------------------------------------------------------------------
  //  Storage (thin wrapper so tests can inject a fake)
  // ------------------------------------------------------------------

  var storageOverride = null;

  function getStorage() {
    if (storageOverride) return storageOverride;
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (err) { /* storage blocked */ }
    return null;
  }

  function setStorage(storage) {
    storageOverride = storage || null;
  }

  function readInventory() {
    var storage = getStorage();
    if (!storage) return createSeedInventory();
    var raw = null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (err) {
      return createSeedInventory();
    }
    if (raw == null) return createSeedInventory();
    try {
      return normalizeInventory(JSON.parse(raw));
    } catch (err) {
      return createEmptyInventory();
    }
  }

  function writeInventory(inventory, timestamp) {
    var normalized = normalizeInventory(inventory);
    normalized.updatedAt = cleanText(timestamp || new Date().toISOString(), 40);
    var storage = getStorage();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch (err) { /* quota or blocked storage - keep in-memory state */ }
    }
    return normalized;
  }

  var core = {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    KINDS: KINDS,
    KIND_LABELS: KIND_LABELS,
    RELIC_ERAS: RELIC_ERAS,
    RELIC_REFINEMENTS: RELIC_REFINEMENTS,
    PRIME_PART_TYPES: PRIME_PART_TYPES,
    RESOURCE_SUGGESTIONS: RESOURCE_SUGGESTIONS,
    cleanText: cleanText,
    slugify: slugify,
    clampQuantity: clampQuantity,
    formatQuantity: formatQuantity,
    entryKey: entryKey,
    normalizeEntry: normalizeEntry,
    normalizeInventory: normalizeInventory,
    createEmptyInventory: createEmptyInventory,
    createSeedInventory: createSeedInventory,
    dedupeEntries: dedupeEntries,
    upsertEntry: upsertEntry,
    removeEntry: removeEntry,
    adjustQuantity: adjustQuantity,
    summarizeInventory: summarizeInventory,
    filterEntries: filterEntries,
    sortEntries: sortEntries,
    buildExportPayload: buildExportPayload,
    parseImportPayload: parseImportPayload,
    mergeInventories: mergeInventories,
    describeSyncStatus: describeSyncStatus,
    exportFileName: exportFileName,
    setStorage: setStorage,
    readInventory: readInventory,
    writeInventory: writeInventory
  };

  // ------------------------------------------------------------------
  //  UI layer (only wired when running inside the app window)
  // ------------------------------------------------------------------

  if (typeof document === 'undefined') {
    core.init = function () { return false; };
    core.refresh = function () { return false; };
    return core;
  }

  var $ = function (selector) { return document.querySelector(selector); };
  var $$ = function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); };

  var initialized = false;
  var inventory = createEmptyInventory();
  var activeKind = 'resources';
  var searchQuery = '';
  var sortMode = 'name-asc';
  var editingId = '';
  var importMode = 'merge';
  var pendingDeleteId = '';
  var pendingDeleteTimer = null;
  var statusTimer = null;

  var els = {};

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = String(value == null ? '' : value);
    return div.innerHTML;
  }

  function formatTimestamp(iso) {
    var value = cleanText(iso, 40);
    if (!value) return 'Never';
    var date = new Date(value);
    if (isNaN(date.getTime())) return 'Never';
    return date.toLocaleString();
  }

  function cacheElements() {
    els = {
      panel: $('#inventory-panel'),
      summaryText: $('#inventory-summary-text'),
      statResources: $('#inventory-stat-resources'),
      statRelics: $('#inventory-stat-relics'),
      statPrimeParts: $('#inventory-stat-prime-parts'),
      syncDetail: $('#inventory-sync-detail'),
      syncUpdated: $('#inventory-sync-updated'),
      tabs: $$('.inventory-tab-btn'),
      searchInput: $('#inventory-search-input'),
      searchClear: $('#inventory-search-clear'),
      sortSelect: $('#inventory-sort-select'),
      addBtn: $('#inventory-add-btn'),
      exportBtn: $('#inventory-export-btn'),
      importBtn: $('#inventory-import-btn'),
      fileInput: $('#inventory-file-input'),
      grid: $('#inventory-grid'),
      empty: $('#inventory-empty'),
      emptyTitle: $('#inventory-empty-title'),
      emptyText: $('#inventory-empty-text'),
      status: $('#inventory-status'),
      nameSuggestions: $('#inventory-name-suggestions'),
      partSuggestions: $('#inventory-part-suggestions'),
      entryModal: $('#inventory-entry-modal'),
      entryTitle: $('#inventory-entry-title'),
      entryForm: $('#inventory-entry-form'),
      entryClose: $('#inventory-entry-close'),
      entryCancel: $('#inventory-entry-cancel'),
      entryError: $('#inventory-entry-error'),
      fieldName: $('#inventory-field-name'),
      fieldEraRow: $('#inventory-field-era-row'),
      fieldEra: $('#inventory-field-era'),
      fieldRefinementRow: $('#inventory-field-refinement-row'),
      fieldRefinement: $('#inventory-field-refinement'),
      fieldPartRow: $('#inventory-field-part-row'),
      fieldPart: $('#inventory-field-part'),
      fieldQuantity: $('#inventory-field-quantity'),
      fieldNote: $('#inventory-field-note'),
      importModal: $('#inventory-import-modal'),
      importClose: $('#inventory-import-close'),
      importCancel: $('#inventory-import-cancel'),
      importChoose: $('#inventory-import-choose'),
      importOptions: $$('.inventory-import-option')
    };
  }

  function setStatus(message, tone) {
    if (!els.status) return;
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
    var text = cleanText(message, 200);
    els.status.textContent = text;
    els.status.classList.remove('is-error', 'is-success');
    if (tone) els.status.classList.add('is-' + tone);
    els.status.classList.toggle('hidden', !text);
    if (text) {
      statusTimer = setTimeout(function () {
        if (els.status) els.status.classList.add('hidden');
        statusTimer = null;
      }, 6000);
    }
  }

  function clearPendingDelete() {
    pendingDeleteId = '';
    if (pendingDeleteTimer) {
      clearTimeout(pendingDeleteTimer);
      pendingDeleteTimer = null;
    }
  }

  function persist(next) {
    inventory = writeInventory(next);
    render();
  }

  function fillDatalist(listEl, values) {
    if (!listEl) return;
    listEl.innerHTML = values.map(function (value) {
      return '<option value="' + escapeHtml(value) + '"></option>';
    }).join('');
  }

  function visibleEntries() {
    var filtered = filterEntries(activeKind, inventory[activeKind], searchQuery);
    return sortEntries(activeKind, filtered, sortMode);
  }

  function entrySubtitle(entry) {
    if (activeKind === 'relics') return entry.era + ' - ' + entry.refinement;
    if (activeKind === 'primeParts') return entry.part;
    return 'Resource';
  }

  function renderCard(entry) {
    var isConfirming = pendingDeleteId === entry.id;
    return '' +
      '<article class="inventory-card" data-entry-id="' + escapeHtml(entry.id) + '">' +
        '<div class="inventory-card-head">' +
          '<div class="inventory-card-titles">' +
            '<h3 class="inventory-card-name">' + escapeHtml(entry.name) + '</h3>' +
            '<span class="inventory-card-subtitle">' + escapeHtml(entrySubtitle(entry)) + '</span>' +
          '</div>' +
          '<span class="inventory-card-qty">' + escapeHtml(formatQuantity(entry.quantity)) + '</span>' +
        '</div>' +
        (entry.note ? '<p class="inventory-card-note">' + escapeHtml(entry.note) + '</p>' : '') +
        '<div class="inventory-card-actions">' +
          '<div class="inventory-stepper">' +
            '<button class="inventory-step-btn" type="button" data-action="decrement" ' +
              'aria-label="Decrease ' + escapeHtml(entry.name) + '">' +
              '<span class="material-icons-round">remove</span>' +
            '</button>' +
            '<button class="inventory-step-btn" type="button" data-action="increment" ' +
              'aria-label="Increase ' + escapeHtml(entry.name) + '">' +
              '<span class="material-icons-round">add</span>' +
            '</button>' +
          '</div>' +
          '<div class="inventory-card-tools">' +
            '<button class="inventory-icon-btn" type="button" data-action="edit" ' +
              'aria-label="Edit ' + escapeHtml(entry.name) + '">' +
              '<span class="material-icons-round">edit</span>' +
            '</button>' +
            '<button class="inventory-icon-btn inventory-delete-btn' + (isConfirming ? ' is-confirming' : '') + '" ' +
              'type="button" data-action="delete" aria-label="Delete ' + escapeHtml(entry.name) + '">' +
              '<span class="material-icons-round">' + (isConfirming ? 'check' : 'delete_outline') + '</span>' +
              (isConfirming ? '<span class="inventory-delete-confirm">Confirm</span>' : '') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderEmptyState(hasEntries) {
    if (!els.empty) return;
    if (hasEntries) {
      els.empty.classList.add('hidden');
      return;
    }
    var label = KIND_LABELS[activeKind];
    if (searchQuery) {
      if (els.emptyTitle) els.emptyTitle.textContent = 'No matches';
      if (els.emptyText) els.emptyText.textContent = 'Nothing in ' + label + ' matches "' + searchQuery + '".';
    } else {
      if (els.emptyTitle) els.emptyTitle.textContent = 'Nothing tracked yet';
      if (els.emptyText) els.emptyText.textContent = 'Use Add Entry to start tracking your ' + label.toLowerCase() + '.';
    }
    els.empty.classList.remove('hidden');
  }

  function renderSummary() {
    var summary = summarizeInventory(inventory);
    var status = describeSyncStatus(inventory);
    if (els.statResources) els.statResources.textContent = formatQuantity(summary.resources.units);
    if (els.statRelics) els.statRelics.textContent = formatQuantity(summary.relics.units);
    if (els.statPrimeParts) els.statPrimeParts.textContent = formatQuantity(summary.primeParts.units);
    if (els.summaryText) {
      els.summaryText.textContent = summary.totalEntries === 1
        ? '1 tracked entry, stored locally'
        : formatQuantity(summary.totalEntries) + ' tracked entries, stored locally';
    }
    if (els.syncDetail) els.syncDetail.textContent = status.detail;
    if (els.syncUpdated) els.syncUpdated.textContent = 'Last local change: ' + formatTimestamp(inventory.updatedAt);
  }

  function render() {
    if (!els.grid) return;
    renderSummary();

    els.tabs.forEach(function (tab) {
      var kind = tab.getAttribute('data-inventory-kind');
      var isActive = kind === activeKind;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (els.searchClear) els.searchClear.classList.toggle('hidden', !searchQuery);
    if (els.addBtn) {
      var addLabel = els.addBtn.querySelector('.inventory-add-label');
      if (addLabel) addLabel.textContent = 'Add ' + (activeKind === 'resources' ? 'Resource' : activeKind === 'relics' ? 'Relic' : 'Prime Part');
    }

    var entries = visibleEntries();
    els.grid.innerHTML = entries.map(renderCard).join('');
    renderEmptyState(entries.length > 0);
  }

  function openEntryModal(kind, entry) {
    if (!els.entryModal) return;
    activeKind = isKind(kind) ? kind : activeKind;
    editingId = entry ? entry.id : '';

    var isRelic = activeKind === 'relics';
    var isPrimePart = activeKind === 'primeParts';

    if (els.entryTitle) {
      els.entryTitle.textContent = (entry ? 'Edit ' : 'Add ') +
        (isRelic ? 'Relic' : isPrimePart ? 'Prime Part' : 'Resource');
    }
    if (els.fieldName) {
      els.fieldName.value = entry ? entry.name : '';
      els.fieldName.placeholder = isRelic ? 'A1, B4, K3...' : isPrimePart ? 'Rhino Prime' : 'Orokin Cell';
    }
    if (els.fieldEraRow) els.fieldEraRow.classList.toggle('hidden', !isRelic);
    if (els.fieldRefinementRow) els.fieldRefinementRow.classList.toggle('hidden', !isRelic);
    if (els.fieldPartRow) els.fieldPartRow.classList.toggle('hidden', !isPrimePart);
    if (els.fieldEra) els.fieldEra.value = entry && entry.era ? entry.era : RELIC_ERAS[0];
    if (els.fieldRefinement) els.fieldRefinement.value = entry && entry.refinement ? entry.refinement : RELIC_REFINEMENTS[0];
    if (els.fieldPart) els.fieldPart.value = entry && entry.part ? entry.part : '';
    if (els.fieldQuantity) els.fieldQuantity.value = entry ? String(entry.quantity) : '1';
    if (els.fieldNote) els.fieldNote.value = entry && entry.note ? entry.note : '';

    fillDatalist(els.nameSuggestions, activeKind === 'resources' ? RESOURCE_SUGGESTIONS : []);
    if (els.entryError) {
      els.entryError.textContent = '';
      els.entryError.classList.add('hidden');
    }

    els.entryModal.classList.remove('hidden');
    if (els.fieldName) {
      setTimeout(function () { els.fieldName.focus(); }, 0);
    }
  }

  function closeEntryModal() {
    if (els.entryModal) els.entryModal.classList.add('hidden');
    editingId = '';
  }

  function submitEntryForm(event) {
    if (event) event.preventDefault();
    var name = cleanText(els.fieldName ? els.fieldName.value : '');
    if (!name) {
      if (els.entryError) {
        els.entryError.textContent = 'Enter a name before saving.';
        els.entryError.classList.remove('hidden');
      }
      return;
    }

    var draft = {
      name: name,
      quantity: clampQuantity(els.fieldQuantity ? els.fieldQuantity.value : 0),
      note: els.fieldNote ? els.fieldNote.value : ''
    };
    if (activeKind === 'relics') {
      draft.era = els.fieldEra ? els.fieldEra.value : RELIC_ERAS[0];
      draft.refinement = els.fieldRefinement ? els.fieldRefinement.value : RELIC_REFINEMENTS[0];
    } else if (activeKind === 'primeParts') {
      draft.part = els.fieldPart ? els.fieldPart.value : '';
    }

    clearPendingDelete();
    persist(upsertEntry(inventory, activeKind, draft, { replaceId: editingId }));
    closeEntryModal();
    setStatus('Saved "' + name + '" to ' + KIND_LABELS[activeKind] + '.', 'success');
  }

  function findEntry(id) {
    var list = inventory[activeKind] || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function handleGridClick(event) {
    var button = event.target && event.target.closest ? event.target.closest('button[data-action]') : null;
    if (!button) return;
    var card = button.closest('.inventory-card');
    if (!card) return;
    var id = card.getAttribute('data-entry-id');
    var entry = findEntry(id);
    if (!entry) return;
    var action = button.getAttribute('data-action');

    if (action === 'increment' || action === 'decrement') {
      clearPendingDelete();
      persist(adjustQuantity(inventory, activeKind, id, action === 'increment' ? 1 : -1));
      return;
    }
    if (action === 'edit') {
      clearPendingDelete();
      openEntryModal(activeKind, entry);
      return;
    }
    if (action === 'delete') {
      if (pendingDeleteId === id) {
        clearPendingDelete();
        persist(removeEntry(inventory, activeKind, id));
        setStatus('Removed "' + entry.name + '".', 'success');
        return;
      }
      clearPendingDelete();
      pendingDeleteId = id;
      pendingDeleteTimer = setTimeout(function () {
        clearPendingDelete();
        render();
      }, 4000);
      render();
      setStatus('Click the check again to delete "' + entry.name + '".');
    }
  }

  function exportInventory() {
    var exportedAt = new Date().toISOString();
    var payload = buildExportPayload(inventory, exportedAt);
    var json = JSON.stringify(payload, null, 2);
    try {
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = exportFileName(exportedAt);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      setStatus('Exported ' + summarizeInventory(inventory).totalEntries + ' entries to JSON.', 'success');
    } catch (err) {
      setStatus('Export failed: ' + (err && err.message ? err.message : 'unknown error'), 'error');
    }
  }

  function openImportModal() {
    if (!els.importModal) return;
    importMode = 'merge';
    updateImportOptions();
    els.importModal.classList.remove('hidden');
  }

  function closeImportModal() {
    if (els.importModal) els.importModal.classList.add('hidden');
  }

  function updateImportOptions() {
    els.importOptions.forEach(function (option) {
      var mode = option.getAttribute('data-import-mode');
      var isActive = mode === importMode;
      option.classList.toggle('is-active', isActive);
      option.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function applyImportedText(text) {
    var result = parseImportPayload(text);
    if (!result.ok) {
      setStatus(result.error, 'error');
      return;
    }
    clearPendingDelete();
    var merged = mergeInventories(inventory, result.inventory, importMode);
    persist(merged);
    var summary = summarizeInventory(merged);
    setStatus(
      (importMode === 'replace' ? 'Replaced vault with ' : 'Merged import into vault - now ') +
      summary.totalEntries + ' entries.',
      'success'
    );
  }

  function handleFileChosen(event) {
    var input = event.target;
    var file = input && input.files ? input.files[0] : null;
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      applyImportedText(String(reader.result || ''));
    };
    reader.onerror = function () {
      setStatus('Could not read that file.', 'error');
    };
    reader.readAsText(file);
    input.value = '';
    closeImportModal();
  }

  function bindEvents() {
    els.tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var kind = tab.getAttribute('data-inventory-kind');
        if (!isKind(kind) || kind === activeKind) return;
        activeKind = kind;
        clearPendingDelete();
        render();
      });
    });

    if (els.searchInput) {
      els.searchInput.addEventListener('input', function () {
        searchQuery = cleanText(els.searchInput.value, 120);
        clearPendingDelete();
        render();
      });
    }

    if (els.searchClear) {
      els.searchClear.addEventListener('click', function () {
        searchQuery = '';
        if (els.searchInput) {
          els.searchInput.value = '';
          els.searchInput.focus();
        }
        render();
      });
    }

    if (els.sortSelect) {
      els.sortSelect.addEventListener('change', function () {
        sortMode = els.sortSelect.value || 'name-asc';
        render();
      });
    }

    if (els.addBtn) {
      els.addBtn.addEventListener('click', function () { openEntryModal(activeKind, null); });
    }
    if (els.entryForm) els.entryForm.addEventListener('submit', submitEntryForm);
    if (els.entryClose) els.entryClose.addEventListener('click', closeEntryModal);
    if (els.entryCancel) els.entryCancel.addEventListener('click', closeEntryModal);
    if (els.entryModal) {
      els.entryModal.addEventListener('click', function (event) {
        if (event.target === els.entryModal) closeEntryModal();
      });
    }

    if (els.grid) els.grid.addEventListener('click', handleGridClick);
    if (els.exportBtn) els.exportBtn.addEventListener('click', exportInventory);
    if (els.importBtn) els.importBtn.addEventListener('click', openImportModal);
    if (els.importClose) els.importClose.addEventListener('click', closeImportModal);
    if (els.importCancel) els.importCancel.addEventListener('click', closeImportModal);
    if (els.importModal) {
      els.importModal.addEventListener('click', function (event) {
        if (event.target === els.importModal) closeImportModal();
      });
    }
    els.importOptions.forEach(function (option) {
      option.addEventListener('click', function () {
        importMode = option.getAttribute('data-import-mode') === 'replace' ? 'replace' : 'merge';
        updateImportOptions();
      });
    });
    if (els.importChoose && els.fileInput) {
      els.importChoose.addEventListener('click', function () { els.fileInput.click(); });
    }
    if (els.fileInput) els.fileInput.addEventListener('change', handleFileChosen);

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (els.entryModal && !els.entryModal.classList.contains('hidden')) closeEntryModal();
      if (els.importModal && !els.importModal.classList.contains('hidden')) closeImportModal();
    });
  }

  function init() {
    if (initialized) {
      render();
      return true;
    }
    cacheElements();
    if (!els.panel || !els.grid) return false;

    inventory = readInventory();
    fillDatalist(els.nameSuggestions, RESOURCE_SUGGESTIONS);
    fillDatalist(els.partSuggestions, PRIME_PART_TYPES);
    if (els.sortSelect) els.sortSelect.value = sortMode;
    bindEvents();
    initialized = true;
    render();
    return true;
  }

  core.init = init;
  core.refresh = function () {
    if (!initialized) return init();
    inventory = readInventory();
    render();
    return true;
  };
  core.getInventory = function () { return normalizeInventory(inventory); };

  return core;
});
