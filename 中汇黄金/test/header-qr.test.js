const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'style.css'), 'utf8');
const qrPath = path.join(root, 'public', 'images', 'store-wechat-qr.jpg');

if (!html.includes('<title>粤鑫金 - 实时贵金属行情</title>')) {
  throw new Error('Expected a valid closed page title');
}
if (html.indexOf('</title>') > html.indexOf('<body')) {
  throw new Error('Title tag should not swallow body markup');
}

if (!fs.existsSync(qrPath)) {
  throw new Error('Expected store WeChat QR image to be copied into public images');
}

if (!html.includes('class="header-qr-card"')) {
  throw new Error('Expected header QR card markup');
}
if (!html.includes('images/store-wechat-qr.jpg')) {
  throw new Error('Expected header QR image source');
}
if (!html.includes('关注粤鑫金') || !html.includes('了解实时行情')) {
  throw new Error('Expected QR card follow text');
}

for (const selector of ['.header-qr-card', '.header-qr-img', '.header-qr-title', '.header-qr-subtitle']) {
  if (!css.includes(selector)) throw new Error(`Missing CSS selector ${selector}`);
}

const qrImageRule = css.match(/\.header-qr-img\s*\{([^}]*)\}/m);
if (!qrImageRule || !/width:\s*88px/.test(qrImageRule[1]) || !/height:\s*88px/.test(qrImageRule[1])) {
  throw new Error('Expected enlarged 88px header QR image');
}

const qrCardRule = css.match(/\.header-qr-card\s*\{([^}]*)\}/m);
if (!qrCardRule || !/width:\s*242px/.test(qrCardRule[1])) {
  throw new Error('Expected compact header QR card width');
}

if (!qrCardRule || !/gap:\s*10px/.test(qrCardRule[1])) {
  throw new Error('Expected compact gap between header QR image and copy');
}

if (!/@media\s*\(max-width:\s*768px\)[\s\S]*\.header-qr-card[\s\S]*width:\s*190px/.test(css)) {
  throw new Error('Expected QR card to shrink on narrow screens while staying in one row');
}

if (!/@media\s*\(max-width:\s*768px\)[\s\S]*\.header-qr-card[\s\S]*display:\s*flex/.test(css)) {
  throw new Error('Expected QR card to remain visible on narrow screens');
}

console.log('header QR module includes asset, text, and responsive styling');
