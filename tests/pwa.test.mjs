import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('production PWA manifest is installable and scoped to GitHub Pages', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.name, 'ALIVE');
  assert.equal(manifest.short_name, 'ALIVE');
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.display_override, ['standalone']);
  assert.equal(manifest.start_url, '/alive830/');
  assert.equal(manifest.scope, '/alive830/');
  assert.equal(manifest.id, '/alive830/');
  assert.equal(manifest.prefer_related_applications, false);
  assert.equal(manifest.icons.length, 4);
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'maskable'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
});

test('production entry links the manifest and registers a service worker', async () => {
  const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  const pwa = await fs.readFile(path.join(root, 'src/pwa.js'), 'utf8');
  const worker = await fs.readFile(path.join(root, 'sw.js'), 'utf8');
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /src="\.\/src\/pwa\.js/);
  assert.match(pwa, /navigator\.serviceWorker\.register\('\.\/sw\.js'/);
  assert.match(worker, /addEventListener\('fetch'/);
  assert.match(worker, /skipWaiting/);
});

test('PWA icon files have the required PNG dimensions', async () => {
  const readPngSize = async file => {
    const bytes = await fs.readFile(path.join(root, file));
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  };
  assert.deepEqual(await readPngSize('public/icons/icon-192.png'), { width: 192, height: 192 });
  assert.deepEqual(await readPngSize('public/icons/icon-512.png'), { width: 512, height: 512 });
  assert.deepEqual(await readPngSize('public/icons/icon-maskable-192.png'), { width: 192, height: 192 });
  assert.deepEqual(await readPngSize('public/icons/icon-maskable-512.png'), { width: 512, height: 512 });
});
