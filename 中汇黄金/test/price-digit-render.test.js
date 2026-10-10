const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rows = [
  ['jewelry_gold', 'sell_price'],
  ['silver', 'sell_price'],
  ['platinum', 'sell_price'],
  ['jewelry_gold', 'recycle_price'],
].map(([priceId, priceKey]) => {
  const digits = {
    cells: [],
    style: { setProperty() {} },
    setAttribute(name, value) { this[name] = value; },
    replaceChildren(...cells) { this.cells = cells; },
  };
  return { dataset: { priceId, priceKey }, digits, querySelector() { return digits; } };
});
const updatedAt = {};
const context = {
  document: {
    getElementById(id) { return id === 'updated-at' ? updatedAt : null; },
    querySelectorAll() { return rows; },
    createElement() { return { setAttribute() {} }; },
  },
  window: { setInterval() {} },
  fetch: async () => ({ json: async () => ({ code: 1, data: {
    prices: [
      { id: 'jewelry_gold', sell_price: '1107.00', recycle_price: '918.25' },
      { id: 'silver', sell_price: '19.80' },
      { id: 'platinum', sell_price: '441.00' },
    ],
    update_time: '2026-10-10 15:00',
  } }) }),
  console,
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8'), context);
setImmediate(() => {
  const values = rows.map(row => row.digits.cells.map(cell => cell.textContent).join('').trim());
  assert.deepEqual(values, ['1107', '19.8', '441', '918.25']);
  assert.equal(updatedAt.textContent, '2026-10-10 15:00');
  assert.equal(rows[3].digits['aria-label'], '918.25 元/克');
  console.log('four display rows use correct backend fields and preserve price decimals');
});
