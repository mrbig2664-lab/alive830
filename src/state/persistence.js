const DB_NAME = 'alive-v4-clean-room';
const DB_VERSION = 1;
const DB_STORE = 'app';
const FALLBACK_KEY = 'alive-v4-clean-room-fallback';
const BACKUP_FALLBACK_KEY = 'alive-v4-clean-room-backup';

function nowIso() { return new Date().toISOString(); }
function localDateKey(date = new Date(), timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(item => item.type !== 'literal').map(item => [item.type, item.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function clone(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }

export function createStateBackup(state, exportedAt = nowIso()) {
  return {
    format: 'alive-v4-state-backup-v1',
    exportedAt,
    timezone: state?.timezone || 'Asia/Shanghai',
    state: clone(state)
  };
}

export function createCleanStartState(input, cleanStartDate = null) {
  const now = nowIso();
  const source = input || {};
  const preserved = Object.fromEntries(Object.entries(source).filter(([key]) => !['events', 'records', 'world', 'dailyProjections', 'dailySummaries', 'summaries', 'updatedAt'].includes(key)));
  return {
    ...preserved,
    schemaVersion: 2,
    userId: source.userId || 'local-user',
    timezone: source.timezone || 'Asia/Shanghai',
    events: [],
    records: [],
    world: {
      roomStage: 'room', plantStage: 'stage_01', eggStage: 'stage_01', outsideStage: 'blank',
      plantGrowth: 0, eggGrowth: 0, outsideGrowth: 0, lifeSeeds: 0, seedJarStage: 'empty',
      airState: 'clear', smokeBeastRelationship: 'unknown', firstSmokeEncountered: false,
      lastSmokeAt: null, lastSleepStart: null, restState: 'day',
      lastSettlementId: null, lastRevealedChangeId: null, changedAt: now
    },
    meta: {
      ...(source.meta || {}),
      cleanStartBoundary: cleanStartDate || null,
      cleanStartResetAt: cleanStartDate ? now : null
    },
    updatedAt: now
  };
}

function previewSeed(timezone) {
  const now = nowIso();
  const previewDate = localDateKey(new Date(now), timezone);
  const smokeEvents = Array.from({ length: 7 }, (_, index) => ({
    id: `preview-smoke-${index + 1}`,
    clientEventId: `preview-client-${index + 1}`,
    userId: 'local-user', type: 'smoke', localDate: previewDate,
    occurredAt: now, timezone, source: 'previewSeed', createdAt: now, updatedAt: now,
    ruleVersion: 'slice01-v1', tombstone: false, syncStatus: 'saved'
  }));
  return {
    schemaVersion: 2,
    userId: 'local-user', timezone,
    events: smokeEvents,
    records: [
      { key: 'encounter:smokeBeast', type: 'encounterRecord', encounterId: 'preview-encounter', characterId: 'smokeBeast', relationshipStage: 'encounter', encounterType: 'first', triggerEventId: smokeEvents[0].id, occurredAt: now, ruleVersion: 'slice01-v1', createdAt: now, updatedAt: now },
      { key: `moveEvent:${previewDate}:preview`, id: 'preview-move', type: 'moveEvent', localDate: previewDate, occurredAt: now, durationMinutes: 60, source: 'previewSeed', createdAt: now, updatedAt: now },
      { key: `sleepLog:${previewDate}:preview`, id: 'preview-sleep', type: 'sleepLog', localDate: previewDate, occurredAt: now, bedtime: '23:48', source: 'previewSeed', createdAt: now, updatedAt: now },
      ...Array.from({ length: 6 }, (_, index) => ({ key: `waterEvent:${previewDate}:preview-${index + 1}`, id: `preview-water-${index + 1}`, type: 'waterEvent', localDate: previewDate, occurredAt: now, source: 'previewSeed', createdAt: now, updatedAt: now }))
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

export function createStore(timezone, options = {}) {
  const seedDemo = options.seedDemo !== false;
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
    if (!memory || ![1, 2].includes(memory.schemaVersion)) memory = seedDemo ? previewSeed(timezone) : createCleanStartState({ timezone }, null);
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

  async function saveBackup(backup) {
    if (db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readwrite');
          tx.objectStore(DB_STORE).put({ id: 'backup:last', payload: backup, savedAt: nowIso() });
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        return backup;
      } catch (error) { /* fallback below */ }
    }
    try { localStorage.setItem(BACKUP_FALLBACK_KEY, JSON.stringify(backup)); } catch (ignored) {}
    return backup;
  }

  async function backup() {
    const result = createStateBackup(memory);
    await saveBackup(result);
    return clone(result);
  }

  async function resetUserData(cleanStartDate = null) {
    const savedBackup = await backup();
    const next = createCleanStartState(memory, cleanStartDate);
    const savedState = await save(next);
    return { backup: savedBackup, state: savedState };
  }

  async function update(mutator) {
    const next = clone(memory);
    await mutator(next);
    return save(next);
  }

  return { init, get: async () => clone(memory), save, update, backup, resetUserData, isIndexedDb: () => Boolean(db) };
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
