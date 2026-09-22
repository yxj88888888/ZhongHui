import {
  appendPriceSnapshot,
  DEFAULT_PRICES,
  formatPublicPrices,
  normalizePriceRows,
} from './defaults.js';
import { getControlStore, readJson, writeJson } from '../_shared/store.js';

export const PRICES_KEY = 'gold/prices.json';
export const HISTORY_KEY = 'gold/history.json';

function nowIso() {
  return new Date().toISOString();
}

export async function readCurrentPrices(store = getControlStore()) {
  const saved = await readJson(store, PRICES_KEY, null);
  if (saved?.prices) {
    return {
      prices: normalizePriceRows(saved.prices),
      update_time: saved.update_time || nowIso(),
      updated_by: saved.updated_by || 'system',
    };
  }

  const initial = {
    prices: normalizePriceRows(DEFAULT_PRICES),
    update_time: nowIso(),
    updated_by: 'system',
  };
  await writeJson(store, PRICES_KEY, initial);
  return initial;
}

export async function getCurrentPrices(store = getControlStore()) {
  return readCurrentPrices(store);
}

export async function savePrices(store = getControlStore(), rows, actor = {}) {
  const prices = normalizePriceRows(rows);
  const previousHistory = await readJson(store, HISTORY_KEY, []);
  const update_time = nowIso();
  const current = {
    prices,
    update_time,
    updated_by: actor.username || 'system',
  };
  const history = appendPriceSnapshot(previousHistory, prices, {
    username: current.updated_by,
    timestamp: update_time,
  });
  await writeJson(store, PRICES_KEY, current);
  await writeJson(store, HISTORY_KEY, history);
  return current;
}

export async function saveCurrentPrices(store, rows, actor) {
  return savePrices(store, rows, actor);
}

export async function readPriceHistory(
  store = getControlStore(),
  range = 'today',
  now = Date.now(),
) {
  const history = await readJson(store, HISTORY_KEY, []);
  const cutoff = range === 'month'
    ? now - 30 * 24 * 60 * 60 * 1000
    : range === 'week'
      ? now - 7 * 24 * 60 * 60 * 1000
      : new Date(now).setHours(0, 0, 0, 0);
  return history
    .filter((snapshot) => Date.parse(snapshot.timestamp) >= cutoff)
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
}

export function toPublicPricePayload(state) {
  return {
    prices: formatPublicPrices(state.prices),
    update_time: state.update_time,
  };
}
