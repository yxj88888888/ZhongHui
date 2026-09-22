import { clearSessionCookie, json } from '../_shared/http.js';

export async function onRequestPost() {
  const headers = new Headers();
  clearSessionCookie(headers);
  return json({ code: 1, data: null }, 200, Object.fromEntries(headers.entries()));
}
