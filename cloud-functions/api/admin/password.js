import { parseJson, json, setSessionCookie } from '../_shared/http.js';
import {
  appendAudit,
  createSessionCookie,
  hashPassword,
  USERS_KEY,
  verifyPassword,
} from '../_shared/auth.js';
import { readJson, writeJson } from '../_shared/store.js';
import { authenticated, getRequest, handleError, HttpError, publicUser, validateNewPassword } from './_helpers.js';
import { CAPABILITIES } from '../_shared/permissions.js';

export async function onRequestPost(context = {}) {
  try {
    const { store, env, user } = await authenticated(
      context,
      CAPABILITIES.passwordSelf,
      { allowPasswordChange: true },
    );
    const body = await parseJson(getRequest(context));
    validateNewPassword(body.new_password);
    const users = await readJson(store, USERS_KEY, []);
    const record = users.find((item) => item.id === user.id);
    if (!record || !(await verifyPassword(body.current_password, record.passwordHash))) {
      throw new HttpError(400, '当前密码错误', 'invalid_current_password');
    }
    record.passwordHash = await hashPassword(body.new_password);
    record.forcePasswordChange = false;
    record.updatedAt = new Date().toISOString();
    await writeJson(store, USERS_KEY, users);
    await appendAudit(store, { action: 'password.change', user_id: record.id, username: record.username });
    const token = await createSessionCookie({
      userId: record.id,
      role: record.role,
      passwordChangeOnly: false,
    }, env.AUTH_SECRET);
    const headers = new Headers();
    setSessionCookie(headers, token);
    return json({ code: 1, data: { user: publicUser(record) } }, 200, Object.fromEntries(headers.entries()));
  } catch (error) {
    return handleError(error);
  }
}
