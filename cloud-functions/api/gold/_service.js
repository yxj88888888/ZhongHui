const GOLD_PRICE_SOURCE_URL =
  'https://goldcard.yunxua.com/index/index/getRealTimePrices?sid=1003';
const YUEXIN_MARKUP = 5;
const YUEXIN_MARKUP_START_MINUTE = 15 * 60 + 30;
const YUEXIN_MARKUP_END_MINUTE = 20 * 60;
const MAX_HISTORY_POINTS = 1000;

function getBeijingMinuteOfDay(now) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return hour * 60 + minute;
}

function getBeijingDayStart(timestamp) {
  const shifted = new Date(timestamp + 8 * 60 * 60 * 1000);
  return Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  ) - 8 * 60 * 60 * 1000;
}

export function applyDisplayPriceRule(sourcePrice, now = new Date()) {
  const salePrice = Number(sourcePrice.sale_price);
  const buybackPrice = Number(sourcePrice.buyback_price);
  if (!Number.isFinite(salePrice) || !Number.isFinite(buybackPrice)) {
    throw new Error('Invalid gold price response');
  }

  const minuteOfDay = getBeijingMinuteOfDay(now);
  const markup =
    minuteOfDay >= YUEXIN_MARKUP_START_MINUTE &&
    minuteOfDay < YUEXIN_MARKUP_END_MINUTE
      ? YUEXIN_MARKUP
      : 0;

  return {
    sale_price: salePrice + markup,
    buyback_price: buybackPrice,
    update_time: sourcePrice.update_time,
  };
}

export async function fetchGoldPrice(fetchImpl = fetch, now = new Date()) {
  const response = await fetchImpl(GOLD_PRICE_SOURCE_URL, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error('Gold price source returned ' + response.status);
  }

  const payload = await response.json();
  if (payload.code !== 1 || !payload.data) {
    throw new Error('Gold price source returned invalid data');
  }

  const price = applyDisplayPriceRule(payload.data, now);
  return {
    time:
      price.update_time ||
      now.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }),
    sale_price: price.sale_price,
    buyback_price: price.buyback_price,
    timestamp: now.getTime(),
  };
}

export function toPublicPrice(point) {
  return {
    sale_price: Number(point.sale_price).toFixed(2),
    buyback_price: Number(point.buyback_price).toFixed(2),
    update_time: point.time,
  };
}

export function appendHistory(history, point) {
  const points = Array.isArray(history) ? history.slice() : [];
  const last = points.at(-1);
  if (
    !last ||
    Number(last.sale_price) !== Number(point.sale_price) ||
    Number(last.buyback_price) !== Number(point.buyback_price)
  ) {
    points.push(point);
  }
  return points.slice(-MAX_HISTORY_POINTS);
}

export function selectHistory(history, range = 'today', now = Date.now()) {
  const points = Array.isArray(history) ? history : [];
  let cutoff = getBeijingDayStart(now);
  if (range === 'week') cutoff = now - 7 * 24 * 60 * 60 * 1000;
  if (range === 'month') cutoff = now - 30 * 24 * 60 * 60 * 1000;

  return points
    .filter((point) => Number(point.timestamp) >= cutoff)
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
}
