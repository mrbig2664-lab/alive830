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

const { createStore, createCleanStartState, createStateBackup, getRecord } = await import('../src/state/store.js');
const {
  TIMEZONE, activeLifeEvents, correctLifeEvent, createLifeEvent, createSmokeCorrection, createSmokeEvent,
  deriveDailySummary, deleteLifeEvent, exerciseMinutes, getDailySummaries, latestLifeEvent,
  localDateKey, localDateTimeToIso, monthDayLabel, shiftLocalDate, smokeCount, smokeHistory
} = await import('../src/state/domain.js');
const { MAX_VISIBLE_RESIDENTS, ROOM_RESIDENT_ANCHORS, RESIDENT_CLASSES, placeResidents, placementAudit } = await import('../src/data/residents.js');

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
  assert.equal(placed[0].anchor, 'rug_back_right');
  assert.equal(placed[1].anchor, 'table_side');
  assert.ok(placed.every(resident => resident.residentClass === RESIDENT_CLASSES.VISITOR));
});

test('resident placement rejects overcrowding and keeps core residents out of visitor anchors', () => {
  const candidates = [
    { id: 'liver', residentClass: RESIDENT_CLASSES.VISITOR },
    { id: 'muscle', residentClass: RESIDENT_CLASSES.VISITOR },
    { id: 'moon', residentClass: RESIDENT_CLASSES.VISITOR },
    { id: 'water', residentClass: RESIDENT_CLASSES.VISITOR },
    { id: 'zhanzhan', residentClass: RESIDENT_CLASSES.CORE }
  ];
  const audit = placementAudit(candidates);
  assert.equal(audit.eligible, 5);
  assert.equal(audit.placed, 2);
  assert.equal(audit.skipped, 3);
  assert.equal(audit.overcrowded, false);
  assert.deepEqual(audit.anchors, ['rug_back_right', 'table_side']);
});

test('clean start preserves app configuration, creates a backup, and clears user data only', () => {
  const source = {
    schemaVersion: 2, userId: 'local-user', timezone: TIMEZONE,
    appConfig: { version: 'v4' }, assetRegistry: { room: 'locked' },
    events: [{ id: 'test-smoke', type: 'smoke' }], records: [{ key: 'settlement:test', type: 'settlement' }],
    world: { plantStage: 'stage_04', eggStage: 'stage_03', lifeSeeds: 9 }, meta: { note: 'preserve' }
  };
  const backup = createStateBackup(source, '2026-09-04T00:00:00.000Z');
  const clean = createCleanStartState(source, '2026-09-04');
  assert.equal(backup.format, 'alive-v4-state-backup-v1');
  assert.equal(backup.state.events.length, 1);
  assert.deepEqual(clean.events, []);
  assert.deepEqual(clean.records, []);
  assert.equal(clean.world.plantStage, 'stage_01');
  assert.equal(clean.world.lifeSeeds, 0);
  assert.deepEqual(clean.appConfig, source.appConfig);
  assert.deepEqual(clean.assetRegistry, source.assetRegistry);
  assert.equal(clean.meta.cleanStartBoundary, '2026-09-04');
});

test('production store initializes clean without demo seed while preserving schema', async () => {
  const store = createStore(TIMEZONE, { seedDemo: false });
  const state = await store.init();
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.events.filter(event => event.source === 'previewSeed').length, 0);
});

test('store reset writes a backup before clearing user data and records the boundary only as metadata', async () => {
  const store = createStore(TIMEZONE, { seedDemo: false });
  await store.init();
  await store.update(state => {
    state.events.push({ id: 'old-event', type: 'drink', localDate: '2026-09-03', tombstone: false });
    state.appConfig = { unchanged: true };
  });
  const result = await store.resetUserData('2026-09-04');
  assert.equal(result.backup.state.events[0].id, 'old-event');
  assert.deepEqual(result.state.events, []);
  assert.equal(result.state.meta.cleanStartBoundary, '2026-09-04');
  assert.deepEqual(result.state.appConfig, { unchanged: true });
  assert.equal(result.state.timezone, TIMEZONE);
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

test('daily projection keeps Sep 1 and Sep 2 data isolated and queryable', async () => {
  const store = createStore(TIMEZONE);
  await store.init();
  const saved = await store.update(state => {
    state.events = [];
    state.records = [];
    createLifeEvent(state, '2026-09-01', 'drink', { quantity: 2 });
    createLifeEvent(state, '2026-09-01', 'exercise', { durationMinutes: 45 });
    createLifeEvent(state, '2026-09-01', 'water', { quantity: 3 });
    createLifeEvent(state, '2026-09-02', 'drink', { quantity: 1 });
    createLifeEvent(state, '2026-09-02', 'exercise', { durationMinutes: 30 });
    createLifeEvent(state, '2026-09-02', 'exercise', { durationMinutes: 45 });
    createLifeEvent(state, '2026-09-02', 'water', { quantity: 1 });
  });
  const yesterday = deriveDailySummary(saved, '2026-09-01');
  const today = deriveDailySummary(saved, '2026-09-02');
  assert.equal(yesterday.drinkCount, 2);
  assert.equal(yesterday.exerciseMinutes, 45);
  assert.equal(yesterday.waterCount, 3);
  assert.equal(today.drinkCount, 1);
  assert.equal(today.exerciseMinutes, 75);
  assert.equal(today.waterCount, 1);
  assert.deepEqual(getDailySummaries(saved, '2026-09-01', '2026-09-02').map(item => item.date), ['2026-09-01', '2026-09-02']);
});

test('Asia/Shanghai day boundaries roll from Aug 31 to Sep 1 to Sep 2', () => {
  assert.equal(localDateKey(new Date('2026-08-31T15:59:59.000Z'), TIMEZONE), '2026-08-31');
  assert.equal(localDateKey(new Date('2026-08-31T16:00:00.000Z'), TIMEZONE), '2026-09-01');
  assert.equal(localDateKey(new Date('2026-09-01T15:59:59.000Z'), TIMEZONE), '2026-09-01');
  assert.equal(localDateKey(new Date('2026-09-01T16:00:00.000Z'), TIMEZONE), '2026-09-02');
  assert.equal(monthDayLabel('2026-09-02', TIMEZONE), '9月2日');
});

test('daily smoke history preserves chronological timestamps and Undo only corrects its day', async () => {
  const store = createStore(TIMEZONE);
  await store.init();
  const saved = await store.update(state => {
    state.events = [];
    const first = createSmokeEvent(state, '2026-09-01');
    const second = createSmokeEvent(state, '2026-09-01');
    const today = createSmokeEvent(state, '2026-09-02');
    first.occurredAt = '2026-09-01T01:14:00.000Z';
    second.occurredAt = '2026-09-01T02:26:00.000Z';
    today.occurredAt = '2026-09-02T01:48:00.000Z';
    createSmokeCorrection(state, second);
  });
  const sep1 = deriveDailySummary(saved, '2026-09-01');
  const sep2 = deriveDailySummary(saved, '2026-09-02');
  assert.deepEqual(sep1.smokeTimestamps, ['2026-09-01T01:14:00.000Z']);
  assert.deepEqual(sep2.smokeTimestamps, ['2026-09-02T01:48:00.000Z']);
});

test('legacy preview seed is retained but excluded from a real-day projection', async () => {
  const store = createStore(TIMEZONE);
  await store.init();
  const saved = await store.update(state => {
    state.events = [{ id: 'demo', type: 'smoke', localDate: '2026-09-02', occurredAt: '2026-09-02T00:00:00.000Z', source: 'previewSeed', tombstone: false }];
    state.records = [{ key: 'demo-move', type: 'moveEvent', localDate: '2026-09-02', durationMinutes: 870, source: 'previewSeed', tombstone: false }];
  });
  const summary = deriveDailySummary(saved, '2026-09-02');
  assert.equal(summary.smokeCount, 0);
  assert.equal(summary.exerciseMinutes, 0);
  assert.equal(saved.events.length, 1);
  assert.equal(saved.records.length, 1);
});

test('event-level corrections preserve originals and recalculate drink/exercise/water projections', async () => {
  const store = createStore(TIMEZONE);
  await store.init();
  let drinkId;
  const saved = await store.update(state => {
    state.events = [];
    state.records = [];
    const drink = createLifeEvent(state, DATE, 'drink', { quantity: 1, unit: '杯' });
    drinkId = drink.id;
    createLifeEvent(state, DATE, 'drink', { quantity: 1, unit: '杯' });
    const exercise = createLifeEvent(state, DATE, 'exercise', { durationMinutes: 45, unit: 'min' });
    createLifeEvent(state, DATE, 'water', { quantity: 1, unit: '杯' });
    correctLifeEvent(state, exercise.id, { durationMinutes: 90, occurredAt: localDateTimeToIso(DATE, '18:20') });
    deleteLifeEvent(state, drink.id);
  });
  const summary = deriveDailySummary(saved, DATE);
  assert.equal(summary.drinkCount, 1);
  assert.equal(summary.exerciseMinutes, 90);
  assert.equal(summary.waterCount, 1);
  assert.equal(summary.exerciseSessions[0].durationMinutes, 90);
  assert.equal(saved.events.filter(event => event.type === 'eventCorrection').length, 2);
  assert.equal(saved.events.find(event => event.type === 'eventCorrection' && event.action === 'delete').original.quantity, 1);
  assert.equal(saved.events.find(event => event.id === drinkId).tombstone, true);
});

test('legacy drink, exercise, water and sleep records are individually correctable', async () => {
  const store = createStore(TIMEZONE);
  await store.init();
  let ids;
  const saved = await store.update(state => {
    state.events = [];
    state.records = [];
    const drink = { key: 'drinkDaily:2026-08-30:1', id: 'legacy-drink', type: 'drinkDaily', localDate: DATE, occurredAt: localDateTimeToIso(DATE, '20:14'), quantity: 1, source: 'quickLog', tombstone: false };
    const exercise = { key: 'moveEvent:2026-08-30:1', id: 'legacy-exercise', type: 'moveEvent', localDate: DATE, occurredAt: localDateTimeToIso(DATE, '07:30'), durationMinutes: 1100, source: 'quickLog', tombstone: false };
    const water = { key: 'waterEvent:2026-08-30:1', id: 'legacy-water', type: 'waterEvent', localDate: DATE, occurredAt: localDateTimeToIso(DATE, '09:00'), quantity: 1, source: 'quickLog', tombstone: false };
    const sleep = { key: 'sleepLog:2026-08-30:1', id: 'legacy-sleep', type: 'sleepLog', localDate: DATE, occurredAt: localDateTimeToIso(DATE, '23:48'), bedtime: '23:48', source: 'quickLog', tombstone: false };
    state.records.push(drink, exercise, water, sleep);
    ids = { drink: drink.id, exercise: exercise.id, water: water.id, sleep: sleep.id };
  });
  const corrected = await store.update(state => {
    correctLifeEvent(state, ids.drink, { quantity: 1 });
    correctLifeEvent(state, ids.exercise, { durationMinutes: 45, occurredAt: localDateTimeToIso(DATE, '18:20') });
    deleteLifeEvent(state, ids.water);
    correctLifeEvent(state, ids.sleep, { bedtime: '22:30', occurredAt: localDateTimeToIso(DATE, '22:30') });
  });
  const summary = deriveDailySummary(corrected, DATE);
  assert.equal(summary.drinkCount, 1);
  assert.equal(summary.exerciseMinutes, 45);
  assert.equal(summary.waterCount, 0);
  assert.equal(summary.sleep.bedtime, '22:30');
  assert.equal(corrected.events.filter(event => event.type === 'eventCorrection').length, 4);
  const restored = await createStore(TIMEZONE).init();
  assert.equal(deriveDailySummary(restored, DATE).exerciseMinutes, 45);
  assert.equal(deriveDailySummary(restored, DATE).waterCount, 0);
});

test('manual smoke correction reorders history, renumbers projection, and survives reload', async () => {
  const firstStore = createStore(TIMEZONE);
  await firstStore.init();
  let thirdId;
  await firstStore.update(state => {
    state.events = [];
    const first = createSmokeEvent(state, DATE);
    const second = createSmokeEvent(state, DATE);
    const third = createSmokeEvent(state, DATE);
    thirdId = third.id;
    first.occurredAt = localDateTimeToIso(DATE, '09:42');
    second.occurredAt = localDateTimeToIso(DATE, '11:17');
    third.occurredAt = localDateTimeToIso(DATE, '13:06');
  });
  const saved = await firstStore.update(state => correctLifeEvent(state, thirdId, { occurredAt: localDateTimeToIso(DATE, '08:08') }));
  assert.deepEqual(smokeHistory(saved, DATE).map(event => event.occurredAt), [
    localDateTimeToIso(DATE, '08:08'), localDateTimeToIso(DATE, '09:42'), localDateTimeToIso(DATE, '11:17')
  ]);
  const secondStore = createStore(TIMEZONE);
  const restored = await secondStore.init();
  assert.equal(smokeCount(restored, DATE), 3);
  assert.equal(restored.events.filter(event => event.type === 'eventCorrection').length, 1);
});

test('history date helpers keep yesterday queryable without mixing into today', () => {
  assert.equal(shiftLocalDate('2026-09-02', -1), '2026-09-01');
  assert.equal(shiftLocalDate('2026-09-01', -1), '2026-08-31');
  assert.equal(localDateTimeToIso('2026-09-02', '00:08'), '2026-09-01T16:08:00.000Z');
});
