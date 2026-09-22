const REFRESH_INTERVAL_MS = 60 * 1000;
const priceStatus = document.getElementById('price-status');
const updatedAt = document.getElementById('updated-at');

function setStatus(message, isError = false) {
  if (!priceStatus) return;
  priceStatus.textContent = message;
  priceStatus.classList.toggle('is-error', isError);
}

function updateRow(row, price) {
  const sell = row.querySelector('[data-price-field="sell"]');
  const recycle = row.querySelector('[data-price-field="recycle"]');
  if (sell) sell.textContent = price.sell_price ?? '--';
  if (recycle) recycle.textContent = price.recycle_price ?? '--';
}

function renderPrices(payload) {
  const prices = Array.isArray(payload?.prices) ? payload.prices : [];
  const priceMap = new Map(prices.map((price) => [price.id, price]));
  document.querySelectorAll('[data-price-id]').forEach((row) => {
    const price = priceMap.get(row.dataset.priceId);
    if (price) updateRow(row, price);
  });
  if (updatedAt) updatedAt.textContent = payload?.update_time || '--';
}

async function fetchGoldPrices() {
  setStatus('正在读取价格…');
  try {
    const response = await fetch('/api/gold/current', { cache: 'no-store' });
    const payload = await response.json();
    if (payload.code !== 1 || !payload.data) {
      throw new Error(payload.msg || '价格暂时不可用');
    }
    renderPrices(payload.data);
    setStatus('价格已更新');
  } catch (error) {
    setStatus('价格暂时不可用，请稍后刷新', true);
    console.error('读取固定金价失败:', error);
  }
}

fetchGoldPrices();
window.setInterval(fetchGoldPrices, REFRESH_INTERVAL_MS);
