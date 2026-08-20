import assert from 'node:assert/strict';

import {
  appendHistory,
  applyDisplayPriceRule,
  fetchGoldPrice,
  selectHistory,
  toPublicPrice,
} from '../cloud-functions/api/gold/_service.js';

const sourcePrice = {
  sale_price: '800.25',
  buyback_price: '790.10',
  update_time: '2026-08-20 15:30:00',
};

const beforeMarkup = applyDisplayPriceRule(sourcePrice, new Date('2026-08-20T07:29:00Z'));
assert.equal(beforeMarkup.sale_price, 800.25);

const duringMarkup = applyDisplayPriceRule(sourcePrice, new Date('2026-08-20T07:30:00Z'));
assert.equal(duringMarkup.sale_price, 805.25);
assert.equal(duringMarkup.buyback_price, 790.10);

let requestedUrl;
const point = await fetchGoldPrice(async (url) => {
  requestedUrl = url;
  return {
    ok: true,
    async json() {
      return { code: 1, data: sourcePrice };
    },
  };
}, new Date('2026-08-20T07:30:00Z'));

assert.match(requestedUrl, /getRealTimePrices\?sid=1003$/);
assert.deepEqual(toPublicPrice(point), {
  sale_price: '805.25',
  buyback_price: '790.10',
  update_time: sourcePrice.update_time,
});

const firstHistory = appendHistory([], point);
assert.equal(firstHistory.length, 1);
assert.equal(appendHistory(firstHistory, point).length, 1);

const changedPoint = { ...point, sale_price: 806.25, timestamp: point.timestamp + 1000 };
const changedHistory = appendHistory(firstHistory, changedPoint);
assert.equal(changedHistory.length, 2);

const oldPoint = { ...point, timestamp: Date.parse('2026-08-01T00:00:00Z') };
assert.deepEqual(selectHistory([oldPoint, point], 'today', point.timestamp), [point]);

const currentFunction = await import('../cloud-functions/api/gold/current.js');
const historyFunction = await import('../cloud-functions/api/gold/history.js');
assert.equal(typeof currentFunction.onRequestGet, 'function');
assert.equal(typeof historyFunction.onRequestGet, 'function');

console.log('EdgeOne gold service contract passed');
