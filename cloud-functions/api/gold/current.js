import { fetchGoldPrice, toPublicPrice } from './_service.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=UTF-8',
    },
  });
}

export async function onRequestGet() {
  try {
    const price = await fetchGoldPrice();
    return json({ code: 1, data: toPublicPrice(price) });
  } catch (error) {
    console.error('Failed to fetch current gold price:', error);
    return json({ code: 0, data: null, msg: '金价数据暂时不可用' }, 502);
  }
}
