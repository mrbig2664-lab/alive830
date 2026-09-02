import { createId, getRecord, upsertRecord } from './store.js';

export const TIMEZONE = 'Asia/Shanghai';
export const RULE_VERSION = 'slice01-v1';
export const PLANT_STAGES = ['stage_01', 'stage_02', 'stage_03', 'stage_04', 'stage_05', 'stage_06'];
export const EGG_STAGES = ['stage_01', 'stage_02', 'stage_03', 'stage_04', 'stage_05', 'stage_06'];
export const NURTURE_TARGETS = ['plant', 'egg', 'outside'];

export function localDateKey(date = new Date(), timezone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(item => item.type !== 'literal').map(item => [item.type, item.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function localTime(date = new Date(), timezone = TIMEZONE) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(value);
}

export function dateLabel(dateKey, timezone = TIMEZONE) {
  const date = new Date(`${dateKey}T12:00:00+08:00`);
  return new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, month: 'long', day: 'numeric', weekday: 'short' }).format(date).replace('星期', '周');
}

// This is the compact label used by the Home HUD.  It deliberately formats a
// date key rather than using a fixed/demo string, so the UI follows the user's
// local day boundary in the configured timezone.
export function monthDayLabel(dateKey, timezone = TIMEZONE) {
  const date = new Date(`${dateKey}T12:00:00+08:00`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'numeric', day: 'numeric' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(item => item.type !== 'literal').map(item => [item.type, item.value]));
  return `${values.month}月${values.day}日`;
}

export function isDemoSource(record) {
  return record?.source === 'previewSeed' || record?.source === 'demo';
}

export function activeSmokeEvents(state, dateKey) {
  const corrections = new Set(state.events.filter(event => event.type === 'smokeCorrection' && event.targetEventId).map(event => event.targetEventId));
  return state.events.filter(event => event.type === 'smoke' && event.localDate === dateKey && !event.tombstone && !corrections.has(event.id));
}
export function smokeHistory(state, dateKey) { return activeSmokeEvents(state, dateKey).sort((a, b) => (a.occurredAt || a.createdAt || '').localeCompare(b.occurredAt || b.createdAt || '')); }
export function smokeCount(state, dateKey) { return smokeHistory(state, dateKey).length; }
export function lastSmokeEvent(state, dateKey) { return smokeHistory(state, dateKey).at(-1) || null; }
export function activeLifeEvents(state, dateKey, type) {
  return state.events.filter(event => event.type === type && event.localDate === dateKey && !event.tombstone).sort((a, b) => (a.occurredAt || a.createdAt || '').localeCompare(b.occurredAt || b.createdAt || ''));
}
export function lifeEventCount(state, dateKey, type) { return activeLifeEvents(state, dateKey, type).reduce((total, event) => total + Number(event.quantity || 1), 0); }
export function exerciseMinutes(state, dateKey) { return activeLifeEvents(state, dateKey, 'exercise').reduce((total, event) => total + Number(event.durationMinutes || 0), 0); }
export function latestLifeEvent(state, dateKey, type) { return activeLifeEvents(state, dateKey, type).at(-1) || null; }
export function currentCheckin(state, dateKey) { return getRecord(state, `checkin:${dateKey}`); }
export function currentSettlement(state, dateKey) { return getRecord(state, `settlement:${dateKey}`); }
export function currentEncounter(state) { return getRecord(state, 'encounter:smokeBeast'); }
export function pendingCount(state) { return state.events.filter(event => event.syncStatus === 'pending').length; }

function projectableSmokeEvents(state, dateKey) {
  return smokeHistory(state, dateKey).filter(event => !isDemoSource(event));
}

function projectableLifeEvents(state, dateKey, type) {
  return activeLifeEvents(state, dateKey, type).filter(event => !isDemoSource(event));
}

function projectableLegacyRecords(state, dateKey, type) {
  return state.records
    .filter(record => record.type === type && record.localDate === dateKey && !record.tombstone && !isDemoSource(record))
    .sort((a, b) => (a.occurredAt || a.createdAt || '').localeCompare(b.occurredAt || b.createdAt || ''));
}

/**
 * Canonical read model for one local calendar day.
 *
 * Events remain append-only in state.events; this function is only a
 * projection.  Legacy records are read for compatibility, but clearly marked
 * preview/demo records are never allowed into a real day's totals.
 */
export function deriveDailySummary(state, dateKey) {
  const smoke = projectableSmokeEvents(state, dateKey);
  const drinks = [
    ...projectableLifeEvents(state, dateKey, 'drink'),
    ...projectableLegacyRecords(state, dateKey, 'drinkDaily')
  ].sort((a, b) => (a.occurredAt || a.createdAt || '').localeCompare(b.occurredAt || b.createdAt || ''));
  const exercise = [
    ...projectableLifeEvents(state, dateKey, 'exercise'),
    ...projectableLegacyRecords(state, dateKey, 'moveEvent')
  ].sort((a, b) => (a.occurredAt || a.createdAt || '').localeCompare(b.occurredAt || b.createdAt || ''));
  const water = [
    ...projectableLifeEvents(state, dateKey, 'water'),
    ...projectableLegacyRecords(state, dateKey, 'waterEvent')
  ].sort((a, b) => (a.occurredAt || a.createdAt || '').localeCompare(b.occurredAt || b.createdAt || ''));
  const sleep = [
    ...projectableLifeEvents(state, dateKey, 'sleep_start'),
    ...projectableLegacyRecords(state, dateKey, 'sleepLog')
  ].sort((a, b) => (a.occurredAt || a.createdAt || '').localeCompare(b.occurredAt || b.createdAt || '')).at(-1) || null;
  const checkin = currentCheckin(state, dateKey);
  const settlement = currentSettlement(state, dateKey);
  const seedLedger = currentSeedLedger(state, dateKey);

  return {
    date: dateKey,
    localDate: dateKey,
    smokeCount: smoke.length,
    smokeTimestamps: smoke.map(event => event.occurredAt || event.createdAt).filter(Boolean),
    smokeEvents: smoke,
    drinkCount: drinks.reduce((total, event) => total + Number(event.quantity || 1), 0),
    drinkQuantity: drinks.reduce((total, event) => total + Number(event.quantity || 1), 0),
    drinkTimestamps: drinks.map(event => event.occurredAt || event.createdAt).filter(Boolean),
    drinkEvents: drinks,
    exerciseMinutes: exercise.reduce((total, event) => total + Number(event.durationMinutes || 0), 0),
    exerciseSessions: exercise,
    waterCount: water.reduce((total, event) => total + Number(event.quantity || 1), 0),
    waterTimestamps: water.map(event => event.occurredAt || event.createdAt).filter(Boolean),
    waterEvents: water,
    bedtime: sleep,
    sleep,
    mood: checkin?.mood || null,
    checkIn: checkin,
    seeds: seedLedger ? {
      earned: Number(seedLedger.earned || 0),
      used: Number(seedLedger.allocated || 0),
      remaining: Number(seedLedger.remaining || 0)
    } : null,
    settlement: settlement ? {
      id: settlement.settlementId || settlement.key || null,
      status: settlement.finalized ? 'finalized' : 'recorded',
      record: settlement
    } : null
  };
}

export function getDailySummary(state, dateKey) {
  return deriveDailySummary(state, dateKey);
}

function dateKeyToUtc(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function utcToDateKey(value) {
  const date = new Date(value);
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

export function getDailySummaries(state, startDate, endDate) {
  const start = dateKeyToUtc(startDate);
  const end = dateKeyToUtc(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];
  const summaries = [];
  for (let cursor = start; cursor <= end; cursor += 86400000) summaries.push(deriveDailySummary(state, utcToDateKey(cursor)));
  return summaries;
}

export function shiftLocalDate(dateKey, days) {
  const value = dateKeyToUtc(dateKey);
  if (!Number.isFinite(value)) return dateKey;
  return utcToDateKey(value + Number(days || 0) * 86400000);
}

export function localDateTimeToIso(dateKey, time = '00:00') {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  const [hour, minute] = String(time).split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute)).toISOString();
}

function correctionSnapshot(target) {
  return Object.fromEntries(['id', 'key', 'type', 'localDate', 'occurredAt', 'quantity', 'unit', 'durationMinutes', 'bedtime', 'mood', 'value']
    .filter(key => target?.[key] !== undefined)
    .map(key => [key, target[key]]));
}

/** Correct one event/legacy event record while retaining a correction record. */
export function correctLifeEvent(state, targetId, changes = {}) {
  const target = state.events.find(event => event.id === targetId)
    || state.records.find(record => record.id === targetId || record.key === targetId);
  if (!target) return { ok: false, reason: 'notFound' };
  const now = new Date().toISOString();
  const isDelete = Boolean(changes.deleted);
  const correction = {
    id: createId('event-correction'), clientEventId: createId('client'), userId: state.userId,
    type: 'eventCorrection', action: isDelete ? 'delete' : 'edit', targetEventId: target.id || target.key,
    targetKind: state.events.includes(target) ? 'event' : 'record', localDate: target.localDate,
    occurredAt: now, timezone: state.timezone, source: 'manualCorrection', original: correctionSnapshot(target),
    changes: { ...changes, deleted: undefined }, createdAt: now, updatedAt: now, ruleVersion: RULE_VERSION,
    tombstone: false, syncStatus: 'pending'
  };
  state.events.push(correction);
  if (isDelete) target.tombstone = true;
  else for (const key of ['localDate', 'occurredAt', 'quantity', 'unit', 'durationMinutes', 'bedtime', 'mood', 'value']) if (changes[key] !== undefined) target[key] = changes[key];
  target.correctionMetadata = { ...(target.correctionMetadata || {}), correctionId: correction.id, correctedAt: now, action: correction.action, original: correction.original };
  target.updatedAt = now;
  return { ok: true, correction, target };
}

export function deleteLifeEvent(state, targetId) {
  return correctLifeEvent(state, targetId, { deleted: true });
}

/** Identify retained records that cannot safely be treated as today's data. */
export function auditDailyData(state, dateKey) {
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  const all = [...(state.events || []), ...(state.records || [])];
  return {
    demoRecords: all.filter(isDemoSource),
    unscopedRecords: all.filter(record => !validDate.test(record.localDate || '')),
    legacyRecordsOnDate: (state.records || []).filter(record => record.localDate === dateKey && !isDemoSource(record) && !['bodyCheckIn', 'settlement', 'lifeSeeds', 'dailyFocus', 'worldChange', 'seedAllocation'].includes(record.type))
  };
}

export function currentFocus(state, dateKey) {
  return getRecord(state, `focus:${dateKey}`) || {
    key: `focus:${dateKey}`, type: 'dailyFocus', localDate: dateKey, focusType: 'smoke', target: 10,
    recommendedBy: 'smokeTrend', userChanged: false, status: 'active', recoveryAdjusted: false, ruleVersion: RULE_VERSION
  };
}
export function normalizePlantStage(stage) { if (stage === 'stageA') return 'stage_01'; if (stage === 'stageB') return 'stage_02'; return PLANT_STAGES.includes(stage) ? stage : 'stage_01'; }
export function normalizeEggStage(stage) { return EGG_STAGES.includes(stage) ? stage : 'stage_01'; }
export function stageNumber(stage, stages = PLANT_STAGES) { return Math.max(1, stages.indexOf(stage) + 1); }
export function nextStage(stage, stages = PLANT_STAGES) { return stages[Math.min(stages.length - 1, stageNumber(stage, stages))]; }
export function currentSeedLedger(state, dateKey) { return getRecord(state, `lifeSeeds:${dateKey}`); }

export function dailySeedReward(state, dateKey) {
  const checkin = currentCheckin(state, dateKey);
  if (!checkin) return 0;
  const focus = currentFocus(state, dateKey);
  const count = smokeCount(state, dateKey);
  let reward = 1;
  if (count > 0) reward += 1;
  if (count <= Number(focus.target || 10)) reward += 1;
  if (checkin.energy >= 4 || checkin.bodyFeel >= 4) reward += 1;
  if (checkin.food === '清爽') reward += 1;
  return Math.min(5, reward);
}
export function ensureDailySeeds(state, dateKey) {
  const existing = currentSeedLedger(state, dateKey);
  if (existing) return existing;
  const earned = dailySeedReward(state, dateKey);
  const ledger = { key: `lifeSeeds:${dateKey}`, type: 'lifeSeeds', id: `life-seeds-${dateKey}`, localDate: dateKey, earned, remaining: earned, allocated: 0, allocations: { plant: 0, egg: 0, outside: 0 }, finalized: false, ruleVersion: RULE_VERSION };
  upsertRecord(state, ledger);
  return getRecord(state, ledger.key);
}
export function seedJarStageForBalance(balance) { if (balance <= 0) return 'empty'; if (balance <= 2) return 'low'; if (balance <= 5) return 'medium'; if (balance <= 8) return 'almost_full'; return 'full'; }
export function hasLifeRecord(state, dateKey, type) { return state.records.some(record => record.localDate === dateKey && record.type === type && !record.tombstone); }
export function createLifeRecord(state, dateKey, type, extra = {}) {
  const now = new Date().toISOString();
  const record = { key: `${type}:${dateKey}:${now}`, id: `${type}-${now}`, type, localDate: dateKey, occurredAt: now, timezone: state.timezone, source: 'quickLog', ruleVersion: RULE_VERSION, ...extra };
  upsertRecord(state, record);
  return record;
}
export function createLifeEvent(state, dateKey, type, extra = {}) {
  const now = new Date().toISOString();
  const event = { id: createId(type), clientEventId: createId('client'), userId: state.userId, type, localDate: dateKey, occurredAt: now, timezone: state.timezone, source: 'quickLog', createdAt: now, updatedAt: now, ruleVersion: RULE_VERSION, tombstone: false, syncStatus: 'pending', ...extra };
  state.events.push(event);
  return event;
}

export function allocateLifeSeed(state, dateKey, target) {
  if (!NURTURE_TARGETS.includes(target)) return { ok: false, reason: 'unknownTarget' };
  const ledger = ensureDailySeeds(state, dateKey);
  const current = Number(ledger.allocations?.[target] || 0);
  if (ledger.finalized || ledger.remaining <= 0) return { ok: false, reason: 'empty' };
  if (current >= 2) return { ok: false, reason: 'limit' };
  ledger.allocations = { plant: 0, egg: 0, outside: 0, ...(ledger.allocations || {}) };
  ledger.allocations[target] = current + 1;
  ledger.remaining -= 1;
  ledger.allocated += 1;
  const sourceEventIds = state.events.filter(event => event.localDate === dateKey && !event.tombstone).map(event => event.id);
  const allocation = { key: `seedAllocation:${dateKey}:${ledger.allocated}`, id: `seed-allocation-${dateKey}-${ledger.allocated}`, type: 'seedAllocation', localDate: dateKey, target, ordinal: ledger.allocated, sourceEventIds, ruleVersion: RULE_VERSION };
  upsertRecord(state, allocation);
  if (target === 'plant') {
    state.world.plantStage = normalizePlantStage(state.world.plantStage);
    const fromState = state.world.plantStage;
    const toState = nextStage(fromState, PLANT_STAGES);
    if (toState !== fromState) {
      state.world.plantStage = toState;
      upsertRecord(state, { key: `worldchange:nurture:${dateKey}:plant:${ledger.allocated}`, type: 'worldChange', changeId: `change-nurture-${dateKey}-plant-${ledger.allocated}`, changeType: 'plantStage', assetTarget: 'roomPlant', fromState, toState, sourceEventIds, ruleVersion: RULE_VERSION, eligibleAt: new Date().toISOString(), status: 'revealed', revealedAt: new Date().toISOString(), revealContext: 'settlement', settlementId: getRecord(state, `settlement:${dateKey}`)?.settlementId || null });
    }
  }
  if (target === 'egg') state.world.eggStage = nextStage(normalizeEggStage(state.world.eggStage), EGG_STAGES);
  if (target === 'outside') { state.world.outsideGrowth = Number(state.world.outsideGrowth || 0) + 1; state.world.outsideStage = state.world.outsideGrowth > 0 ? 'branch' : 'blank'; }
  state.world.lifeSeeds = Number(state.world.lifeSeeds || 0);
  state.world.seedJarStage = seedJarStageForBalance(state.world.lifeSeeds);
  state.world.changedAt = new Date().toISOString();
  return { ok: true, target, allocation, remaining: ledger.remaining, targetCount: ledger.allocations[target] };
}
export function finalizeLifeSeeds(state, dateKey) {
  const ledger = ensureDailySeeds(state, dateKey);
  if (!ledger.finalized) { state.world.lifeSeeds = Number(state.world.lifeSeeds || 0) + Number(ledger.remaining || 0); ledger.stored = Number(ledger.remaining || 0); ledger.remaining = 0; ledger.finalized = true; ledger.finalizedAt = new Date().toISOString(); }
  state.world.seedJarStage = seedJarStageForBalance(state.world.lifeSeeds);
  return ledger;
}

export function deriveAir(state, dateKey) { return smokeCount(state, dateKey) > 0 ? 'slightlyGrey' : 'clear'; }
export function deriveZhanzhan(state, dateKey, timeOfDay = 'day') {
  const checkin = currentCheckin(state, dateKey);
  if (currentSettlement(state, dateKey)) return 'settled';
  if (timeOfDay === 'morning') return 'morning';
  if (checkin && (checkin.energy <= 2 || checkin.bodyFeel <= 2)) return 'tired';
  return 'neutral';
}
export function deriveSmokeBeast(state, dateKey) {
  const encounter = currentEncounter(state);
  if (!encounter) return 'hidden';
  const last = lastSmokeEvent(state, dateKey);
  if (last && Date.now() - new Date(last.createdAt).getTime() < 9000) return 'eating';
  if (smokeCount(state, dateKey) >= 10) return 'full';
  return 'normal';
}
export function isMorning() { const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hour: 'numeric', hour12: false }).format(new Date())); return hour < 11; }

export function createSmokeEvent(state, dateKey) {
  const now = new Date();
  const event = { id: createId('smoke'), clientEventId: createId('client'), userId: state.userId, type: 'smoke', localDate: dateKey, occurredAt: now.toISOString(), timezone: state.timezone, source: 'quickLog', createdAt: now.toISOString(), updatedAt: now.toISOString(), ruleVersion: RULE_VERSION, tombstone: false, syncStatus: 'pending' };
  state.events.push(event);
  return event;
}
export function createSmokeCorrection(state, targetEvent) {
  const now = new Date().toISOString();
  targetEvent.tombstone = true; targetEvent.updatedAt = now;
  const correction = { id: createId('correction'), clientEventId: createId('client'), userId: state.userId, type: 'smokeCorrection', targetEventId: targetEvent.id, localDate: targetEvent.localDate, occurredAt: now, timezone: state.timezone, source: 'undo', createdAt: now, updatedAt: now, ruleVersion: RULE_VERSION, tombstone: false, syncStatus: 'pending' };
  state.events.push(correction);
  return correction;
}
export function ensureFirstEncounter(state, triggerEvent) {
  const existing = currentEncounter(state);
  if (existing || state.world.firstSmokeEncountered) return null;
  const encounter = { key: 'encounter:smokeBeast', type: 'encounterRecord', encounterId: createId('encounter'), characterId: 'smokeBeast', relationshipStage: 'encounter', encounterType: 'first', triggerEventId: triggerEvent.id, occurredAt: triggerEvent.occurredAt, ruleVersion: RULE_VERSION };
  upsertRecord(state, encounter);
  state.world.firstSmokeEncountered = true; state.world.smokeBeastRelationship = 'encounter'; state.world.changedAt = new Date().toISOString();
  return encounter;
}
export function ensureFocus(state, dateKey) { upsertRecord(state, currentFocus(state, dateKey)); }
export function createPlantChangeCandidate(state, dateKey, checkinId) {
  state.world.plantStage = normalizePlantStage(state.world.plantStage);
  if (state.world.plantStage !== 'stage_01') return null;
  const existing = state.records.find(record => record.type === 'worldChange' && record.assetTarget === 'roomPlant' && record.toState === 'stage_02');
  if (existing) return existing;
  const sourceEventIds = [...activeSmokeEvents(state, dateKey).map(event => event.id), checkinId];
  const change = { key: `worldchange:plant:${dateKey}`, type: 'worldChange', changeId: createId('change'), changeType: 'plantStage', assetTarget: 'roomPlant', fromState: 'stage_01', toState: 'stage_02', sourceEventIds, ruleVersion: RULE_VERSION, eligibleAt: new Date().toISOString(), status: 'eligible', revealedAt: null, revealContext: 'settlement', settlementId: null, sliceTestRule: 'valid settled day + care evidence' };
  upsertRecord(state, change);
  return change;
}
export function approveChange(change, settlementId) { if (!change || change.status !== 'eligible') return change; change.status = 'approved'; change.settlementId = settlementId; change.updatedAt = new Date().toISOString(); return change; }
export function revealChange(state, change, settlementId) {
  if (!change || !['approved', 'eligible'].includes(change.status)) return false;
  change.status = 'revealed'; change.revealedAt = new Date().toISOString(); change.revealContext = 'settlement'; change.settlementId = settlementId; change.updatedAt = new Date().toISOString();
  state.world.plantStage = change.toState; state.world.lastRevealedChangeId = change.changeId; state.world.changedAt = new Date().toISOString();
  return true;
}
export function settlementSummary(state, dateKey, settlementId) {
  const checkin = currentCheckin(state, dateKey); const active = activeSmokeEvents(state, dateKey); const focus = currentFocus(state, dateKey);
  return { smokeCount: active.length, energy: checkin?.energy ?? null, food: checkin?.food ?? null, oneThingStatus: active.length <= (focus.target || 10) ? '在目标里' : '今天有点猛', lifeSeeds: dailySeedReward(state, dateKey), dateKey, settlementId };
}
