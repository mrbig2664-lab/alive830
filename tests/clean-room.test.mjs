import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAppViewport, renderShell } from '../src/layout/shell.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('clean-room runtime owns its entry points', async () => {
  const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.equal(packageJson.name, 'alive-v4-clean-room-zero');
  assert.equal(packageJson.scripts.dev, 'node tools/dev-server.mjs');
  assert.equal(packageJson.scripts.test, 'node --test tests/*.mjs');
  await access(join(root, 'qa/device-preview/index.html'));
});

test('real app route is shell-free while QA route keeps the presentation shell', async () => {
  const real = renderAppViewport({
    mode: 'unfolded',
    records: { smoke: 7, drink: 0, move: 60, water: 6, food: 0 },
    smokeEncountered: true,
  });
  assert.match(real, /class="app-viewport"/);
  assert.match(real, /data-experience="real"/);
  assert.match(real, /class="bottom-nav"/);
  assert.doesNotMatch(real, /app-stage|handheld-shell|brand-header|mode-tabs|loop-strip/);

  const app = await readFile(join(root, 'src/app.js'), 'utf8');
  assert.match(app, /path\.endsWith\('\/qa\/device-preview'\)/);
  assert.match(app, /detectPosture/);
});

test('first-screen layout and approved assets are present', async () => {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const shell = await readFile(join(root, 'src/layout/shell.js'), 'utf8');
  assert.match(html, /src\/app\.js/);
  assert.match(shell, /data-mode-choice="unfolded"/);
  assert.match(shell, /data-mode-choice="folded"/);
  for (const asset of [
    'room/bed.png',
    'room/window.png',
    'characters/zhanzhan-morning.png',
    'characters/smoke-beast-encounter.png',
    'world/egg-still.png',
    'world/plant-stage-b.png',
    'ui/note-paper.png',
    'material/texture-wall.png',
    'material/texture-paper.png',
    'material/grain-overlay.png',
    'material/frame-panel.png',
    'material/frame-button-secondary.png',
    'material/frame-cta-black.png',
    'material/frame-label-black.png',
    'material/divider-handdrawn.png',
    'ui/mood-good.svg',
    'ui/mood-okay.svg',
    'ui/mood-bad.svg',
    'ui/nav-house.svg',
    'ui/nav-search.svg',
    'ui/nav-book.svg',
    'ui/nav-person.svg',
  ]) {
    await access(join(root, 'public/assets', asset));
  }
});

test('GitHub Pages runtime keeps asset URLs repository-relative', async () => {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const css = await readFile(join(root, 'src/styles/app.css'), 'utf8');
  const tokens = await readFile(join(root, 'src/styles/tokens.css'), 'utf8');
  const scene = await readFile(join(root, 'src/data/scene.js'), 'utf8');
  assert.doesNotMatch(html, /href="\/src\//);
  assert.doesNotMatch(html, /src="\/src\//);
  assert.doesNotMatch(`${css}\n${scene}`, /url\('\/public\//);
  assert.match(css, /frame-panel\.png/);
  assert.match(css, /frame-button-secondary\.png/);
  assert.match(css, /frame-cta-black\.png/);
  assert.match(css, /aspect-ratio: 2248 \/ 2480/);
  assert.match(css, /aspect-ratio: 1140 \/ 2616/);
  assert.match(css, /\.unfolded-room \.room-scene \{ width: 100%; height: 100%; aspect-ratio: auto/);
  assert.match(css, /grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1fr\)/);
  assert.match(css, /\.unfolded-display > \.quick-records \{ grid-column: 1 \/ -1; grid-row: 2/);
  assert.match(css, /\.status-column \{ grid-column: 2; grid-row: 1;/);
  assert.match(tokens, /--action-quick: 225px/);
  assert.match(tokens, /--record-resident-height: 178px/);
  assert.match(tokens, /--screen-folded-room: 49%/);
  assert.match(tokens, /--world-egg: \.65/);
});

test('no legacy runtime source is imported', async () => {
  const app = await readFile(join(root, 'src/app.js'), 'utf8');
  const shell = await readFile(join(root, 'src/layout/shell.js'), 'utf8');
  assert.doesNotMatch(`${app}\n${shell}`, /preview-site|localStorage|indexedDB|styles\.css/);
});

test('render contract keeps the handheld loop visible', () => {
  const html = renderShell({
    mode: 'unfolded',
    records: { smoke: 7, drink: 0, move: 60, water: 6, food: 0 },
    lastAction: null,
    smokeEncountered: true,
  });
  assert.match(html, /handheld-shell/);
  assert.match(html, /data-screen-mode="unfolded"/);
  assert.match(html, /ROOM ZERO/);
  assert.match(html, /快速记录/);
  assert.match(html, /LIFE SEEDS/);
  assert.match(html, /mood-good\.svg/);
  assert.match(html, /nav-house\.svg/);
  assert.doesNotMatch(html, /今天，真实生活/);
  assert.doesNotMatch(html, /Take a breath/);
  assert.match(html, /smoke-beast-encounter\.png/);
  assert.doesNotMatch(html, /focus-panel/);
  assert.doesNotMatch(html, /MAIN DISPLAY/);
  assert.match(html, /data-action="other-log"/);
  assert.doesNotMatch(html, /\\n/);

  const folded = renderShell({
    mode: 'folded',
    records: { smoke: 7, drink: 0, move: 60, water: 6, food: 0 },
    lastAction: null,
    smokeEncountered: true,
  });
  assert.match(folded, /data-screen-mode="folded"/);
  assert.match(folded, /目标 ≤10支/);
  assert.match(folded, /primary-action/);
  assert.match(folded, /\+ 抽了一支/);
  assert.match(folded, /cta-companion/);
  assert.match(folded, /secondary-action/);
  assert.match(folded, /记录其他/);
  assert.match(folded, /secondary-plus/);
  assert.doesNotMatch(folded, /folded-actions/);
  assert.doesNotMatch(folded, /class="bottom-nav"/);
});
