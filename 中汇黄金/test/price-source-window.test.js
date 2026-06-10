const fs = require('fs');
const path = require('path');
const vm = require('vm');

const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const sandbox = {
  console: { log() {}, error() {} },
  process: {
    env: {},
    on() {},
    exit() {},
  },
  __dirname: path.join(__dirname, '..'),
  require(name) {
    if (name === 'express') {
      const express = () => ({
        use() {},
        get() {},
        post() {},
        listen(_port, _host, callback) {
          if (callback) callback();
        },
      });
      express.json = () => {};
      express.raw = () => {};
      express.static = () => {};
      return express;
    }
    if (name === 'node-fetch') {
      return async () => ({
        json: async () => ({
          code: 1,
          data: {
            sale_price: '950.00',
            buyback_price: '930.00',
            update_time: '2026-06-08 15:35:00',
          },
        }),
      });
    }
    return require(name);
  },
  setInterval() {},
  setImmediate(callback) { callback(); },
  Date,
};

vm.runInNewContext(serverSource, sandbox);

const source = { sale_price: '950.00', buyback_price: '930.00', update_time: '2026-06-08 15:35:00' };
const beforeWindow = sandbox.applyDisplayPriceRule(source, new Date(2026, 5, 8, 15, 29, 59));
const duringWindow = sandbox.applyDisplayPriceRule(source, new Date(2026, 5, 8, 15, 30, 0));
const endBoundary = sandbox.applyDisplayPriceRule(source, new Date(2026, 5, 8, 20, 0, 0));
const afterWindow = sandbox.applyDisplayPriceRule(source, new Date(2026, 5, 8, 20, 2, 0));

if (beforeWindow.sale_price !== 950 || beforeWindow.buyback_price !== 930) {
  throw new Error('Expected prices before 15:30 to directly use the source values');
}
if (duringWindow.sale_price !== 955 || duringWindow.buyback_price !== 930) {
  throw new Error('Expected sale price from 15:30 to 20:00 to add 5 while buyback stays direct');
}
if (endBoundary.sale_price !== 950 || endBoundary.buyback_price !== 930) {
  throw new Error('Expected prices at 20:00 and later to directly use the source values');
}
if (afterWindow.sale_price !== 950 || afterWindow.buyback_price !== 930) {
  throw new Error('Expected prices after 20:02 to directly use the source values');
}

if (!serverSource.includes('https://goldcard.yunxua.com/index/index/getRealTimePrices?sid=1003')) {
  throw new Error('Expected server to fetch the sid=1003 goldcard source over HTTPS');
}

console.log('sid=1003 price source keeps the +5 window from 15:30 to 20:00');
