import { scene } from './scene.js';

const action = (id) => scene.actions.find((item) => item.id === id);

function tape(asset, className) { return `<img class="${className}" src="${asset}" alt="" aria-hidden="true">`; }
function note(text, className = '') { return `<div class="paper-note ${className}">${tape(scene.assets.tapeYellow, 'note-tape top-left')}${tape(scene.assets.tapeRed, 'note-tape top-right')}<p>${text}</p><img class="note-heart" src="${scene.assets.heart}" alt="" aria-hidden="true"></div>`; }

function roomScene({ smokeEncountered, residents = [], plantAsset = scene.assets.plant, eggAsset = scene.assets.egg }) {
  const companions = residents.map((resident) => `<img class="room-asset room-companion room-companion-${resident.id}" src="${resident.asset}" alt="${resident.alt}" aria-hidden="true">`).join('');
  return `<div class="room-scene" aria-label="Room Zero 房间世界">
    <img class="room-texture wall-texture" src="./material/texture-wall.png" alt="">
    <img class="room-texture floor-texture" src="./material/texture-floor.png" alt="">
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
    <img class="room-asset resident-asset" src="${scene.assets.resident}" alt="詹詹坐在房间里">
    ${smokeEncountered ? `<img class="room-asset smoke-asset" src="${scene.assets.smoke}" alt="烟雾兽出现">` : ''}
    ${companions}
  </div>`;
}

function statusRows(records, target = 10) {
  const rows = [
    ['抽烟', `${records.smoke} / ${target} 支`, 'red', scene.assets.smokeIcon],
    ['喝酒', records.drink ? `${records.drink} 次` : 'Dry', 'orange', scene.assets.liver],
    ['运动', `${records.move} min`, 'yellow', scene.assets.muscle],
    ['睡眠', records.sleep || '—', 'purple', null],
    ['喝水', `${records.water} / 8 杯`, 'blue', scene.assets.water],
  ];
  return rows.map(([label, value, color, icon]) => `<div class="status-row"><span>${icon ? `<img class="status-icon" src="${icon}" alt="">` : `<i class="status-mark ${color}"></i>`}${label}</span><strong>${value}</strong></div>`).join('');
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

function foldedFocusPanel(records, target = 10) {
  return `<section class="focus-panel folded-focus"><div class="focus-copy"><span class="mini-kicker">TODAY · 今天</span><h2>${scene.focus}</h2><p>不超过 ${target} 支，先照顾好今天。</p></div><div class="focus-meter"><strong>${records.smoke}</strong><span>支</span><small>目标 ≤${target}支</small><div class="meter-track"><i style="width:${Math.min(records.smoke * 100 / target, 100)}%"></i></div></div></section>`;
}

function statusPanel(records, target = 10, mood = null, seedBalance = 0) {
  const moodButton = (name, asset, label) => `<button type="button" class="mood ${name} ${mood === name ? 'is-selected' : ''}" data-action="set-mood" data-mood="${name}" aria-label="${label}"><img class="mood-face" src="${asset}" alt="${label}"></button>`;
  return `<aside class="status-column"><section class="status-card"><div class="section-heading"><h2>今日状态</h2><span>8月27日</span></div>${statusRows(records, target)}</section><section class="mood-card"><h2>今天怎么样？</h2><div class="moods">${moodButton('good', scene.assets.moodGood, '好')}${moodButton('okay', scene.assets.moodOkay, '一般')}${moodButton('bad', scene.assets.moodBad, '不好')}</div><div class="mood-labels" aria-hidden="true"><span>好</span><span>一般</span><span>不好</span></div><div class="seed-chip"><img src="${scene.assets.plant}" alt=""><span><b>${seedBalance}</b> LIFE SEEDS</span></div></section></aside>`;
}

function foldedDisplay({ records, smokeEncountered, target, plantAsset, eggAsset }) {
  return `<div class="folded-display"><div class="folded-scene">${roomScene({ smokeEncountered, plantAsset, eggAsset })}</div>${foldedFocusPanel(records, target)}<button class="primary-action" data-action="smoke" type="button"><img class="cta-icon" src="${scene.assets.smokeIcon}" alt=""><span>+ 抽了一支</span><img class="cta-companion" src="${scene.assets.smoke}" alt="" aria-hidden="true"></button><button class="secondary-action" data-action="other-log" type="button"><span class="secondary-plus" aria-hidden="true">＋</span><span>记录其他</span></button></div>`;
}

function unfoldedDisplay({ records, smokeEncountered, target, mood, seedBalance, plantAsset, eggAsset, residents }) {
  return `<div class="unfolded-display"><div class="unfolded-room">${roomScene({ smokeEncountered, plantAsset, eggAsset, residents })}</div>${statusPanel(records, target, mood, seedBalance)}${quickRecordBar(records)}</div>`;
}

function bottomNav() {
  return `<nav class="bottom-nav" aria-label="主导航"><button class="nav-item is-active" data-action="home" type="button"><img class="nav-icon" src="${scene.assets.navHouse}" alt=""><span class="nav-label">房间</span></button><button class="nav-item" data-action="not-ready" type="button"><img class="nav-icon" src="${scene.assets.navSearch}" alt=""><span class="nav-label">发现</span></button><button class="nav-item" data-action="not-ready" type="button"><img class="nav-icon" src="${scene.assets.navBook}" alt=""><span class="nav-label">故事</span></button><button class="nav-item" data-action="not-ready" type="button"><img class="nav-icon" src="${scene.assets.navPerson}" alt=""><span class="nav-label">我的</span></button></nav>`;
}

export function renderShell({ mode, records, smokeEncountered, target = 10, mood = null, seedBalance = 0, plantAsset = scene.assets.plant, eggAsset = scene.assets.egg, residents = [] }) {
  const display = mode === 'folded' ? foldedDisplay({ records, smokeEncountered, target, plantAsset, eggAsset }) : unfoldedDisplay({ records, smokeEncountered, target, mood, seedBalance, plantAsset, eggAsset, residents });
  return `<div class="app-stage" data-mode="${mode}"><header class="brand-header"><div class="brand-lockup"><div class="brand-title">${scene.title}</div><div class="brand-subtitle">${scene.room} <span>·</span> DAILY LOOP</div></div><div class="brand-note">${note(scene.tagline, 'header-note')}<img src="${scene.assets.heart}" alt="" aria-hidden="true"></div><div class="mode-tabs" aria-label="掌机模式"><button data-mode-choice="folded" class="${mode === 'folded' ? 'is-active' : ''}" type="button">FOLDED<br><small>折叠行动</small></button><button data-mode-choice="unfolded" class="${mode === 'unfolded' ? 'is-active' : ''}" type="button">UNFOLDED<br><small>展开世界</small></button></div></header><section class="loop-strip"><span>LIVE</span><b>→</b><span>NOTICE</span><b>→</b><span>CHANGE</span><b>→</b><span>RETURN</span><img src="${scene.assets.heart}" alt="" aria-hidden="true"></section><section class="handheld-shell"><div class="screen-bezel" data-screen-mode="${mode}" aria-label="${mode === 'folded' ? '折叠封面屏' : '展开主屏'}">${display}${mode === 'unfolded' ? bottomNav() : ''}</div></section><footer class="footer-caption"><span>把自己，养回来。</span><small>ALIVE V4 · ROOM ZERO · ONE SMALL THING AT A TIME</small></footer></div>`;
}
