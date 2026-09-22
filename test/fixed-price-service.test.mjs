import assert from 'node:assert/strict';

import {
  DEFAULT_PRICES,
  normalizePriceRows,
  formatPublicPrices,
  appendPriceSnapshot,
} from '../cloud-functions/api/gold/defaults.js';

assert.deepEqual(DEFAULT_PRICES.map(({ id }) => id), [
  'jewelry_gold',
  'non_member_bar',
  'member_bar',
  'platinum',
  'silver',
]);
assert.equal(DEFAULT_PRICES[0].sell_price, 1107);
assert.equal(DEFAULT_PRICES[4].recycle_price, 12.7);
assert.throws(
  () => normalizePriceRows([{ id: 'jewelry_gold', sell_price: -1, recycle_price: 918 }]),
  /positive|invalid/i,
);
assert.throws(
  () => normalizePriceRows(DEFAULT_PRICES.slice(0, 4)),
  /complete|five|missing/i,
);
assert.deepEqual(formatPublicPrices(DEFAULT_PRICES)[0], {
  id: 'jewelry_gold',
  label: '首饰金',
  sell_price: '1107.00',
  recycle_price: '918.00',
  unit: '元/克',
});
const snapshot = appendPriceSnapshot([], DEFAULT_PRICES, {
  username: 'XBZJ001',
  timestamp: '2026-09-22T00:00:00.000Z',
});
assert.equal(snapshot.length, 1);
assert.equal(snapshot[0].prices.length, 5);

console.log('Fixed price service red-green contract passed');
