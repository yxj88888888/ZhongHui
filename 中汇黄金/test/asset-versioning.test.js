const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

if (!html.includes('css/style.css?v=fixed-price-board-20260923')) {
  throw new Error('Expected fixed price board stylesheet URL to be cache-busted');
}
if (!html.includes('js/app.js?v=fixed-price-board-20260923')) {
  throw new Error('Expected public app script to keep a cache-busting version');
}
if (html.includes('vendor/echarts.min.js') || html.includes('js/chart.js')) {
  throw new Error('Fixed price board must not load the removed chart surface');
}

console.log('fixed price board assets use explicit cache-busting versions');
