import { json } from '../_shared/http.js';
import { getControlStore } from '../_shared/store.js';
import { readCurrentPrices, toPublicPricePayload } from './_service.js';

export async function onRequestGet(context = {}) {
  try {
    const state = await readCurrentPrices(context.store || getControlStore());
    return json({ code: 1, data: toPublicPricePayload(state) });
  } catch (error) {
    console.error('Failed to read fixed gold prices:', error);
    return json({ code: 0, data: null, msg: '金价数据暂时不可用' }, 503);
  }
}
