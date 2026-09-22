const fs = require('fs');
const path = require('path');
const vm = require('vm');

const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const sandbox = {
  console: { log() {}, error() {} },
  process: { env: {}, on() {}, exit() {} },
  __dirname: path.join(__dirname, '..'),
  require(name) {
    if (name === 'express') {
      const express = () => ({
        use() {},
        get() {},
        post() {},
        listen(_port, _host, callback) { if (callback) callback(); },
      });
      express.json = () => {};
      express.raw = () => {};
      express.static = () => {};
      return express;
    }
    if (name === 'node-fetch') {
      return async () => ({ json: async () => ({ rates: {} }) });
    }
    return require(name);
  },
  setInterval() {},
  setImmediate(callback) { callback(); },
  Date,
};

vm.runInNewContext(serverSource, sandbox);
sandbox.fetchGoldPrice().then((price) => {
  if (price.sale_price !== 1107 || price.buyback_price !== 918) {
    throw new Error('Expected local service to use fixed initial price');
  }
  if (serverSource.includes('goldcard.yunxua.com')) {
    throw new Error('Local service must not use the expired external gold source');
  }
  console.log('local service uses fixed five-line price seed');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
