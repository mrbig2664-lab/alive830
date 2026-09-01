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

const { createStore, getRecord } = await import('../src/state/store.js');
const {
  TIMEZONE, activeLifeEvents, createLifeEvent, createSmokeCorrection, createSmokeEvent,
  exerciseMinutes, latestLifeEvent, smokeCount, smokeHistory
} = await import('../src/state/domain.js');
const { MAX_VISIBLE_RESIDENTS, ROOM_RESIDENT_ANCHORS, placeResidents } = await import('../src/data/residents.js');

const DATE = '2026-08-30';

test.beforeEach(() => values.clear());

test('drink, water and exercise append repeatable timestamped events and project totals', async () => {
  const store = createStore(TIMEZONE);
  await store.init();
  const saved = await store.update(state => {
    state.events = [];
    state.records = [];
    createLifeEvent(state, DATE, 'drink', { quantity: 1, unit: '杯' });
    createLifeEvent(state, DATE, 'drink', { quantity: 1, unit: '杯' });
    createLifeEvent(state, DATE, 'water', { quantity: 1, unit: '杯' });
    createLifeEvent(state, DATE, 'water', { quantity: 1, unit: '杯' });
    createLifeEvent(state, DATE, 'water', { quantity: 1, unit: '杯' });
    createLifeEvent(state, DATE, 'exercise', { durationMinutes: 30, unit: 'min' });
    createLifeEvent(state, DATE, 'exercise', { durationMinutes: 45, unit: 'min' });
  });
  assert.equal(activeLifeEvents(saved, DATE, 'drink').length, 2);
  assert.equal(activeLifeEvents(saved, DATE, 'water').length, 3);
  assert.equal(exerciseMinutes(saved, DATE), 75);
  assert.equal(activeLifeEvents(saved, DATE, 'drink').every(event => event.occurredAt && event.timezone === TIMEZONE), true);
});

test('smoke history is chronological and Undo removes the corrected event', async () => {
  const store = createStore(TIMEZONE);
  await store.init();
  const saved = await store.update(state => {
    state.events = [];
    const first = createSmokeEvent(state, DATE);
    const second = createSmokeEvent(state, DATE);
    const third = createSmokeEvent(state, DATE);
    first.occurredAt = '2026-08-30T01:42:00.000Z';
    second.occurredAt = '2026-08-30T03:17:00.000Z';
    third.occurredAt = '2026-08-30T05:06:00.000Z';
    createSmokeCorrection(state, second);
  });
  assert.deepEqual(smokeHistory(saved, DATE).map(event => event.occurredAt), [
    '2026-08-30T01:42:00.000Z',
    '2026-08-30T05:06:00.000Z'
  ]);
  assert.equal(smokeCount(saved, DATE), 2);
});

test('bedtime is a persistent sleep-start event with a visible rest state', async () => {
  const firstStore = createStore(TIMEZONE);
  await firstStore.init();
  await firstStore.update(state => {
    state.events = [];
    createLifeEvent(state, DATE, 'sleep_start', { bedtime: '23:41' });
    state.world.restState = 'bedtime';
    state.world.lastSleepStart = new Date().toISOString();
  });
  const secondStore = createStore(TIMEZONE);
  const restored = await secondStore.init();
  assert.equal(latestLifeEvent(restored, DATE, 'sleep_start').bedtime, '23:41');
  assert.equal(restored.world.restState, 'bedtime');
  assert.match(latestLifeEvent(restored, DATE, 'sleep_start').occurredAt, /^2026|^20/);
});

test('resident placement uses unique semantic anchors and an explicit visible limit', () => {
  const placed = placeResidents([
    { id: 'liver' }, { id: 'muscle' }, { id: 'water' }, { id: 'moon' }, { id: 'liver' }
  ]);
  assert.equal(placed.length, MAX_VISIBLE_RESIDENTS);
  assert.equal(new Set(placed.map(resident => resident.anchor)).size, placed.length);
  assert.ok(placed.every(resident => ROOM_RESIDENT_ANCHORS.some(anchor => anchor.id === resident.anchor)));
  assert.equal(placed[0].anchor, 'resident_rug_back_left');
  assert.equal(placed[1].anchor, 'resident_rug_back_right');
});

test('repeatable events survive a store reload', async () => {
  const firstStore = createStore(TIMEZONE);
  await firstStore.init();
  await firstStore.update(state => {
    state.events = [];
    state.records = [];
    createLifeEvent(state, DATE, 'drink', { quantity: 1 });
    createLifeEvent(state, DATE, 'drink', { quantity: 1 });
  });
  const secondStore = createStore(TIMEZONE);
  const restored = await secondStore.init();
  assert.equal(activeLifeEvents(restored, DATE, 'drink').length, 2);
  assert.equal(getRecord(restored, 'encounter:smokeBeast'), null);
});
