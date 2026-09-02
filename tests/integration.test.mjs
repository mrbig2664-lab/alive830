import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {};
const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
  clear() { values.clear(); }
};

const { createStore, getRecord, upsertRecord } = await import('../src/state/store.js');
const { TIMEZONE, allocateLifeSeed, createSmokeCorrection, createSmokeEvent, currentSeedLedger, ensureFirstEncounter, localDateKey, smokeCount } = await import('../src/state/domain.js');

test.beforeEach(() => values.clear());

test('interactive domain records smoke, creates encounter, and appends undo correction', async () => {
  const store = createStore(TIMEZONE);
  let first;
  const saved = await store.init();
  const today = localDateKey(new Date(), TIMEZONE);
  const next = await store.update(state => {
    first = createSmokeEvent(state, today);
    ensureFirstEncounter(state, first);
    createSmokeCorrection(state, first);
  });
  assert.equal(smokeCount(next, today), 7);
  assert.equal(next.events.filter(event => event.type === 'smokeCorrection').length, 1);
  assert.equal(getRecord(next, 'encounter:smokeBeast').relationshipStage, 'encounter');
  assert.ok(saved.world.firstSmokeEncountered);
});

test('mood/check-in data and plant/egg nurture survive IndexedDB fallback reload', async () => {
  const firstStore = createStore(TIMEZONE);
  await firstStore.init();
  await firstStore.update(state => {
    upsertRecord(state, { key: 'checkin:2026-08-30', type: 'bodyCheckIn', localDate: '2026-08-30', mood: 'good', energy: 5, bodyFeel: 5, food: '清爽' });
    const plant = allocateLifeSeed(state, '2026-08-30', 'plant');
    const egg = allocateLifeSeed(state, '2026-08-30', 'egg');
    assert.equal(plant.ok, true);
    assert.equal(egg.ok, true);
  });
  const secondStore = createStore(TIMEZONE);
  const restored = await secondStore.init();
  assert.equal(getRecord(restored, 'checkin:2026-08-30').mood, 'good');
  assert.equal(restored.world.plantStage, 'stage_02');
  assert.equal(restored.world.eggStage, 'stage_02');
  assert.equal(currentSeedLedger(restored, '2026-08-30').allocations.plant, 1);
});

test('calendar boundary remains Asia/Shanghai based', () => {
  assert.equal(localDateKey(new Date('2026-08-30T15:59:00.000Z'), TIMEZONE), '2026-08-30');
  assert.equal(localDateKey(new Date('2026-08-30T16:00:00.000Z'), TIMEZONE), '2026-08-31');
});
