export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=UTF-8',
      ...headers,
    },
  });
}

export async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error('invalid JSON body');
  }
}

export function getCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const item of raw.split(';')) {
    const [key, ...value] = item.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

export function setSessionCookie(headers, value, maxAge = 8 * 60 * 60) {
  headers.set(
    'Set-Cookie',
    'zhonghui_session=' + value + '; Max-Age=' + maxAge + '; Path=/; HttpOnly; Secure; SameSite=Lax',
  );
}

export function clearSessionCookie(headers) {
  headers.set(
    'Set-Cookie',
    'zhonghui_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax',
  );
}
