import { scene } from '../data/scene.js';

const action = (id) => scene.actions.find((item) => item.id === id);

function tape(asset, className) { return `<img class="${className}" src="${asset}" alt="" aria-hidden="true">`; }
function note(text, className = '') { return `<div class="paper-note ${className}">${tape(scene.assets.tapeYellow, 'note-tape top-left')}${tape(scene.assets.tapeRed, 'note-tape top-right')}<p>${text}</p><img class="note-heart" src="${scene.assets.heart}" alt="" aria-hidden="true"></div>`; }

function roomScene({ smokeEncountered, residents = [], reaction = null, plantAsset = scene.assets.plant, eggAsset = scene.assets.egg }) {
  const companions = residents.map((resident) => `<img class="room-asset room-companion room-companion-${resident.id} ${resident.anchorClass || ''} ${reaction === resident.id ? 'is-reacting' : ''}" src="${resident.asset}" alt="${resident.alt}" aria-hidden="true">`).join('');
  return `<div class="room-scene" aria-label="Room Zero 房间世界">
    <img class="room-texture wall-texture" src="./public/assets/material/texture-wall.png" alt="">
    <img class="room-texture floor-texture" src="./public/assets/material/texture-floor.png" alt="">
    <span class="room-label">${scene.room}</span>
    <img class="room-asset lamp-asset" src="${scene.assets.lamp}" alt="吊灯">
    <img class="room-asset window-asset" src="${scene.assets.window}" alt="窗户">
    <img class="room-asset bed-asset" src="${scene.assets.bed}" alt="床">
    <img class="room-asset rug-asset" src="${scene.assets.rug}" alt="地毯">
    <img class="room-asset table-asset" src="${scene.assets.table}" alt="桌子">
    <img class="room-asset stool-asset" src="${scene.assets.stool}" alt="凳子">
    <img class="room-asset cup-asset" src="${scene.assets.cup}" alt="杯子">
    <img class="room-asset plant-asset" src="${plantAsset}" alt="正在成长的植物">
    <img class="room-asset egg-asset" src="${eggAsset}" alt="神秘蛋">
    <img class="room-asset resident-asset ${reaction === 'zhanzhan' ? 'is-reacting' : ''}" src="${scene.assets.resident}" alt="詹詹坐在房间里">
    ${smokeEncountered ? `<img class="room-asset smoke-asset ${reaction === 'smoke' ? 'is-reacting' : ''}" src="${scene.assets.smoke}" alt="打开今天的抽烟记录" data-action="smoke-history" role="button" tabindex="0">` : ''}
    ${companions}
  </div>`;
}

function statusRows(records, target = 10) {
  const rows = [
    ['抽烟', `${records.smoke} / ${target} 支`, 'red', scene.assets.smokeIcon],
    ['喝酒', records.drink ? `${records.drink} 次` : 'Dry', 'orange', scene.assets.liver],
    ['运动', `${records.move} min`, 'yellow', scene.assets.muscle],
    ['睡眠', records.sleep || '—', 'purple', scene.assets.moon],
    ['喝水', `${records.water} / 8 杯`, 'blue', scene.assets.water],
  ];
  return rows.map(([label, value, color, icon], index) => `<div class="status-row"${index === 0 ? ' data-action="smoke-history" role="button" tabindex="0" aria-label="打开今天的抽烟记录"' : ''}><span>${icon ? `<img class="status-icon" src="${icon}" alt="">` : `<i class="status-mark ${color}"></i>`}${label}</span><strong>${value}</strong></div>`).join('');
}

function actionCard(item, records) {
  const value = item.id === 'smoke' ? `${records.smoke} / 10` : item.id === 'move' ? `${records.move} min` : item.id === 'water' ? `${records.water} / 8` : records[item.id] ? `${records[item.id]} 次` : '—';
  return `<button class="record-card record-${item.id} accent-${item.accent}" data-action="${item.id}" type="button"><span class="record-plus">+</span><span class="record-label">${item.label}</span><span class="record-value">${value}</span>${item.character ? `<img src="${item.character}" alt="">` : ''}</button>`;
}

function quickRecordBar(records, className = '') {
  const cards = scene.actions.slice(0, 3).map((item) => actionCard(item, records)).join('');
  const other = '<button class="record-card accent-green other-card" data-action="other-log" type="button"><span class="record-plus">•••</span><span class="record-label">其它</span><span class="record-value">吃饭 / 睡眠 / 恢复</span></button>';
  return `<section class="quick-records ${className}"><div class="section-heading"><h2>快速记录</h2></div><div class="quick-grid">${cards}${other}</div></section>`;
}

export function smokeHistoryDrawer(history = []) {
  const rows = history.length
    ? history.map((event, index) => `<li class="smoke-history-item"><span>第${index + 1}支</span><strong>${event.time || '—'}</strong><button class="history-more" data-action="event-menu" data-target-id="${event.id}" data-target-kind="event" aria-label="修改或删除第${index + 1}支">⋯</button></li>`).join('')
    : '<li class="smoke-history-empty">今天还没有记录。</li>';
  return `<section class="interaction-sheet smoke-history-sheet" role="dialog" aria-modal="true" aria-labelledby="smoke-history-title"><button class="sheet-close" data-action="close-sheet" aria-label="关闭">×</button><span class="sheet-kicker">SMOKE · 今天</span><h2 id="smoke-history-title">今天抽了 ${history.length} 支</h2><ol class="smoke-history-list">${rows}</ol></section>`;
}

function historyEventRow({ id, kind = 'event', label, time = '', detail = '' }) {
  return `<li class="history-event-row"><span><b>${label}</b><small>${time}${detail ? ` · ${detail}` : ''}</small></span><button class="history-more" data-action="event-menu" data-target-id="${id}" data-target-kind="${kind}" aria-label="修改或删除${label}">⋯</button></li>`;
}

function historyBlock(title, content, count = null) {
  return `<section class="history-block"><h3>${title}${count === null ? '' : `<strong>${count}</strong>`}</h3>${content}</section>`;
}

export function dailyHistorySheet({ selectedDate, todayDate, dateOptions = [], summary }) {
  const dates = dateOptions.map(item => `<button type="button" class="history-day ${item.date === selectedDate ? 'is-selected' : ''} ${item.date === todayDate ? 'is-today' : ''}" data-action="history-day" data-date="${item.date}"><b>${item.label}</b><small>${item.date === todayDate ? '今天' : item.weekday}</small></button>`).join('');
  const smokeRows = summary.smokeEvents.map((event, index) => historyEventRow({ id: event.id, label: `第${index + 1}支`, time: event.time || '—' })).join('');
  const drinkRows = summary.drinkEvents.map((event, index) => historyEventRow({ id: event.id || event.key, kind: event.id ? 'event' : 'record', label: `第${index + 1}杯`, time: event.time || '—', detail: `${event.quantity || 1}杯` })).join('');
  const exerciseRows = summary.exerciseSessions.map(event => historyEventRow({ id: event.id || event.key, kind: event.id ? 'event' : 'record', label: '运动', time: event.time || '—', detail: `${event.durationMinutes || 0} min` })).join('');
  const waterRows = summary.waterEvents.map((event, index) => historyEventRow({ id: event.id || event.key, kind: event.id ? 'event' : 'record', label: `第${index + 1}杯`, time: event.time || '—', detail: `${event.quantity || 1}杯` })).join('');
  const bedtime = summary.sleep ? historyEventRow({ id: summary.sleep.id || summary.sleep.key, kind: summary.sleep.id ? 'event' : 'record', label: '准备睡', time: summary.sleep.time || summary.sleep.bedtime || '—', detail: '上床' }) : '<p class="history-empty">今天还没有记录。</p>';
  const checkin = summary.checkIn ? historyEventRow({ id: summary.checkIn.id || summary.checkIn.key, kind: 'record', label: '身体状态', time: '', detail: summary.mood || '已记录' }) : '<p class="history-empty">还没有身体状态记录。</p>';
  const seedText = summary.seeds ? `${summary.seeds.earned} 赚得 · ${summary.seeds.used} 已用` : '暂无结算种子';
  const settlementText = summary.settlement?.status || '未结算';
  return `<section class="interaction-sheet daily-history-sheet" role="dialog" aria-modal="true" aria-labelledby="daily-history-title"><button class="sheet-close" data-action="close-sheet" aria-label="关闭">×</button><span class="sheet-kicker">MY LIFE · 生活日记</span><h2 id="daily-history-title">每日记录</h2><div class="history-day-selector">${dates}</div><p class="history-selected-date">${selectedDate === todayDate ? '今天' : '当天'} · ${selectedDate}</p><div class="history-scroll">${historyBlock('抽烟', smokeRows || '<p class="history-empty">今天还没有记录。</p>', summary.smokeCount)}${historyBlock('喝酒', drinkRows || '<p class="history-empty">今天还没有记录。</p>', summary.drinkCount)}${historyBlock('运动', `<p class="history-total">累计 <b>${summary.exerciseMinutes}</b> min</p>${exerciseRows || '<p class="history-empty">今天还没有记录。</p>'}`, null)}${historyBlock('喝水', waterRows || '<p class="history-empty">今天还没有记录。</p>', summary.waterCount)}${historyBlock('睡眠 / 身体状态', `${bedtime}${checkin}`, null)}<div class="history-meta"><span>🌱 ${seedText}</span><span>结算：${settlementText}</span></div></div></section>`;
}

export function eventMenuSheet({ label, time = '', targetId, targetKind }) {
  return `<section class="interaction-sheet event-menu-sheet" role="dialog" aria-modal="true" aria-labelledby="event-menu-title"><button class="sheet-close" data-action="close-sheet" aria-label="关闭">×</button><span class="sheet-kicker">CORRECT · 记录修正</span><h2 id="event-menu-title">${label}</h2><p>${time ? `发生时间：${time}` : '这条记录可以修改或删除。'}</p><button class="primary-button" data-action="open-event-edit" data-target-id="${targetId}" data-target-kind="${targetKind}">修改这一条</button><button class="secondary-button danger-button" data-action="delete-event" data-target-id="${targetId}" data-target-kind="${targetKind}">删除这一条</button></section>`;
}

export function eventEditSheet({ target, targetId, targetKind, dateLabel = '' }) {
  const type = target?.type || '';
  const time = target?.time || '';
  const duration = target?.durationMinutes ?? '';
  const quantity = target?.quantity ?? 1;
  const moodOptions = ['good', 'okay', 'bad'].map(value => `<option value="${value}" ${target?.mood === value ? 'selected' : ''}>${value === 'good' ? '好' : value === 'okay' ? '一般' : '不好'}</option>`).join('');
  return `<section class="interaction-sheet event-edit-sheet" role="dialog" aria-modal="true" aria-labelledby="event-edit-title"><button class="sheet-close" data-action="close-sheet" aria-label="关闭">×</button><span class="sheet-kicker">EDIT · ${dateLabel}</span><h2 id="event-edit-title">修改记录</h2><label>时间<input data-edit-field="time" type="time" value="${time}"></label>${type === 'exercise' || type === 'moveEvent' ? `<label>运动时长（分钟）<input data-edit-field="durationMinutes" type="number" min="1" step="1" value="${duration}"></label>` : ''}${['drink', 'water', 'drinkDaily', 'waterEvent'].includes(type) ? `<label>数量<input data-edit-field="quantity" type="number" min="1" step="1" value="${quantity}"></label>` : ''}${type === 'bodyCheckIn' ? `<label>心情<select data-edit-field="mood">${moodOptions}</select></label>` : ''}<button class="primary-button" data-action="save-event" data-target-id="${targetId}" data-target-kind="${targetKind}">保存修改</button></section>`;
}

function foldedFocusPanel(records, target = 10) {
  return `<section class="focus-panel folded-focus"><div class="focus-copy"><span class="mini-kicker">TODAY · 今天</span><h2>${scene.focus}</h2><p>不超过 ${target} 支，先照顾好今天。</p></div><div class="focus-meter" data-action="smoke-history" role="button" tabindex="0" aria-label="打开今天的抽烟记录"><strong>${records.smoke}</strong><span>支</span><small>目标 ≤${target}支</small><div class="meter-track"><i style="width:${Math.min(records.smoke * 100 / target, 100)}%"></i></div></div></section>`;
}

function statusPanel(records, target = 10, mood = null, seedBalance = 0, todayLabel = '—') {
  const moodButton = (name, asset, label) => `<button type="button" class="mood ${name} ${mood === name ? 'is-selected' : ''}" data-action="set-mood" data-mood="${name}" aria-label="${label}"><img class="mood-face" src="${asset}" alt="${label}"></button>`;
  return `<aside class="status-column"><section class="status-card"><div class="section-heading"><h2>今日状态</h2><button class="date-link" data-action="daily-history" type="button">${todayLabel}</button></div>${statusRows(records, target)}</section><section class="mood-card"><h2>今天怎么样？</h2><div class="moods">${moodButton('good', scene.assets.moodGood, '好')}${moodButton('okay', scene.assets.moodOkay, '一般')}${moodButton('bad', scene.assets.moodBad, '不好')}</div><div class="mood-labels" aria-hidden="true"><span>好</span><span>一般</span><span>不好</span></div><div class="seed-chip"><img src="${scene.assets.plant}" alt=""><span><b>${seedBalance}</b> LIFE SEEDS</span></div></section></aside>`;
}

function foldedDisplay({ records, smokeEncountered, target, reaction, plantAsset, eggAsset }) {
  return `<div class="folded-display"><div class="folded-scene">${roomScene({ smokeEncountered, reaction, plantAsset, eggAsset })}</div>${foldedFocusPanel(records, target)}<button class="primary-action" data-action="smoke" type="button"><img class="cta-icon" src="${scene.assets.smokeIcon}" alt=""><span>+ 抽了一支</span><img class="cta-companion" src="${scene.assets.smoke}" alt="" aria-hidden="true"></button><button class="secondary-action" data-action="other-log" type="button"><span class="secondary-plus" aria-hidden="true">＋</span><span>记录其他</span></button></div>`;
}

function unfoldedDisplay({ records, smokeEncountered, target, mood, seedBalance, todayLabel, reaction, plantAsset, eggAsset, residents }) {
  return `<div class="unfolded-display"><div class="unfolded-room">${roomScene({ smokeEncountered, reaction, plantAsset, eggAsset, residents })}</div>${statusPanel(records, target, mood, seedBalance, todayLabel)}${quickRecordBar(records)}</div>`;
}

function bottomNav() {
  return `<nav class="bottom-nav" aria-label="主导航"><button class="nav-item is-active" data-action="home" type="button"><img class="nav-icon" src="${scene.assets.navHouse}" alt=""><span class="nav-label">房间</span></button><button class="nav-item" data-action="not-ready" type="button"><img class="nav-icon" src="${scene.assets.navSearch}" alt=""><span class="nav-label">发现</span></button><button class="nav-item" data-action="not-ready" type="button"><img class="nav-icon" src="${scene.assets.navBook}" alt=""><span class="nav-label">故事</span></button><button class="nav-item" data-action="not-ready" type="button"><img class="nav-icon" src="${scene.assets.navPerson}" alt=""><span class="nav-label">我的</span></button></nav>`;
}

export function renderShell({ mode, records, smokeEncountered, target = 10, mood = null, seedBalance = 0, todayLabel = '—', reaction = null, plantAsset = scene.assets.plant, eggAsset = scene.assets.egg, residents = [] }) {
  const display = mode === 'folded' ? foldedDisplay({ records, smokeEncountered, target, reaction, plantAsset, eggAsset }) : unfoldedDisplay({ records, smokeEncountered, target, mood, seedBalance, todayLabel, reaction, plantAsset, eggAsset, residents });
  return `<div class="app-stage" data-mode="${mode}"><header class="brand-header"><div class="brand-lockup"><div class="brand-title">${scene.title}</div><div class="brand-subtitle">${scene.room} <span>·</span> DAILY LOOP</div></div><div class="brand-note">${note(scene.tagline, 'header-note')}<img src="${scene.assets.heart}" alt="" aria-hidden="true"></div><div class="mode-tabs" aria-label="掌机模式"><button data-mode-choice="folded" class="${mode === 'folded' ? 'is-active' : ''}" type="button">FOLDED<br><small>折叠行动</small></button><button data-mode-choice="unfolded" class="${mode === 'unfolded' ? 'is-active' : ''}" type="button">UNFOLDED<br><small>展开世界</small></button></div></header><section class="loop-strip"><span>LIVE</span><b>→</b><span>NOTICE</span><b>→</b><span>CHANGE</span><b>→</b><span>RETURN</span><img src="${scene.assets.heart}" alt="" aria-hidden="true"></section><section class="handheld-shell"><div class="screen-bezel" data-screen-mode="${mode}" aria-label="${mode === 'folded' ? '折叠封面屏' : '展开主屏'}">${display}${mode === 'unfolded' ? bottomNav() : ''}</div></section><footer class="footer-caption"><span>把自己，养回来。</span><small>ALIVE V4 · ROOM ZERO · ONE SMALL THING AT A TIME</small></footer></div>`;
}

// The production app intentionally contains only the approved screen UI. The
// presentation shell above remains available to the separate QA route.
export function renderAppViewport({ mode, records, smokeEncountered, target = 10, mood = null, seedBalance = 0, todayLabel = '—', reaction = null, smokeHistory = [], plantAsset = scene.assets.plant, eggAsset = scene.assets.egg, residents = [] }) {
  const display = mode === 'folded'
    ? foldedDisplay({ records, smokeEncountered, target, reaction, plantAsset, eggAsset })
    : unfoldedDisplay({ records, smokeEncountered, target, mood, seedBalance, todayLabel, reaction, plantAsset, eggAsset, residents });
  return `<main class="app-viewport" data-experience="real" data-mode="${mode}" data-screen-mode="${mode}" aria-label="${mode === 'folded' ? '折叠行动模式' : '展开世界模式'}">${display}${mode === 'unfolded' ? bottomNav() : ''}</main>`;
}
