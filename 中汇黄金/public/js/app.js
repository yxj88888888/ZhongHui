const REFRESH_INTERVAL_MS = 60 * 1000;
const priceStatus = document.getElementById('price-status');
const updatedAt = document.getElementById('updated-at');

function setStatus(message, isError = false) {
  if (!priceStatus) return;
  priceStatus.textContent = message;
  priceStatus.classList.toggle('is-error', isError);
  priceStatus.hidden = !isError;
}

function updateRow(row, price) {
  const value = Number(price[row.dataset.priceKey]);
  const text = value.toFixed(2).replace(/\.?0+$/, '');
  const digits = row.querySelector('.price-digits');
  const characters = text.padStart(4, ' ').split('');
  digits.replaceChildren(...characters.map((character) => {
    const cell = document.createElement('span');
    cell.textContent = character === ' ' ? '\u00a0' : character;
    cell.setAttribute('aria-hidden', 'true');
    return cell;
  }));
  digits.style.setProperty('--digit-count', characters.length);
  digits.setAttribute('aria-label', text + ' 元/克');
}

function renderPrices(payload) {
  const prices = Array.isArray(payload?.prices) ? payload.prices : [];
  const priceMap = new Map(prices.map((price) => [price.id, price]));
  const rows = [...document.querySelectorAll('[data-price-id]')];
  rows.forEach((row) => {
    const value = priceMap.get(row.dataset.priceId)?.[row.dataset.priceKey];
    if (value == null || value === '' || !Number.isFinite(Number(value)) || Number(value) <= 0) {
      throw new Error('价格数据不完整');
    }
  });
  rows.forEach((row) => updateRow(row, priceMap.get(row.dataset.priceId)));
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
