const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');
if (!css.includes('@media (max-width: 640px)')) throw new Error('Missing mobile board media block');
if (!/\.board-footer\s*\{[\s\S]*display:\s*flex/.test(css)) throw new Error('Footer should use responsive flex layout');
if (!/@media\s*\(max-width:\s*640px\)[\s\S]*\.qr-block img\s*\{[\s\S]*width:\s*66px/.test(css)) {
  throw new Error('Footer QR should fit the mobile board');
}

console.log('header and footer remain readable at narrow widths');
