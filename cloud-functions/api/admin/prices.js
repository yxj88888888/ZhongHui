import { parseJson, json } from '../_shared/http.js';
import { CAPABILITIES, can } from '../_shared/permissions.js';
import { appendAudit } from '../_shared/auth.js';
import { getRequest, authenticated, handleError } from './_helpers.js';
import { getCurrentPrices, readCurrentPrices, savePrices, toPublicPricePayload } from '../gold/_service.js';

export async function onRequestGet(context = {}) {
  try {
    const { store } = await authenticated(context, CAPABILITIES.pricesRead);
    return json({ code: 1, data: toPublicPricePayload(await readCurrentPrices(store)) });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPost(context = {}) {
  try {
    const { store, user } = await authenticated(context, CAPABILITIES.pricesWrite);
    const body = await parseJson(getRequest(context));
    const current = await savePrices(store, body.prices, { username: user.username });
    await appendAudit(store, {
      action: 'price.update',
      user_id: user.id,
      username: user.username,
      prices: current.prices,
    });
    return json({ code: 1, data: toPublicPricePayload(current) });
  } catch (error) {
    return handleError(error);
  }
}
