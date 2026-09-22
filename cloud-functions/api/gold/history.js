import { json } from '../_shared/http.js';
import { getControlStore } from '../_shared/store.js';
import { readPriceHistory } from './_service.js';

export async function onRequestGet(context = {}) {
  try {
    const request = context.request || new Request('https://example.test/api/gold/history');
    const store = context.store || getControlStore();
    const range = new URL(request.url).searchParams.get('range') || 'today';
    const data = await readPriceHistory(store, range);
    return json({ code: 1, data });
  } catch (error) {
    console.error('Failed to read fixed gold history:', error);
    return json({ code: 0, data: [], msg: '金价历史暂时不可用' }, 503);
  }
}
