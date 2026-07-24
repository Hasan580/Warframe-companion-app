// Deterministic unit tests for the inventory helpers.
// Run with: npm test   (plain node, no dependencies)

const assert = require('assert');
const inv = require('../inventory.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL ' + name);
    console.log('       ' + (err && err.message ? err.message : err));
  }
}

console.log('inventory helpers');

test('clampQuantity coerces junk to a safe integer', function () {
  assert.strictEqual(inv.clampQuantity('1,250'), 1250);
  assert.strictEqual(inv.clampQuantity(-5), 0);
  assert.strictEqual(inv.clampQuantity('abc'), 0);
  assert.strictEqual(inv.clampQuantity(3.6), 4);
  assert.strictEqual(inv.clampQuantity(10 ** 9), 999999);
});

test('formatQuantity groups digits without locale drift', function () {
  assert.strictEqual(inv.formatQuantity(0), '0');
  assert.strictEqual(inv.formatQuantity(999), '999');
  assert.strictEqual(inv.formatQuantity(1234567), '999,999'); // clamped first
  assert.strictEqual(inv.formatQuantity(12345), '12,345');
});

test('cleanText collapses whitespace and control characters', function () {
  assert.strictEqual(inv.cleanText('  Orokin   Cell \n'), 'Orokin Cell');
  assert.strictEqual(inv.cleanText('Lith\u0000A1'), 'Lith A1');
  assert.strictEqual(inv.cleanText(null), '');
});

test('entry ids are derived from identity fields', function () {
  const resource = inv.normalizeEntry('resources', { name: ' Orokin Cell ', quantity: '12' });
  assert.strictEqual(resource.id, 'resource:orokin-cell');
  assert.strictEqual(resource.quantity, 12);

  const relic = inv.normalizeEntry('relics', { name: 'A1', era: 'lith', refinement: 'radiant', quantity: 3 });
  assert.strictEqual(relic.id, 'relic:lith:a1:radiant');
  assert.strictEqual(relic.era, 'Lith');
  assert.strictEqual(relic.refinement, 'Radiant');

  const part = inv.normalizeEntry('primeParts', { name: 'Rhino Prime', part: 'Systems', quantity: 2 });
  assert.strictEqual(part.id, 'prime:rhino-prime:systems');
});

test('normalizeEntry rejects unusable input', function () {
  assert.strictEqual(inv.normalizeEntry('resources', { name: '   ' }), null);
  assert.strictEqual(inv.normalizeEntry('resources', null), null);
  assert.strictEqual(inv.normalizeEntry('nonsense', { name: 'Thing' }), null);
});

test('unknown relic era or refinement falls back to a valid option', function () {
  const relic = inv.normalizeEntry('relics', { name: 'B4', era: 'Omega', refinement: 'Shiny' });
  assert.strictEqual(relic.era, 'Lith');
  assert.strictEqual(relic.refinement, 'Intact');
});

test('normalizeInventory drops bad rows and sums duplicates', function () {
  const normalized = inv.normalizeInventory({
    resources: [
      { name: 'Orokin Cell', quantity: 10 },
      { name: 'orokin cell', quantity: 5 },
      { name: '' },
      'garbage'
    ],
    relics: null,
    primeParts: undefined,
    extraKey: 'ignored'
  });
  assert.strictEqual(normalized.resources.length, 1);
  assert.strictEqual(normalized.resources[0].quantity, 15);
  assert.deepStrictEqual(normalized.relics, []);
  assert.deepStrictEqual(normalized.primeParts, []);
  assert.strictEqual(normalized.version, inv.SCHEMA_VERSION);
});

test('upsertEntry adds, then updates in place', function () {
  let vault = inv.createEmptyInventory();
  vault = inv.upsertEntry(vault, 'resources', { name: 'Argon Crystal', quantity: 4 });
  assert.strictEqual(vault.resources.length, 1);

  vault = inv.upsertEntry(vault, 'resources', { name: 'Argon Crystal', quantity: 9 });
  assert.strictEqual(vault.resources.length, 1);
  assert.strictEqual(vault.resources[0].quantity, 9);
});

test('upsertEntry with replaceId handles renames without duplicating', function () {
  let vault = inv.upsertEntry(inv.createEmptyInventory(), 'resources', { name: 'Nuerode', quantity: 7 });
  const oldId = vault.resources[0].id;
  vault = inv.upsertEntry(vault, 'resources', { name: 'Neurode', quantity: 7 }, { replaceId: oldId });
  assert.strictEqual(vault.resources.length, 1);
  assert.strictEqual(vault.resources[0].name, 'Neurode');
});

test('removeEntry and adjustQuantity operate on the right row', function () {
  let vault = inv.createEmptyInventory();
  vault = inv.upsertEntry(vault, 'resources', { name: 'Oxium', quantity: 1 });
  vault = inv.upsertEntry(vault, 'resources', { name: 'Kuva', quantity: 100 });

  vault = inv.adjustQuantity(vault, 'resources', 'resource:oxium', -5);
  assert.strictEqual(vault.resources[0].quantity, 0, 'quantity floors at zero');
  assert.strictEqual(vault.resources[1].quantity, 100);

  vault = inv.removeEntry(vault, 'resources', 'resource:kuva');
  assert.strictEqual(vault.resources.length, 1);
  assert.strictEqual(vault.resources[0].name, 'Oxium');
});

test('summarizeInventory counts entries and units per kind', function () {
  const summary = inv.summarizeInventory({
    resources: [{ name: 'Orokin Cell', quantity: 12 }, { name: 'Kuva', quantity: 8 }],
    relics: [{ name: 'A1', era: 'Axi', refinement: 'Radiant', quantity: 3 }],
    primeParts: []
  });
  assert.strictEqual(summary.resources.entries, 2);
  assert.strictEqual(summary.resources.units, 20);
  assert.strictEqual(summary.relics.units, 3);
  assert.strictEqual(summary.primeParts.entries, 0);
  assert.strictEqual(summary.totalEntries, 3);
  assert.strictEqual(summary.totalUnits, 23);
});

test('filterEntries matches every token across searchable fields', function () {
  const relics = inv.normalizeInventory({
    relics: [
      { name: 'A1', era: 'Lith', refinement: 'Radiant', quantity: 2 },
      { name: 'G1', era: 'Meso', refinement: 'Intact', quantity: 1, note: 'Saved for Volt Prime' }
    ]
  }).relics;

  assert.strictEqual(inv.filterEntries('relics', relics, 'lith radiant').length, 1);
  assert.strictEqual(inv.filterEntries('relics', relics, 'volt').length, 1);
  assert.strictEqual(inv.filterEntries('relics', relics, '').length, 2);
  assert.strictEqual(inv.filterEntries('relics', relics, 'axi').length, 0);
});

test('sortEntries is stable and deterministic', function () {
  const list = inv.normalizeInventory({
    resources: [
      { name: 'Kuva', quantity: 5 },
      { name: 'Argon Crystal', quantity: 5 },
      { name: 'Oxium', quantity: 90 }
    ]
  }).resources;

  assert.deepStrictEqual(
    inv.sortEntries('resources', list, 'name-asc').map(function (e) { return e.name; }),
    ['Argon Crystal', 'Kuva', 'Oxium']
  );
  assert.deepStrictEqual(
    inv.sortEntries('resources', list, 'qty-desc').map(function (e) { return e.name; }),
    ['Oxium', 'Argon Crystal', 'Kuva']
  );
  assert.deepStrictEqual(
    inv.sortEntries('resources', list, 'qty-asc').map(function (e) { return e.name; }),
    ['Argon Crystal', 'Kuva', 'Oxium']
  );
});

test('export payload round-trips through parseImportPayload', function () {
  const vault = inv.upsertEntry(inv.createSeedInventory(), 'relics', {
    name: 'C7', era: 'Neo', refinement: 'Flawless', quantity: 4
  });
  const payload = inv.buildExportPayload(vault, '2026-07-24T10:00:00.000Z');
  assert.strictEqual(payload.app, 'warframe-companion-app');
  assert.strictEqual(payload.type, 'inventory');

  const result = inv.parseImportPayload(JSON.stringify(payload));
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(result.inventory.relics, vault.relics);
  assert.deepStrictEqual(result.inventory.resources, vault.resources);
});

test('parseImportPayload accepts a bare inventory object', function () {
  const result = inv.parseImportPayload('{"resources":[{"name":"Tellurium","quantity":6}]}');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.inventory.resources[0].quantity, 6);
});

test('parseImportPayload reports useful errors', function () {
  assert.strictEqual(inv.parseImportPayload('').ok, false);
  assert.strictEqual(inv.parseImportPayload('not json').ok, false);
  assert.strictEqual(inv.parseImportPayload('[1,2,3]').ok, false);
  assert.strictEqual(inv.parseImportPayload('{"foo":1}').ok, false);
  assert.ok(inv.parseImportPayload('not json').error.length > 0);
});

test('merge keeps the higher quantity and is idempotent', function () {
  const base = inv.normalizeInventory({ resources: [{ name: 'Orokin Cell', quantity: 40 }] });
  const incoming = inv.normalizeInventory({
    resources: [{ name: 'Orokin Cell', quantity: 12 }, { name: 'Neurode', quantity: 3 }]
  });

  const merged = inv.mergeInventories(base, incoming, 'merge');
  assert.strictEqual(merged.resources.length, 2);
  assert.strictEqual(merged.resources[0].quantity, 40);
  assert.strictEqual(merged.resources[1].quantity, 3);

  const mergedTwice = inv.mergeInventories(merged, incoming, 'merge');
  assert.deepStrictEqual(mergedTwice.resources, merged.resources);
});

test('replace mode discards the current vault', function () {
  const base = inv.normalizeInventory({ resources: [{ name: 'Orokin Cell', quantity: 40 }] });
  const incoming = inv.normalizeInventory({ resources: [{ name: 'Neurode', quantity: 3 }] });
  const replaced = inv.mergeInventories(base, incoming, 'replace');
  assert.strictEqual(replaced.resources.length, 1);
  assert.strictEqual(replaced.resources[0].name, 'Neurode');
});

test('seed inventory starts with an Orokin Cell row', function () {
  const seed = inv.createSeedInventory();
  assert.strictEqual(seed.resources.length, 1);
  assert.strictEqual(seed.resources[0].name, 'Orokin Cell');
  assert.strictEqual(seed.resources[0].quantity, 0);
});

test('exportFileName uses the export date when available', function () {
  assert.strictEqual(inv.exportFileName('2026-07-24T10:00:00.000Z'), 'warframe-inventory-2026-07-24.json');
  assert.strictEqual(inv.exportFileName(''), 'warframe-inventory-backup.json');
});

test('describeSyncStatus reports manual mode only', function () {
  const status = inv.describeSyncStatus(inv.createSeedInventory());
  assert.strictEqual(status.mode, 'manual');
  assert.strictEqual(status.trackedEntries, 1);
  assert.ok(/not available yet/i.test(status.detail));
});

test('storage round-trip survives a corrupt payload', function () {
  const store = {
    values: {},
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null; },
    setItem: function (key, value) { this.values[key] = String(value); }
  };
  inv.setStorage(store);

  const saved = inv.writeInventory(
    inv.upsertEntry(inv.createEmptyInventory(), 'resources', { name: 'Hexenon', quantity: 22 }),
    '2026-07-24T10:00:00.000Z'
  );
  assert.strictEqual(saved.updatedAt, '2026-07-24T10:00:00.000Z');
  assert.strictEqual(inv.readInventory().resources[0].quantity, 22);

  store.values[inv.STORAGE_KEY] = '{not json';
  assert.deepStrictEqual(inv.readInventory(), inv.createEmptyInventory());

  inv.setStorage(null);
});

test('module loads outside Electron without touching the DOM', function () {
  assert.strictEqual(typeof inv.init, 'function');
  assert.strictEqual(inv.init(), false);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
