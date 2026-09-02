import { renderAppViewport, renderShell, smokeHistoryDrawer } from './layout/shell.js';
import { createStore, getRecord, upsertRecord } from './state/store.js';
import {
  TIMEZONE, activeLifeEvents, allocateLifeSeed, currentCheckin, currentEncounter, currentFocus,
  currentSeedLedger, currentSettlement, createLifeEvent, createSmokeCorrection, createSmokeEvent,
  dailySeedReward, deriveAir, ensureDailySeeds, ensureFirstEncounter, ensureFocus, finalizeLifeSeeds,
  deriveDailySummary, isDemoSource, localDateKey, localTime, monthDayLabel, settlementSummary
} from './state/domain.js';
import { scene } from './data/scene.js';
import { placeResidents } from './data/residents.js';

const app = document.querySelector('#app');
const store = createStore(TIMEZONE);
const query = new URLSearchParams(window.location.search);
const path = window.location.pathname.replace(/\/+$/, '');
const isQaDemo = path.endsWith('/qa/device-preview') || query.get('qa') === '1';
const queryMode = isQaDemo ? query.get('mode') : null;
const detectPosture = () => (window.innerWidth / Math.max(window.innerHeight, 1)) <= 0.7 ? 'folded' : 'unfolded';
let mode = queryMode === 'folded' || queryMode === 'unfolded' ? queryMode : detectPosture();
let state = null;
let currentDate = localDateKey(new Date(), TIMEZONE);
let ui = { sheet: null, draft: null, showSettlement: false, undoTargetId: null, toast: null, reaction: null };
let toastTimer;
let undoTimer;
let reactionTimer;

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
const dayRecords = type => state.records.filter(record => record.type === type && record.localDate === currentDate && !record.tombstone && !isDemoSource(record));
const dayEvents = type => activeLifeEvents(state, currentDate, type).filter(event => !isDemoSource(event));
const focus = () => currentFocus(state, currentDate);
const checkin = () => currentCheckin(state, currentDate);

function viewRecords() {
  const summary = deriveDailySummary(state, currentDate);
  const sleep = summary.sleep;
  return {
    smoke: summary.smokeCount,
    drink: summary.drinkCount,
    move: summary.exerciseMinutes,
    water: summary.waterCount,
    food: dayRecords('foodLog').length,
    sleep: sleep?.bedtime ? `${sleep.bedtime} 上床` : sleep?.occurredAt ? `${localTime(sleep.occurredAt, TIMEZONE)} 上床` : '—'
  };
}

function residentView() {
  const candidates = [];
  if (dayEvents('sleep_start').length) candidates.push({ id: 'moon', asset: scene.assets.moon, alt: '月亮仔' });
  if (dayEvents('drink').length || dayRecords('drinkDaily').some(record => record.source !== 'previewSeed')) candidates.push({ id: 'liver', asset: scene.assets.liver, alt: '肝肝' });
  if (dayEvents('exercise').length || dayRecords('moveEvent').some(record => record.source !== 'previewSeed')) candidates.push({ id: 'muscle', asset: scene.assets.muscle, alt: '肌肉仔' });
  if (dayEvents('water').length || dayRecords('waterEvent').some(record => record.source !== 'previewSeed')) candidates.push({ id: 'water', asset: scene.assets.water, alt: '水滴仔' });
  const prioritized = ui.reaction && candidates.some(candidate => candidate.id === ui.reaction)
    ? [candidates.find(candidate => candidate.id === ui.reaction), ...candidates.filter(candidate => candidate.id !== ui.reaction)]
    : candidates;
  return placeResidents(prioritized).map(resident => ({ ...resident, reaction: ui.reaction === resident.id }));
}

function viewModel() {
  const ledger = currentSeedLedger(state, currentDate);
  const summary = deriveDailySummary(state, currentDate);
  const mood = checkin()?.mood || null;
  return {
    mode,
    records: viewRecords(),
    smokeEncountered: Boolean(currentEncounter(state)),
    target: Number(focus().target || 10),
    mood,
    seedBalance: Number(state.world.lifeSeeds || 0) + Number(ledger?.remaining || 0),
    plantAsset: scene.assets.plant,
    eggAsset: scene.assets.egg,
    residents: residentView(),
    smokeHistory: summary.smokeEvents.map(event => ({ ...event, time: localTime(event.occurredAt || event.createdAt, TIMEZONE) })),
    todayLabel: monthDayLabel(currentDate, TIMEZONE),
    reaction: ui.reaction
  };
}

function showToast(message, action = null) {
  clearTimeout(toastTimer);
  ui.toast = { message, action };
  render();
  toastTimer = setTimeout(() => { ui.toast = null; render(); }, 3200);
}

function showFeedback(character, message, action = null) {
  clearTimeout(reactionTimer);
  ui.reaction = character;
  showToast(message, action);
  reactionTimer = setTimeout(() => { ui.reaction = null; render(); }, 1800);
}

function renderSheet() {
  if (!ui.sheet) return '';
  if (ui.sheet === 'smoke-history') return smokeHistoryDrawer(viewModel().smokeHistory);
  if (ui.sheet === 'other') {
    return `<section class="interaction-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><button class="sheet-close" data-action="close-sheet" aria-label="关闭">×</button><span class="sheet-kicker">QUICK LOG · 轻轻记一下</span><h2 id="sheet-title">还想记点别的？</h2><p>不用完整记录，今天有发生就好。</p><div class="other-log-grid"><button data-action="simple-log" data-log-type="water">💧 喝水了</button><button data-action="simple-log" data-log-type="drink">🍷 喝酒</button><button data-action="simple-log" data-log-type="exercise">🏃 动了一下</button><button data-action="simple-log" data-log-type="sleep_start">🌙 准备睡</button></div><button class="secondary-button" data-action="checkin">今晚记身体状态</button></section>`;
  }
  const draft = ui.draft;
  const scale = (key, label) => `<div class="scale-row"><span>${label}</span><div>${[1,2,3,4,5].map(value => `<button class="scale-choice ${draft[key] === value ? 'selected' : ''}" data-checkin-key="${key}" data-checkin-value="${value}">${value}</button>`).join('')}</div></div>`;
  return `<section class="interaction-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><button class="sheet-close" data-action="close-sheet" aria-label="关闭">×</button><span class="sheet-kicker">EVENING · 10 秒</span><h2 id="sheet-title">今天怎么样？</h2><p>不用想太久，凭第一感觉。</p>${scale('energy','精力')}${scale('skin','皮肤')}${scale('puffiness','浮肿')}${scale('bodyFeel','身体感觉')}<div class="food-row"><span>今天吃得</span><div>${['清爽','正常','放纵'].map(value => `<button class="food-choice ${draft.food === value ? 'selected' : ''}" data-checkin-key="food" data-checkin-value="${value}">${value}</button>`).join('')}</div></div><button class="primary-button" data-action="submit-checkin">完成今天 <span>→</span></button></section>`;
}

function renderSettlement() {
  const summary = currentSettlement(state, currentDate)?.summary || settlementSummary(state, currentDate, `settlement-${currentDate}`);
  const ledger = currentSeedLedger(state, currentDate);
  const available = Number(ledger?.remaining || 0);
  const target = (id, label, asset) => `<button class="nurture-target" data-action="nurture" data-target="${id}" ${available <= 0 ? 'disabled' : ''}><img src="${asset}" alt=""><span>${label}</span><small>${Number(ledger?.allocations?.[id] || 0)} 颗</small></button>`;
  return `<section class="interaction-sheet settlement-sheet" role="dialog" aria-modal="true" aria-labelledby="settlement-title"><button class="sheet-close" data-action="close-settlement" aria-label="关闭">×</button><span class="sheet-kicker">DAILY SETTLEMENT · 今日结算</span><h2 id="settlement-title">今天，养回来一点。</h2><div class="settlement-facts"><b>抽烟 ${summary.smokeCount ?? 0} 支</b><b>精力 ${summary.energy ?? '—'} / 5</b><b>${esc(summary.food || '还没记吃饭')}</b></div><div class="nurture-heading"><strong>生命种子 ${available} 颗</strong><span>今天想养哪里？</span></div><div class="nurture-targets">${target('plant','植物',scene.assets.plant)}${target('egg','蛋',scene.assets.egg)}${target('outside','窗外',scene.assets.window)}</div><button class="primary-button" data-action="finish-nurture">先这样，回到房间 <span>→</span></button></section>`;
}

function interactionLayer() {
  const hasPanel = Boolean(ui.sheet || ui.showSettlement);
  return `${hasPanel ? '<div class="interaction-backdrop" data-action="close-sheet"></div>' : ''}${ui.sheet ? renderSheet() : ''}${ui.showSettlement ? renderSettlement() : ''}${ui.toast ? `<div class="interaction-toast" role="status"><span>${esc(ui.toast.message)}</span>${ui.toast.action ? `<button data-action="${ui.toast.action}">撤销</button>` : ''}</div>` : ''}`;
}

function render() {
  if (!state) return;
  document.body.dataset.experience = isQaDemo ? 'qa' : 'real';
  app.innerHTML = (isQaDemo ? renderShell(viewModel()) : renderAppViewport(viewModel())) + interactionLayer();
}

async function updateState(mutator) {
  state = await store.update(mutator);
  render();
}

async function handleSmoke() {
  let created;
  await updateState(draft => {
    ensureFocus(draft, currentDate);
    created = createSmokeEvent(draft, currentDate);
    ensureFirstEncounter(draft, created);
    draft.world.airState = deriveAir(draft, currentDate);
  });
  ui.undoTargetId = created.id;
  showFeedback('smoke', '记下了。', 'undo');
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { ui.undoTargetId = null; }, 5000);
}

async function handleUndo() {
  const target = state.events.find(event => event.id === ui.undoTargetId && event.type === 'smoke' && !event.tombstone);
  if (!target) return;
  await updateState(draft => { createSmokeCorrection(draft, target); draft.world.airState = deriveAir(draft, currentDate); });
  ui.undoTargetId = null;
  showFeedback('smoke', '撤销了。这条记录已经被纠正。');
}

async function handleSimpleLog(type) {
  const definitions = {
    drink: { character: 'liver', message: '肝肝收到了。', extra: { quantity: 1, unit: '杯' } },
    water: { character: 'water', message: '水滴仔收到一杯。', extra: { quantity: 1, unit: '杯' } },
    exercise: { character: 'muscle', message: '肌肉仔有活力！', extra: { durationMinutes: 30, unit: 'min' } },
    sleep_start: { character: 'moon', message: '月亮收到了，晚安。', extra: { bedtime: localTime(new Date(), TIMEZONE) } }
  };
  const definition = definitions[type];
  if (!definition) return;
  await updateState(draft => {
    createLifeEvent(draft, currentDate, type, definition.extra);
    if (type === 'sleep_start') {
      draft.world.restState = 'bedtime';
      draft.world.lastSleepStart = new Date().toISOString();
    }
  });
  ui.sheet = null;
  showFeedback(definition.character, definition.message);
}

async function handleMood(mood) {
  const values = { good: 5, okay: 3, bad: 1 };
  await updateState(draft => {
    const existing = currentCheckin(draft, currentDate) || {};
    upsertRecord(draft, { key: `checkin:${currentDate}`, type: 'bodyCheckIn', id: `checkin-${currentDate}`, localDate: currentDate, energy: existing.energy || values[mood], skin: existing.skin || 3, puffiness: existing.puffiness || 3, bodyFeel: existing.bodyFeel || values[mood], food: existing.food || '正常', mood, ruleVersion: 'slice01-v1' });
  });
  showFeedback('zhanzhan', mood === 'good' ? '收到了，今天不错。' : mood === 'bad' ? '知道了，先照顾自己。' : '收到了，慢慢来。');
}

async function submitCheckin() {
  const draft = ui.draft;
  await updateState(nextState => {
    const checkinId = `checkin-${currentDate}`;
    upsertRecord(nextState, { key: `checkin:${currentDate}`, type: 'bodyCheckIn', id: checkinId, localDate: currentDate, ...draft, ruleVersion: 'slice01-v1' });
    const settlementId = getRecord(nextState, `settlement:${currentDate}`)?.settlementId || `settlement-${currentDate}`;
    const ledger = ensureDailySeeds(nextState, currentDate);
    const previous = getRecord(nextState, `settlement:${currentDate}`);
    upsertRecord(nextState, { key: `settlement:${currentDate}`, type: 'settlement', settlementId, localDate: currentDate, summary: { ...settlementSummary(nextState, currentDate, settlementId), lifeSeeds: ledger.earned }, checkInId: checkinId, revealedChangeIds: previous?.revealedChangeIds || [], remainingEligibleChangeIds: previous?.remainingEligibleChangeIds || [], closingCopyState: 'todayNurtured', ruleVersion: 'slice01-v1' });
    nextState.world.lastSettlementId = settlementId;
  });
  ui.sheet = null;
  ui.draft = null;
  ui.showSettlement = true;
  render();
  showFeedback('zhanzhan', '结算好了。还有种子在等你。');
}

async function handleNurture(target) {
  let result;
  await updateState(draft => { result = allocateLifeSeed(draft, currentDate, target); });
  if (!result.ok) { showToast(result.reason === 'limit' ? '这个地方今天先到这里。' : '种子已经用完啦。'); return; }
  showToast(target === 'plant' ? '植物长了一点。' : target === 'egg' ? '蛋轻轻记住了。' : '窗外多了一点东西。');
}

async function finishNurture() { await updateState(draft => finalizeLifeSeeds(draft, currentDate)); ui.showSettlement = false; showToast('今天先这样。'); }

function openCheckin() {
  const existing = checkin() || {};
  ui.sheet = 'checkin';
  ui.showSettlement = false;
  ui.draft = { energy: existing.energy || 3, skin: existing.skin || 3, puffiness: existing.puffiness || 3, bodyFeel: existing.bodyFeel || 3, food: existing.food || '正常', mood: existing.mood || null };
  render();
}

document.addEventListener('click', async event => {
  const modeButton = event.target.closest('[data-mode-choice]');
  if (modeButton) { mode = modeButton.dataset.modeChoice; render(); return; }
  const choice = event.target.closest('[data-checkin-key]');
  if (choice && ui.draft) { const key = choice.dataset.checkinKey; ui.draft[key] = key === 'food' ? choice.dataset.checkinValue : Number(choice.dataset.checkinValue); render(); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'smoke') { await handleSmoke(); return; }
  if (action === 'undo') { await handleUndo(); return; }
  if (action === 'smoke-history') { ui.sheet = 'smoke-history'; ui.showSettlement = false; render(); return; }
  if (action === 'simple-log') { await handleSimpleLog(button.dataset.logType); return; }
  if (action === 'drink') { await handleSimpleLog('drink'); return; }
  if (action === 'move') { await handleSimpleLog('exercise'); return; }
  if (action === 'water') { await handleSimpleLog('water'); return; }
  if (action === 'other-log') { ui.sheet = 'other'; ui.showSettlement = false; render(); return; }
  if (action === 'checkin') { openCheckin(); return; }
  if (action === 'submit-checkin') { await submitCheckin(); return; }
  if (action === 'set-mood') { await handleMood(button.dataset.mood); return; }
  if (action === 'nurture') { await handleNurture(button.dataset.target); return; }
  if (action === 'finish-nurture') { await finishNurture(); return; }
  if (action === 'home' || action === 'close-sheet' || action === 'close-settlement') { ui.sheet = null; ui.draft = null; ui.showSettlement = false; render(); return; }
  if (action === 'not-ready') { showToast('其它房间还在长。'); }
});

document.addEventListener('keydown', event => {
  const trigger = event.target.closest?.('[data-action="smoke-history"]');
  if (!trigger || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  ui.sheet = 'smoke-history';
  render();
});

window.addEventListener('resize', () => {
  if (isQaDemo) return;
  const next = detectPosture();
  if (next !== mode) { mode = next; render(); }
}, { passive: true });

function refreshDateProjection() {
  const nextDate = localDateKey(new Date(), TIMEZONE);
  if (nextDate === currentDate) return;
  currentDate = nextDate;
  if (!state) return;
  store.update(draft => ensureFocus(draft, currentDate)).then(nextState => {
    state = nextState;
    render();
  }).catch(error => console.error('ALIVE V4 daily projection refresh failed', error));
}

document.addEventListener('visibilitychange', refreshDateProjection);
window.setInterval(refreshDateProjection, 60_000);

async function init() {
  state = await store.init();
  state = await store.update(draft => ensureFocus(draft, currentDate));
  render();
}
init().catch(error => {
  console.error('ALIVE V4 runtime failed to initialize', error);
  app.innerHTML = `<div class="runtime-error" role="alert">Room Zero 暂时没有加载好，请刷新。</div>`;
});
