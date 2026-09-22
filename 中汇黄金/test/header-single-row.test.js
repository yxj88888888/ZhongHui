const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');
if (!css.includes('@media (max-width: 640px)')) throw new Error('Missing mobile board media block');
if (!/\.board-footer\s*\{[\s\S]*display:\s*flex/.test(css)) throw new Error('Footer should use responsive flex layout');
if (!/@media\s*\(max-width:\s*640px\)[\s\S]*\.board-footer\s*\{[\s\S]*flex-direction:\s*column/.test(css)) {
  throw new Error('Footer should become a readable single column on mobile');
}

console.log('header and footer remain readable at narrow widths');
