import { getStore } from '@edgeone/pages-blob';

import {
  appendHistory,
  fetchGoldPrice,
  selectHistory,
} from './_service.js';

const HISTORY_KEY = 'gold/history.json';
let store;

function getHistoryStore() {
  if (!store) {
    store = getStore({
      name: 'zhonghui-gold-history',
      consistency: 'strong',
    });
  }
  return store;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=UTF-8',
    },
  });
}

async function readHistory() {
  try {
    const history = await getHistoryStore().get(HISTORY_KEY, { type: 'json' });
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.warn('Gold history is not initialized:', error);
    return [];
  }
}

export async function onRequestGet({ request }) {
  try {
    const price = await fetchGoldPrice();
    const previous = await readHistory();
    const history = appendHistory(previous, price);

    if (history.length !== previous.length) {
      try {
        await getHistoryStore().setJSON(HISTORY_KEY, history);
      } catch (error) {
        console.warn('Failed to persist gold history:', error);
      }
    }

    const range = new URL(request.url).searchParams.get('range') || 'today';
    return json({ code: 1, data: selectHistory(history, range, price.timestamp) });
  } catch (error) {
    console.error('Failed to fetch gold history:', error);
    return json({ code: 0, data: [], msg: '金价历史暂时不可用' }, 502);
  }
}
