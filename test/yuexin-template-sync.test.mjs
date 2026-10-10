import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const publicRoot = new URL('../中汇黄金/public/', import.meta.url);
const [html, css, app, adminHtml, adminCss, adminJs] = await Promise.all([
  readFile(new URL('index.html', publicRoot), 'utf8'),
  readFile(new URL('css/style.css', publicRoot), 'utf8'),
  readFile(new URL('js/app.js', publicRoot), 'utf8'),
  readFile(new URL('admin/index.html', publicRoot), 'utf8'),
  readFile(new URL('admin/admin.css', publicRoot), 'utf8'),
  readFile(new URL('admin/admin.js', publicRoot), 'utf8'),
]);

for (const marker of [
  'gold-price-board',
  'gold-price-table',
  'data-price-id="jewelry_gold"',
  'data-price-id="non_member_bar"',
  'data-price-id="member_bar"',
  'data-price-id="platinum"',
  'data-price-id="silver"',
  '更新时间',
  '贵金属投资不做非实物交易',
]) {
  assert.ok(html.includes(marker), 'missing fixed price board marker: ' + marker);
}

assert.ok(!html.includes('href="/admin"'), 'public page must not expose an admin link');
assert.ok(/#cf9f79|--board-brown|--warm-brown/.test(css), 'missing Shuibei warm-brown palette');
assert.ok(/border-radius:\s*(1[2-9]|[2-9][0-9])px/.test(css), 'missing rounded price board');
assert.ok(/@media\s*\(max-width:\s*640px\)/.test(css), 'missing mobile price board breakpoint');
assert.ok(app.includes("fetch('/api/gold/current'"), 'public page must use fixed gold API');
assert.ok(!app.includes('goldcard.yunxua.com'), 'public page must not call external gold source');

for (const marker of [
  'admin-login',
  'admin-app',
  'price-editor',
  'user-manager',
  'audit-log',
  'force-password-change',
]) {
  assert.ok(adminHtml.includes(marker), 'missing admin marker: ' + marker);
}
assert.ok(adminCss.includes('--admin-ink'), 'missing admin visual tokens');
assert.ok(adminJs.includes('/api/admin/login'), 'admin page must use admin login endpoint');

console.log('Fixed price board template contract passed');
