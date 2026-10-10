import { parseJson, json, setSessionCookie } from '../_shared/http.js';
import { appendAudit, ensureBootstrapAdmin, createSessionCookie, verifyPassword, USERS_KEY } from '../_shared/auth.js';
import { readJson, writeJson } from '../_shared/store.js';
import { getEnv, getRequest, getStore, handleError, publicUser, HttpError } from './_helpers.js';

export async function onRequestPost(context = {}) {
  try {
    const request = getRequest(context);
    const store = getStore(context);
    const env = getEnv(context);
    if (!env.AUTH_SECRET) throw new HttpError(503, '后台安全配置未完成', 'auth_not_configured');
    const body = await parseJson(request);
    const bootstrap = await ensureBootstrapAdmin(store, {
      username: env.INITIAL_ADMIN_USERNAME || 'XBZJ001',
      password: env.INITIAL_ADMIN_PASSWORD,
    });
    const users = await readJson(store, USERS_KEY, [bootstrap]);
    const user = users.find((item) => item.username === body.username && item.active !== false);
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      await appendAudit(store, { action: 'login.failure', username: body.username || '' });
      throw new HttpError(401, '账号或密码错误', 'invalid_credentials');
    }
    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = user.lastLoginAt;
    await writeJson(store, USERS_KEY, users);
    await appendAudit(store, { action: 'login.success', user_id: user.id, username: user.username });
    const token = await createSessionCookie({
      userId: user.id,
      role: user.role,
      passwordChangeOnly: user.forcePasswordChange === true,
    }, env.AUTH_SECRET);
    const headers = new Headers();
    setSessionCookie(headers, token);
    return json({
      code: 1,
      data: {
        user: publicUser(user),
        forcePasswordChange: user.forcePasswordChange === true,
      },
    }, 200, Object.fromEntries(headers.entries()));
  } catch (error) {
    return handleError(error);
  }
}
