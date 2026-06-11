const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');

if (!html.includes('data-display-size="550x950"')) {
  throw new Error('Expected the page to declare the 550x950 display target');
}

if (!/--display-aspect-ratio:\s*550\s*\/\s*950/.test(css)) {
  throw new Error('Expected the display aspect ratio to be documented as 550/950');
}

if (!/--display-canvas-width:\s*min\(100vw,\s*57\.8947368421vh\)/.test(css)) {
  throw new Error('Expected the canvas width to preserve the 550:950 aspect ratio');
}

const bodyBlock = css.match(/body\s*\{([\s\S]*?)\}/)?.[1] || '';
if (!/width:\s*var\(--display-canvas-width\)/.test(bodyBlock)) {
  throw new Error('Expected the page body to use the portrait canvas width');
}
if (!/min-height:\s*100vh/.test(bodyBlock) || !/margin:\s*0\s+auto\s*!important/.test(bodyBlock)) {
  throw new Error('Expected the portrait canvas to fill the screen height and stay centered');
}

if (/calc\(100vw|50vw/.test(css)) {
  throw new Error('Viewport-wide chart breakout would overflow the 550x950 canvas');
}

if (!/@media \(max-width: 768px\), \(orientation: portrait\), \(min-aspect-ratio: 550 \/ 950\)/.test(css)) {
  throw new Error('Expected portrait layout rules to apply independently of screen pixel resolution');
}

console.log('page preserves the 550x950 portrait display ratio');
