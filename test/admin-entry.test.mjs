import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../中汇黄金/public/admin/index.html', import.meta.url), 'utf8');
const entry = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(entry, 'admin entry must normalize its URL before loading the form');

for (const [url, expected] of [
  ['http://www.zhonghui.online/admin', 'https://www.zhonghui.online/admin/'],
  ['http://www.zhonghui.online/admin/?tab=prices#editor', 'https://www.zhonghui.online/admin/?tab=prices#editor'],
  ['https://www.zhonghui.online/admin', 'https://www.zhonghui.online/admin/'],
  ['https://www.zhonghui.online/admin/index.html', 'https://www.zhonghui.online/admin/'],
  ['https://www.zhonghui.online/admin/', null],
  ['http://127.0.0.1:3314/admin', 'http://127.0.0.1:3314/admin/'],
  ['http://127.0.0.1:3314/admin/', null],
]) {
  let destination = null;
  vm.runInNewContext(entry, { URL, window: { location: { href: url, replace(value) { destination = value; } } } });
  assert.equal(destination, expected, 'incorrect redirect for ' + url);
}

for (const base of ['http://www.zhonghui.online/admin', 'https://www.zhonghui.online/admin/']) {
  const cssPath = html.match(/<link[^>]+href="([^"]+)"/)?.[1];
  const scriptPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
  assert.equal(new URL(cssPath, base).pathname, '/admin/admin.css');
  assert.equal(new URL(scriptPath, base).pathname, '/admin/admin.js');
}

const config = JSON.parse(await readFile(new URL('../edgeone.json', import.meta.url), 'utf8'));
assert.ok(config.redirects.some(rule => rule.source === '/admin' &&
  rule.destination === 'https://www.zhonghui.online/admin/' && rule.statusCode === 301));
console.log('Admin entry HTTPS, directory routing, and asset URL checks passed');
