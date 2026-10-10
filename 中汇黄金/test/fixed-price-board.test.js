const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');

for (const marker of [
  'gold-price-board',
  'price-rows',
  'data-price-id="jewelry_gold"',
  'data-price-id="platinum"',
  'data-price-id="silver"',
]) {
  if (!html.includes(marker)) throw new Error('Missing fixed price board marker: ' + marker);
}

if (!html.includes('images/western-zhengji-logo.jpg') || !html.includes('images/western-zhengji-qr.png')) {
  throw new Error('Expected new Western Zheng Ji logo and QR assets');
}
if (!css.includes('--board-gold') || !css.includes('.price-digits')) {
  throw new Error('Expected black-gold digit board styling');
}
if (!css.includes('@media (max-width: 640px)')) {
  throw new Error('Expected mobile fixed price board styles');
}
if (!app.includes("fetch('/api/gold/current'") || app.includes('goldcard.yunxua.com')) {
  throw new Error('Expected fixed gold API without external source');
}
for (const removedMarker of [
  'class="brand-copy"',
  'class="board-intro"',
  'WESTERN ZHENG JI',
  '贵金属价格牌',
  '价格已更新',
]) {
  if (html.includes(removedMarker)) {
    throw new Error('Duplicate brand header must be removed: ' + removedMarker);
  }
}

console.log('fixed price board structure and styles are present');
