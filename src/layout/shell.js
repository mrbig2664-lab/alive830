import { scene } from '../data/scene.js';
import { monthDayLabel } from '../state/domain.js';

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
  return rows.map(([label, value, color, icon], index) => {
    const action = index === 0 ? 'smoke-history' : 'daily-history';
    const detail = index === 0 ? '打开今天的抽烟记录' : `打开今天的${label}记录，可修改或删除`;
    return `<div class="status-row" data-action="${action}" role="button" tabindex="0" aria-label="${detail}"><span>${icon ? `<img class="status-icon" src="${icon}" alt="">` : `<i class="status-mark ${color}"></i>`}${label}</span><strong>${value}</strong></div>`;
  }).join('');
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
  return `<section class="focus-panel folded-focus"><div class="focus-copy" data-action="daily-history" role="button" tabindex="0" aria-label="打开今天的生活记录"><span class="mini-kicker">TODAY · 今天</span><h2>${scene.focus}</h2><p>不超过 ${target} 支，先照顾好今天。</p></div><div class="focus-meter" data-action="smoke-history" role="button" tabindex="0" aria-label="打开今天的抽烟记录"><strong>${records.smoke}</strong><span>支</span><small>目标 ≤${target}支</small><div class="meter-track"><i style="width:${Math.min(records.smoke * 100 / target, 100)}%"></i></div></div></section>`;
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

function bottomNav(activePage = 'home') {
  const item = (page, asset, label, alt) => `<button class="nav-item ${activePage === page ? 'is-active' : ''}" data-action="${page}" type="button" aria-current="${activePage === page ? 'page' : 'false'}"><img class="nav-icon" src="${asset}" alt="${alt}"><span class="nav-label">${label}</span></button>`;
  return `<nav class="bottom-nav" aria-label="主导航">${item('home', scene.assets.navHouse, '房间', '房间')}${item('records', scene.assets.navCalendar, '记录', '记录')}${item('trends', scene.assets.navTrend, '趋势', '趋势')}${item('me', scene.assets.navPerson, '我的', '我的')}</nav>`;
}

export function renderShell({ mode, records, smokeEncountered, target = 10, mood = null, seedBalance = 0, todayLabel = '—', reaction = null, plantAsset = scene.assets.plant, eggAsset = scene.assets.egg, residents = [] }) {
  const display = mode === 'folded' ? foldedDisplay({ records, smokeEncountered, target, reaction, plantAsset, eggAsset }) : unfoldedDisplay({ records, smokeEncountered, target, mood, seedBalance, todayLabel, reaction, plantAsset, eggAsset, residents });
  return `<div class="app-stage" data-mode="${mode}"><header class="brand-header"><div class="brand-lockup"><div class="brand-title">${scene.title}</div><div class="brand-subtitle">${scene.room} <span>·</span> DAILY LOOP</div></div><div class="brand-note">${note(scene.tagline, 'header-note')}<img src="${scene.assets.heart}" alt="" aria-hidden="true"></div><div class="mode-tabs" aria-label="掌机模式"><button data-mode-choice="folded" class="${mode === 'folded' ? 'is-active' : ''}" type="button">FOLDED<br><small>折叠行动</small></button><button data-mode-choice="unfolded" class="${mode === 'unfolded' ? 'is-active' : ''}" type="button">UNFOLDED<br><small>展开世界</small></button></div></header><section class="loop-strip"><span>LIVE</span><b>→</b><span>NOTICE</span><b>→</b><span>CHANGE</span><b>→</b><span>RETURN</span><img src="${scene.assets.heart}" alt="" aria-hidden="true"></section><section class="handheld-shell"><div class="screen-bezel" data-screen-mode="${mode}" aria-label="${mode === 'folded' ? '折叠封面屏' : '展开主屏'}">${display}${mode === 'unfolded' ? bottomNav('home') : ''}</div></section><footer class="footer-caption"><span>把自己，养回来。</span><small>ALIVE V4 · ROOM ZERO · ONE SMALL THING AT A TIME</small></footer></div>`;
}

// The production app intentionally contains only the approved screen UI. The
// presentation shell above remains available to the separate QA route.
export function renderAppViewport({ mode, records, smokeEncountered, target = 10, mood = null, seedBalance = 0, todayLabel = '—', reaction = null, smokeHistory = [], plantAsset = scene.assets.plant, eggAsset = scene.assets.egg, residents = [] }) {
  const display = mode === 'folded'
    ? foldedDisplay({ records, smokeEncountered, target, reaction, plantAsset, eggAsset })
    : unfoldedDisplay({ records, smokeEncountered, target, mood, seedBalance, todayLabel, reaction, plantAsset, eggAsset, residents });
  return `<main class="app-viewport" data-experience="real" data-mode="${mode}" data-screen-mode="${mode}" aria-label="${mode === 'folded' ? '折叠行动模式' : '展开世界模式'}">${display}${mode === 'unfolded' ? bottomNav() : ''}</main>`;
}

function dateHeading(date, todayDate) {
  return `${monthDayLabel(date)} · ${date === todayDate ? '今天' : '当天'}`;
}

function recordsEventRows(events, makeRow) {
  return events.length ? events.map(makeRow).join('') : '<p class="records-empty">未记录</p>';
}

function averageSmokeInterval(events) {
  const times = events.map(event => Date.parse(event.occurredAt || event.createdAt)).filter(Number.isFinite).sort((a, b) => a - b);
  if (times.length < 2) return '—';
  const average = Math.round(times.slice(1).reduce((sum, time, index) => sum + time - times[index], 0) / (times.length - 1) / 60000);
  if (average < 60) return `${average}m`;
  return `${Math.floor(average / 60)}h${String(average % 60).padStart(2, '0')}m`;
}

function recordSection(title, icon, content, value = '') {
  return `<section class="records-section"><div class="records-section-heading"><h2><span>${icon}</span>${title}</h2>${value ? `<strong>${value}</strong>` : ''}</div>${content}</section>`;
}

export function renderRecordsViewport({ mode, selectedDate, todayDate, dateOptions = [], summary }) {
  const dates = dateOptions.map(item => `<button type="button" class="records-day ${item.date === selectedDate ? 'is-selected' : ''} ${item.date === todayDate ? 'is-today' : ''}" data-action="history-day" data-date="${item.date}"><b>${item.label.replace('月', '/').replace('日', '')}</b><small>${item.weekday}</small></button>`).join('');
  const smokeRows = recordsEventRows(summary.smokeEvents, (event, index) => historyEventRow({ id: event.id, label: `第${index + 1}支`, time: event.time || '—' }));
  const drinkRows = recordsEventRows(summary.drinkEvents, (event, index) => historyEventRow({ id: event.id || event.key, kind: event.id ? 'event' : 'record', label: `第${index + 1}杯`, time: event.time || '—', detail: `${event.quantity || 1}杯` }));
  const exerciseRows = recordsEventRows(summary.exerciseSessions, event => historyEventRow({ id: event.id || event.key, kind: event.id ? 'event' : 'record', label: '运动', time: event.time || '—', detail: `${event.durationMinutes || 0} min` }));
  const waterRows = recordsEventRows(summary.waterEvents, (event, index) => historyEventRow({ id: event.id || event.key, kind: event.id ? 'event' : 'record', label: `第${index + 1}杯`, time: event.time || '—', detail: `${event.quantity || 1}杯` }));
  const sleepRows = summary.sleep ? historyEventRow({ id: summary.sleep.id || summary.sleep.key, kind: summary.sleep.id ? 'event' : 'record', label: '准备睡', time: summary.sleep.time || summary.sleep.bedtime || '—', detail: '上床' }) : '<p class="records-empty">未记录</p>';
  const checkinRows = summary.checkIn ? `<div class="records-checkin"><b>${summary.mood === 'good' ? '🙂 好' : summary.mood === 'okay' ? '😐 一般' : summary.mood === 'bad' ? '☹️ 不好' : '已记录'}</b><span>${summary.checkIn.food || '身体状态已记录'}</span><button class="history-more" data-action="event-menu" data-target-id="${summary.checkIn.id || summary.checkIn.key}" data-target-kind="record" aria-label="修改身体状态">⋯</button></div>` : '<p class="records-empty">未记录</p>';
  const smokeMetrics = summary.smokeEvents.length ? `<div class="smoke-metrics"><span>第一支 <b>${summary.smokeEvents[0].time || '—'}</b></span><span>最近一支 <b>${summary.smokeEvents.at(-1).time || '—'}</b></span><span>平均间隔 <b>${averageSmokeInterval(summary.smokeEvents)}</b></span></div>` : '';
  const meta = `<div class="records-meta"><span>🌱 ${summary.seeds ? `${summary.seeds.earned} 赚得 · ${summary.seeds.used} 已用` : '暂无种子记录'}</span><span>结算：${summary.settlement?.status || '未结算'}</span></div>`;
  return `<main class="app-viewport app-page records-page" data-experience="real" data-mode="${mode}" data-page="records" aria-label="生活记录"><div class="page-scroll"><header class="page-header"><div><span class="page-kicker">MY LIFE · 生活日记</span><h1>记录</h1></div><div class="page-arrows"><button data-action="history-prev" type="button" aria-label="更早七天">←</button><button data-action="history-next" type="button" aria-label="更新七天">→</button></div></header><div class="records-day-strip">${dates}</div><div class="records-selected-date">${dateHeading(selectedDate, todayDate)}</div><div class="records-grid">${recordSection('抽烟', '🚬', `<div class="records-count"><b>${summary.smokeCount}</b><span>支</span></div>${smokeMetrics}<ol class="records-event-list">${smokeRows}</ol>`, `${summary.smokeCount}支`)}${recordSection('喝酒', '🍷', `<div class="records-total">${summary.drinkCount ? `${summary.drinkCount} 杯` : 'Dry'}</div><ul class="records-event-list">${drinkRows}</ul>`, `${summary.drinkCount}杯`)}${recordSection('运动', '💪', `<div class="records-total">${summary.exerciseMinutes ? `${summary.exerciseMinutes} min` : '—'}</div><ul class="records-event-list">${exerciseRows}</ul>`, `${summary.exerciseMinutes}min`)}${recordSection('喝水', '💧', `<div class="records-total">${summary.waterCount} / 8 杯</div><ul class="records-event-list">${waterRows}</ul>`, `${summary.waterCount}/8`)}${recordSection('睡眠', '🌙', `<ul class="records-event-list">${sleepRows}</ul>`)}${recordSection('身体状态', '🙂', `<div class="records-event-list">${checkinRows}</div>`)} </div>${meta}</div>${bottomNav('records')}</main>`;
}

function trendBar(value, max, label, suffix = '') {
  const width = max > 0 ? Math.max(3, Math.round((Number(value || 0) / max) * 100)) : 3;
  return `<div class="trend-bar-row"><span>${label}</span><i><b style="width:${width}%"></b></i><strong>${value || '—'}${value ? suffix : ''}</strong></div>`;
}

function trendMetric(title, icon, summaryRows, value, note) {
  return `<section class="trend-card"><div class="trend-card-heading"><h2><span>${icon}</span>${title}</h2><strong>${value}</strong></div><div class="trend-bars">${summaryRows}</div><p>${note}</p></section>`;
}

export function renderTrendsViewport({ mode, range = 7, summaries = [], observation = '目前还没有足够记录形成观察。' }) {
  const dates = summaries.map(summary => summary.date.slice(5).replace('-', '/'));
  const maxSmoke = Math.max(...summaries.map(item => item.smokeCount), 1);
  const maxDrink = Math.max(...summaries.map(item => item.drinkCount), 1);
  const maxExercise = Math.max(...summaries.map(item => item.exerciseMinutes), 1);
  const maxWater = Math.max(...summaries.map(item => item.waterCount), 1);
  const compact = summaries.map((item, index) => ({ ...item, label: dates[index] })).slice(-range);
  const smokeBars = compact.map(item => trendBar(item.smokeCount, maxSmoke, item.label, '支')).join('');
  const drinkBars = compact.map(item => trendBar(item.drinkCount, maxDrink, item.label, '杯')).join('');
  const exerciseBars = compact.map(item => trendBar(item.exerciseMinutes, maxExercise, item.label, 'm')).join('');
  const waterBars = compact.map(item => trendBar(item.waterCount, maxWater, item.label, '杯')).join('');
  const smokeDays = compact.filter(item => item.smokeCount > 0);
  const firstTimes = smokeDays.map(item => item.smokeEvents?.[0]?.time).filter(Boolean);
  const dryDays = compact.filter(item => item.drinkCount === 0).length;
  const activeDays = compact.filter(item => item.exerciseMinutes > 0).length;
  const firstSmoke = firstTimes.length ? firstTimes[0] : '—';
  return `<main class="app-viewport app-page trends-page" data-experience="real" data-mode="${mode}" data-page="trends" aria-label="生活趋势"><div class="page-scroll"><header class="page-header"><div><span class="page-kicker">UNDERSTAND · 看见变化</span><h1>趋势</h1></div><div class="range-toggle" role="group" aria-label="趋势范围"><button class="${range === 7 ? 'is-selected' : ''}" data-action="trend-range" data-range="7" type="button">7天</button><button class="${range === 30 ? 'is-selected' : ''}" data-action="trend-range" data-range="30" type="button">30天</button></div></header><p class="page-intro">记录 → 理解 → 改变。只看真实发生的事。</p><div class="trend-grid">${trendMetric('抽烟', '🚬', smokeBars, smokeDays.length ? `${(smokeDays.reduce((sum, item) => sum + item.smokeCount, 0) / smokeDays.length).toFixed(1)} 支/天` : '—', `第一支烟 ${firstSmoke} · ${smokeDays.length} 个有记录日`)}${trendMetric('喝酒', '🍷', drinkBars, compact.some(item => item.drinkCount > 0) ? `${(compact.reduce((sum, item) => sum + item.drinkCount, 0) / range).toFixed(1)} 杯/天` : 'Dry', `${dryDays} 个 Dry Day`)}${trendMetric('运动', '💪', exerciseBars, activeDays ? `${compact.reduce((sum, item) => sum + item.exerciseMinutes, 0)} min` : '—', `${activeDays} 个运动日`)}${trendMetric('喝水', '💧', waterBars, compact.some(item => item.waterCount > 0) ? `${(compact.reduce((sum, item) => sum + item.waterCount, 0) / range).toFixed(1)} 杯/天` : '—', '每日目标 8 杯')}</div><section class="noticed-card"><span class="page-kicker">ONE THING I NOTICED</span><h2>我发现一件事。</h2><p>${observation}</p></section></div>${bottomNav('trends')}</main>`;
}

export function renderMeViewport({ mode, smokeTarget = 10, waterTarget = 8, recordedDays = 0 }) {
  return `<main class="app-viewport app-page me-page" data-experience="real" data-mode="${mode}" data-page="me" aria-label="我的"><div class="page-scroll"><header class="page-header"><div><span class="page-kicker">LONG TERM · 慢慢来</span><h1>我的</h1></div></header><p class="page-intro">照顾今天，也照顾以后。</p><section class="me-card"><h2>我的目标</h2><div class="me-goal"><span>🚬 抽烟</span><strong>≤ ${smokeTarget} 支 / 天</strong></div><div class="me-goal"><span>💧 喝水</span><strong>${waterTarget} 杯 / 天</strong></div></section><section class="me-card"><h2>数据</h2><div class="me-goal"><span>已经记录</span><strong>${recordedDays} 天</strong></div><button class="me-disabled" type="button" disabled>导出数据 · 即将支持</button></section><section class="me-card"><h2>关于 ALIVE</h2><p>把真实生活记下来，让变化有迹可循。</p></section></div>${bottomNav('me')}</main>`;
}
