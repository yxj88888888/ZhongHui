const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');

if (!html.includes('class="screen"')) {
  throw new Error('Expected the YueXin template screen canvas');
}

const screenRule = css.match(/\.screen\s*\{([^}]*)\}/m)?.[1] || '';
if (!/width:\s*min\(1080px,\s*100%\)/.test(screenRule)) {
  throw new Error('Expected the screen canvas to stay responsive up to 1080px');
}
if (!/min-height:\s*100vh/.test(screenRule) || !/margin:\s*0\s+auto/.test(screenRule)) {
  throw new Error('Expected the screen canvas to fill the viewport and remain centered');
}

for (const breakpoint of ['768px', '480px']) {
  if (!css.includes(`@media (max-width: ${breakpoint})`)) {
    throw new Error(`Expected responsive rules for ${breakpoint}`);
  }
}

if (/calc\(100vw|50vw/.test(css)) {
  throw new Error('Viewport-wide chart breakout would overflow the responsive canvas');
}

console.log('page uses the YueXin responsive screen canvas');
