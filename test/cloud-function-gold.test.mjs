import assert from 'node:assert/strict';

import {
  getCurrentPrices,
  readCurrentPrices,
  readPriceHistory,
  savePrices,
} from '../cloud-functions/api/gold/_service.js';
import { createMemoryStore } from '../cloud-functions/api/_shared/store.js';

const store = createMemoryStore();
const initial = await readCurrentPrices(store);
assert.equal(initial.prices.length, 5);
assert.equal(initial.prices[0].id, 'jewelry_gold');
assert.equal(initial.prices[0].sell_price, 1107);
assert.equal(initial.prices[4].recycle_price, 12.7);

const current = await getCurrentPrices(store);
assert.equal(current.prices[2].sell_price, 976);
assert.equal(current.prices[2].recycle_price, 918);

const changed = initial.prices.map((row) => (
  row.id === 'jewelry_gold' ? { ...row, sell_price: 1111 } : row
));
const saved = await savePrices(store, changed, { username: 'XBZJ001' });
assert.equal(saved.prices[0].sell_price, 1111);
assert.match(saved.update_time, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);

const history = await readPriceHistory(store, 'today', Date.now());
assert.equal(history.length, 1);
assert.equal(history[0].updated_by, 'XBZJ001');
assert.equal(history[0].prices[0].sell_price, '1111.00');

const currentFunction = await import('../cloud-functions/api/gold/current.js');
const historyFunction = await import('../cloud-functions/api/gold/history.js');
assert.equal(typeof currentFunction.onRequestGet, 'function');
assert.equal(typeof historyFunction.onRequestGet, 'function');

const currentResponse = await currentFunction.onRequestGet({ store });
assert.equal(currentResponse.status, 200);
assert.equal((await currentResponse.json()).data.prices.length, 5);

const historyResponse = await historyFunction.onRequestGet({
  store,
  request: new Request('https://example.test/api/gold/history?range=today'),
});
assert.equal(historyResponse.status, 200);
assert.equal((await historyResponse.json()).data.length, 1);

console.log('Fixed gold service contract passed');
