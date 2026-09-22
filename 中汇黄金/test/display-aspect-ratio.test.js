const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');

if (!/\.gold-price-board\s*\{[\s\S]*min-height:\s*100vh/.test(css)) {
  throw new Error('Expected the price board to fill the viewport');
}
if (!/\.board-shell\s*\{[\s\S]*width:\s*min\(920px,\s*100%\)/.test(css)) {
  throw new Error('Expected the board shell to stay centered and responsive');
}
if (/calc\(100vw|50vw/.test(css)) {
  throw new Error('Unexpected viewport-wide overflow rule');
}

console.log('page uses a responsive fixed price board canvas');
