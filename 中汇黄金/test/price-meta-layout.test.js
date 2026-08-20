const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');

function ruleFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  if (!match) throw new Error(`Missing CSS rule for ${selector}`);
  return match[2];
}

const priceChange = ruleFor('.price-change');
if (!/display\s*:\s*grid/.test(priceChange) ||
    !/grid-template-columns\s*:\s*max-content\s+minmax\(130px,\s*1fr\)/.test(priceChange)) {
  throw new Error('Light template metadata should keep stable label and numeric columns');
}

const priceMeta = ruleFor('.price-meta');
if (!/margin-top\s*:\s*22px/.test(priceMeta)) {
  throw new Error('Light template metadata should sit below the main price');
}

const metaLabel = ruleFor('.meta-label');
if (!/text-align\s*:\s*left/.test(metaLabel)) {
  throw new Error('Metadata labels should align as a left text column');
}

const metaValue = ruleFor('.meta-value');
if (!/text-align\s*:\s*right/.test(metaValue) ||
    !/font-variant-numeric\s*:\s*tabular-nums/.test(metaValue)) {
  throw new Error('Metadata values should align right with tabular numbers');
}

const changeValue = ruleFor('.change-value');
if (!/display\s*:\s*flex/.test(changeValue) ||
    !/justify-content\s*:\s*flex-end/.test(changeValue)) {
  throw new Error('Change amount and percentage should align in one readable row');
}

if (!html.includes('id="price-range-info"')) {
  throw new Error('Buyback card should include high/low metadata');
}
if (!app.includes('最高') || !app.includes('最低')) {
  throw new Error('Price metadata should render today high and low values');
}
if (!app.includes('class="meta-label"') || !app.includes('class="meta-value"')) {
  throw new Error('Price metadata markup should separate labels and values');
}

console.log('light template metadata aligns labels and numbers below each price');
