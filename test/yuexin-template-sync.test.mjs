import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const publicRoot = new URL('../中汇黄金/public/', import.meta.url);
const [html, css, app, chart] = await Promise.all([
  readFile(new URL('index.html', publicRoot), 'utf8'),
  readFile(new URL('css/style.css', publicRoot), 'utf8'),
  readFile(new URL('js/app.js', publicRoot), 'utf8'),
  readFile(new URL('js/chart.js', publicRoot), 'utf8'),
]);

for (const marker of [
  'class="screen"',
  'class="paper-noise"',
  'class="bamboo"',
  'class="mountains"',
  'class="live-seal"',
  'id="price-range-info"',
  '金价随市场波动，具体以门店成交价为准',
]) {
  assert.ok(html.includes(marker), `missing YueXin template marker: ${marker}`);
}

assert.ok(!html.includes('cdn.tailwindcss.com'), 'the YueXin template must not load Tailwind CDN');
assert.ok(!html.includes('font-awesome'), 'the YueXin template must not load Font Awesome');

for (const selector of ['.screen', '.paper-noise', '.bamboo', '.mountains', '.live-seal']) {
  assert.ok(css.includes(selector), `missing YueXin template selector: ${selector}`);
}

assert.ok(app.includes("fetch('/api/gold/current')"), 'current price must keep the ZhongHui API');
assert.ok(
  app.includes("fetch('/api/gold/history?range=' + currentRange)"),
  'history must keep the ZhongHui API',
);
assert.ok(!app.includes('/gold-api/gold/'), 'YueXin gold API routes must not replace ZhongHui routes');
assert.ok(chart.includes("bg: '#fffdf8'"), 'chart must use the YueXin light-gold theme');

console.log('YueXin main-page template contract passed');
