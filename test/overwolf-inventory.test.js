'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const {
  createOverwolfInventoryAdapter,
  normalizeInventorySnapshot
} = require('../overwolf-inventory');

test('normalizes nested ItemType and ItemCount entries without retaining raw fields', () => {
  var rawInventory = {
    Credits: 1000,
    Inventory: [
      {
        ItemType: '/Lotus/Types/Recipes/Components/Alpha',
        ItemCount: 2,
        RawPrivateField: 'do-not-copy'
      },
      JSON.stringify({
        ItemType: '/Lotus/Types/Recipes/Components/Beta',
        ItemCount: '3'
      }),
      { ItemType: '', ItemCount: 4 },
      { ItemType: '/Lotus/Invalid', ItemCount: -1 }
    ]
  };

  var snapshot = normalizeInventorySnapshot(rawInventory, {
    gameId: 2163,
    capturedAt: 1234
  });

  assert.deepEqual(snapshot, {
    source: 'overwolf-gep',
    game: 'Warframe',
    gameId: 2163,
    capturedAt: 1234,
    items: [
      { itemType: '/Lotus/Types/Recipes/Components/Alpha', count: 2 },
      { itemType: '/Lotus/Types/Recipes/Components/Beta', count: 3 }
    ]
  });
  assert.equal(JSON.stringify(snapshot).includes('RawPrivateField'), false);
  assert.equal(JSON.stringify(snapshot).includes('Credits'), false);
});

test('provides a harmless fallback in normal Electron', () => {
  var statuses = [];
  var adapter = createOverwolfInventoryAdapter({
    app: {},
    onStatus: (status) => statuses.push(status)
  });

  var status = adapter.initialize();

  assert.equal(status.runtime, 'electron');
  assert.equal(status.gepAvailable, false);
  assert.equal(status.state, 'unavailable');
  assert.equal(adapter.getSnapshot(), null);
  assert.equal(statuses.length, 1);
});

test('reports ow-electron separately when the GEP package is unavailable', () => {
  var adapter = createOverwolfInventoryAdapter({
    app: { overwolf: { packages: {} } }
  });

  var status = adapter.initialize();

  assert.equal(status.runtime, 'ow-electron');
  assert.equal(status.gepAvailable, false);
  assert.equal(status.state, 'unavailable');
  assert.match(status.error, /credentials|signing/i);
});

test('subscribes to Warframe match_info and publishes normalized snapshots', async () => {
  class FakeGep extends EventEmitter {
    constructor() {
      super();
      this.requiredFeatures = [];
    }

    async setRequiredFeatures(gameId, features) {
      this.requiredFeatures.push([gameId, features]);
    }

    async getInfo() {
      return {};
    }
  }

  var gep = new FakeGep();
  var snapshots = [];
  var enableCalls = 0;
  var adapter = createOverwolfInventoryAdapter({
    app: { overwolf: { packages: { gep: gep } } },
    now: () => 9999,
    onSnapshot: (snapshot) => snapshots.push(snapshot)
  });

  adapter.initialize();
  gep.emit('game-detected', { enable: () => { enableCalls += 1; } }, 2163, 'Warframe');
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(enableCalls, 1);
  assert.deepEqual(gep.requiredFeatures, [[2163, ['match_info']]]);
  assert.equal(adapter.getStatus().state, 'active');

  gep.emit('new-info-update', {}, 2163, {
    feature: 'match_info',
    category: 'match_info',
    key: 'inventory',
    value: JSON.stringify([
      { ItemType: '/Lotus/Types/Items/TestItem', ItemCount: 5 }
    ])
  });

  assert.deepEqual(snapshots, [{
    source: 'overwolf-gep',
    game: 'Warframe',
    gameId: 2163,
    capturedAt: 9999,
    items: [{ itemType: '/Lotus/Types/Items/TestItem', count: 5 }]
  }]);
});

test('ignores other games, features, and inventory-shaped event data', async () => {
  class FakeGep extends EventEmitter {
    async setRequiredFeatures() {}
  }

  var gep = new FakeGep();
  var snapshots = [];
  var adapter = createOverwolfInventoryAdapter({
    app: { overwolf: { packages: { gep: gep } } },
    onSnapshot: (snapshot) => snapshots.push(snapshot)
  });

  adapter.initialize();
  gep.emit('game-detected', { enable: () => {} }, 2163, 'Warframe');
  await new Promise((resolve) => setImmediate(resolve));
  gep.emit('new-info-update', {}, 2163, {
    feature: 'chat',
    category: 'chat',
    key: 'inventory',
    value: [{ ItemType: '/Lotus/Should/Not/Leak', ItemCount: 1 }]
  });
  gep.emit('new-info-update', {}, 9999, {
    feature: 'match_info',
    category: 'match_info',
    key: 'inventory',
    value: [{ ItemType: '/Lotus/Other/Game', ItemCount: 1 }]
  });

  assert.deepEqual(snapshots, []);
});
