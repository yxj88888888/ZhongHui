const fs = require('fs');
const path = require('path');
const vm = require('vm');

const chartSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'chart.js'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
const setOptions = [];

const sandbox = {
  window: { addEventListener() {} },
  document: {
    getElementById(id) {
      return {
        id,
        textContent: '',
        innerHTML: '',
        dataset: {},
        classList: { remove() {}, add() {} },
        offsetWidth: 0,
      };
    },
  },
  console,
  setInterval() {},
  fetch: async () => ({ json: async () => ({ code: 0, data: [] }) }),
  echarts: {
    init() {
      return {
        setOption(option) { setOptions.push(option); },
        dispose() {},
        resize() {},
      };
    },
  },
};

vm.runInNewContext(
  chartSource + '\n' + appSource + `
    const axisDay = new Date(2026, 5, 6, 10, 42).getTime();
    goldHistory = [
      { timestamp: axisDay, sale_price: 965.27, buyback_price: 934.59 },
    ];
    currentRange = 'today';
    updateMainChart();
  `,
  sandbox
);

const updateOption = setOptions[setOptions.length - 1];
if (!updateOption) {
  throw new Error('Expected chart update option');
}

const xAxis = updateOption.xAxis;
const yAxis = updateOption.yAxis;
if (!xAxis || !yAxis) {
  throw new Error('Expected chart update to include both xAxis and yAxis settings');
}

const minDate = new Date(xAxis.min);
const maxDate = new Date(xAxis.max);
if (minDate.getHours() !== 10 || minDate.getMinutes() !== 0) {
  throw new Error('Expected today x-axis to start at 10:00');
}
if (maxDate.getHours() !== 20 || maxDate.getMinutes() !== 0) {
  throw new Error('Expected today x-axis to end at 20:00');
}
if (xAxis.splitNumber !== 5) {
  throw new Error('Expected wider x-axis tick spacing');
}

const span = Number((yAxis.max - yAxis.min).toFixed(8));
if (span !== 20) {
  throw new Error(`Expected y-axis price span to be 20, got ${span}`);
}
if (yAxis.min !== 955 || yAxis.max !== 975) {
  throw new Error(`Expected y-axis around latest price 965.27 to be 955-975, got ${yAxis.min}-${yAxis.max}`);
}
if (yAxis.interval !== 5) {
  throw new Error('Expected y-axis ticks every 5 units inside the 20-unit span');
}

if (!appSource.includes('chartDom.dataset.xMinTime') || !appSource.includes('chartDom.dataset.ySpan')) {
  throw new Error('Expected chart DOM to expose axis range diagnostics for browser verification');
}

console.log('chart axes use 10:00-20:00 x-range and 20-unit y-span');
