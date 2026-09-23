const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');

for (const marker of [
  'gold-price-board',
  'gold-price-table',
  'data-price-id="jewelry_gold"',
  'data-price-id="non_member_bar"',
  'data-price-id="member_bar"',
  'data-price-id="platinum"',
  'data-price-id="silver"',
]) {
  if (!html.includes(marker)) throw new Error('Missing fixed price board marker: ' + marker);
}

if (!html.includes('images/western-zhengji-logo.jpg') || !html.includes('images/store-wechat-qr.jpg')) {
  throw new Error('Expected new Western Zheng Ji logo and QR assets');
}
if (!css.includes('--board-brown: #cf9f79') || !css.includes('.gold-price-table')) {
  throw new Error('Expected warm-brown table styling');
}
if (!css.includes('@media (max-width: 640px)')) {
  throw new Error('Expected mobile fixed price board styles');
}
if (!app.includes("fetch('/api/gold/current'") || app.includes('goldcard.yunxua.com')) {
  throw new Error('Expected fixed gold API without external source');
}

console.log('fixed price board structure and styles are present');
