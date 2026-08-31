const DB_NAME = 'alive-v4-clean-room';
const DB_VERSION = 1;
const DB_STORE = 'app';
const FALLBACK_KEY = 'alive-v4-clean-room-fallback';

function nowIso() { return new Date().toISOString(); }
function clone(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }

function previewSeed(timezone) {
  const now = nowIso();
  const smokeEvents = Array.from({ length: 7 }, (_, index) => ({
    id: `preview-smoke-${index + 1}`,
    clientEventId: `preview-client-${index + 1}`,
    userId: 'local-user', type: 'smoke', localDate: '2026-08-30',
    occurredAt: now, timezone, source: 'previewSeed', createdAt: now, updatedAt: now,
    ruleVersion: 'slice01-v1', tombstone: false, syncStatus: 'saved'
  }));
  return {
    schemaVersion: 2,
    userId: 'local-user', timezone,
    events: smokeEvents,
    records: [
      { key: 'encounter:smokeBeast', type: 'encounterRecord', encounterId: 'preview-encounter', characterId: 'smokeBeast', relationshipStage: 'encounter', encounterType: 'first', triggerEventId: smokeEvents[0].id, occurredAt: now, ruleVersion: 'slice01-v1', createdAt: now, updatedAt: now },
      { key: 'moveEvent:2026-08-30:preview', id: 'preview-move', type: 'moveEvent', localDate: '2026-08-30', occurredAt: now, durationMinutes: 60, source: 'previewSeed', createdAt: now, updatedAt: now },
      { key: 'sleepLog:2026-08-30:preview', id: 'preview-sleep', type: 'sleepLog', localDate: '2026-08-30', occurredAt: now, bedtime: '23:48', source: 'previewSeed', createdAt: now, updatedAt: now },
      ...Array.from({ length: 6 }, (_, index) => ({ key: `waterEvent:2026-08-30:preview-${index + 1}`, id: `preview-water-${index + 1}`, type: 'waterEvent', localDate: '2026-08-30', occurredAt: now, source: 'previewSeed', createdAt: now, updatedAt: now }))
    ],
    world: {
      roomStage: 'room', plantStage: 'stage_01', eggStage: 'stage_01', outsideStage: 'blank',
      plantGrowth: 0, eggGrowth: 0, outsideGrowth: 0, lifeSeeds: 2, seedJarStage: 'low',
      airState: 'slightlyGrey', smokeBeastRelationship: 'encounter', firstSmokeEncountered: true,
      lastSettlementId: null, lastRevealedChangeId: null, changedAt: now
    },
    updatedAt: now
  };
}

function migrateState(input, timezone) {
  const next = clone(input);
  next.schemaVersion = 2;
  next.timezone ||= timezone;
  next.events ||= [];
  next.records ||= [];
  next.world ||= {};
  if (next.world.plantStage === 'stageA') next.world.plantStage = 'stage_01';
  if (next.world.plantStage === 'stageB') next.world.plantStage = 'stage_02';
  next.world.plantStage ||= 'stage_01';
  next.world.eggStage ||= 'stage_01';
  next.world.outsideStage ||= 'blank';
  next.world.plantGrowth ||= 0;
  next.world.eggGrowth ||= 0;
  next.world.outsideGrowth ||= 0;
  next.world.lifeSeeds ||= 0;
  next.world.seedJarStage ||= 'empty';
  next.world.roomStage ||= 'room';
  next.world.airState ||= 'clear';
  next.world.smokeBeastRelationship ||= 'unknown';
  next.world.firstSmokeEncountered ||= false;
  return next;
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) request.result.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB failed'));
  });
}

export function createStore(timezone) {
  let db = null;
  let memory = null;

  async function init() {
    try {
      db = await openDb();
      memory = await readDb();
    } catch (error) {
      db = null;
      try { memory = JSON.parse(localStorage.getItem(FALLBACK_KEY) || 'null'); } catch (ignored) { memory = null; }
    }
    if (!memory || ![1, 2].includes(memory.schemaVersion)) memory = previewSeed(timezone);
    else if (memory.schemaVersion !== 2) memory = migrateState(memory, timezone);
    if (!memory.timezone) memory.timezone = timezone;
    return clone(memory);
  }

  function readDb() {
    return new Promise((resolve, reject) => {
      if (!db) { resolve(null); return; }
      const tx = db.transaction(DB_STORE, 'readonly');
      const request = tx.objectStore(DB_STORE).get('state');
      request.onsuccess = () => resolve(request.result?.payload || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function save(next) {
    memory = clone({ ...next, updatedAt: nowIso() });
    if (db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readwrite');
          tx.objectStore(DB_STORE).put({ id: 'state', payload: memory, savedAt: nowIso() });
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      } catch (error) { writeFallback(); }
    } else writeFallback();
    return clone(memory);
  }

  function writeFallback() {
    try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(memory)); } catch (ignored) {}
  }

  async function update(mutator) {
    const next = clone(memory);
    await mutator(next);
    return save(next);
  }

  return { init, get: async () => clone(memory), save, update, isIndexedDb: () => Boolean(db) };
}

export function upsertRecord(state, record) {
  const index = state.records.findIndex(item => item.key === record.key);
  if (index >= 0) state.records[index] = { ...state.records[index], ...record, updatedAt: nowIso() };
  else state.records.push({ ...record, createdAt: record.createdAt || nowIso(), updatedAt: nowIso() });
}

export function getRecord(state, key) { return state.records.find(item => item.key === key) || null; }
export function createId(prefix) {
  const tail = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}-${tail}`;
}
