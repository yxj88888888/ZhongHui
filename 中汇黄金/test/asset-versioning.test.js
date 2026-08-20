const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

if (!html.includes('css/style.css?v=light-gold-template-20260712')) {
  throw new Error('Expected the light-template stylesheet URL to be cache-busted');
}

if (!html.includes('js/chart.js?v=light-gold-template-20260712') || !html.includes('js/app.js?v=light-gold-template-20260712')) {
  throw new Error('Expected local scripts to keep cache-busting versions');
}

console.log('local assets use explicit cache-busting versions');
