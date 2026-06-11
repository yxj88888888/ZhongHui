const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

if (!html.includes('css/style.css?v=display550x950-final-20260611')) {
  throw new Error('Expected stylesheet URL to be versioned so price-meta layout changes refresh in the browser');
}

if (!html.includes('js/chart.js?v=terminal-20260605') || !html.includes('js/app.js?v=yspan20-20260609')) {
  throw new Error('Expected local scripts to keep cache-busting versions');
}

console.log('local assets use explicit cache-busting versions');
