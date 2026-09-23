export const PRICE_IDS = [
  'jewelry_gold',
  'non_member_bar',
  'member_bar',
  'platinum',
  'silver',
];

const DEFAULT_LABELS = {
  jewelry_gold: '首饰金',
  non_member_bar: '非会员金条',
  member_bar: '会员金条',
  platinum: '铂金',
  silver: '白银',
};

export const DEFAULT_PRICES = Object.freeze([
  { id: 'jewelry_gold', label: DEFAULT_LABELS.jewelry_gold, sell_price: 1107, recycle_price: 918, unit: '元/克' },
  { id: 'non_member_bar', label: DEFAULT_LABELS.non_member_bar, sell_price: 1042, recycle_price: 918, unit: '元/克' },
  { id: 'member_bar', label: DEFAULT_LABELS.member_bar, sell_price: 976, recycle_price: 918, unit: '元/克' },
  { id: 'platinum', label: DEFAULT_LABELS.platinum, sell_price: 441, recycle_price: 357, unit: '元/克' },
  { id: 'silver', label: DEFAULT_LABELS.silver, sell_price: 19.8, recycle_price: 12.7, unit: '元/克' },
]);

export function formatBeijingTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('invalid update time');
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value || '';
  return read('year') + '-' + read('month') + '-' + read('day') + ' ' +
    read('hour') + ':' + read('minute');
}

function normalizeNumber(value, field, id) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 999999.99) {
    throw new Error(field + ' for ' + id + ' must be a positive number');
  }
  if (Math.abs(number * 100 - Math.round(number * 100)) > 1e-8) {
    throw new Error(field + ' for ' + id + ' must have at most two decimals');
  }
  return number;
}

export function normalizePriceRows(rows) {
  if (!Array.isArray(rows) || rows.length !== PRICE_IDS.length) {
    throw new Error('price rows must contain all five products');
  }

  const byId = new Map();
  for (const row of rows) {
    if (!row || !PRICE_IDS.includes(row.id) || byId.has(row.id)) {
      throw new Error('price rows contain an invalid or duplicate product');
    }
    byId.set(row.id, row);
  }

  return PRICE_IDS.map((id) => {
    const row = byId.get(id);
    if (!row) throw new Error('price rows are missing ' + id);
    return {
      id,
      label: DEFAULT_LABELS[id],
      sell_price: normalizeNumber(row.sell_price, 'sell_price', id),
      recycle_price: normalizeNumber(row.recycle_price, 'recycle_price', id),
      unit: '元/克',
    };
  });
}

export function formatPublicPrices(rows) {
  return normalizePriceRows(rows).map((row) => ({
    ...row,
    sell_price: row.sell_price.toFixed(2),
    recycle_price: row.recycle_price.toFixed(2),
  }));
}

export function appendPriceSnapshot(history, rows, meta = {}) {
  const snapshots = Array.isArray(history) ? history.slice() : [];
  snapshots.push({
    timestamp: meta.timestamp || new Date().toISOString(),
    updated_by: meta.username || 'system',
    prices: formatPublicPrices(rows),
  });
  return snapshots.slice(-1000);
}
