const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'style.css'), 'utf8');
const qrPath = path.join(root, 'public', 'images', 'store-wechat-qr.jpg');

if (!fs.existsSync(qrPath)) throw new Error('Expected store WeChat QR image');
for (const marker of ['qr-block', 'images/store-wechat-qr.jpg', '关注粤鑫金', '了解实时行情']) {
  if (!html.includes(marker)) throw new Error('Missing QR marker: ' + marker);
}
if (!css.includes('.qr-block') || !css.includes('.qr-block img')) {
  throw new Error('Expected QR block styling');
}

console.log('QR module includes asset, text, and responsive styling');
