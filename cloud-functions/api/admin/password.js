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
    const previousUsername = record.username;
    if (record.forceUsernameChange || user.forceUsernameChange) {
      const username = String(body.new_username || '').trim();
      if (!/^[A-Za-z0-9_-]{3,32}$/.test(username)) {
        throw new HttpError(400, '新账号需为 3-32 位字母、数字、下划线或短横线', 'invalid_username');
      }
      if (username === record.username || username === 'admin') {
        throw new HttpError(400, '新账号不能与初始账号相同', 'unchanged_username');
      }
      if (users.some((item) => item.id !== record.id && item.username === username)) {
        throw new HttpError(409, '账号已存在', 'duplicate_username');
      }
      record.username = username;
    }
    record.passwordHash = await hashPassword(body.new_password);
    record.forcePasswordChange = false;
    record.forceUsernameChange = false;
    record.updatedAt = new Date().toISOString();
    await writeJson(store, USERS_KEY, users);
    await appendAudit(store, {
      action: previousUsername === record.username ? 'password.change' : 'credentials.change',
      user_id: record.id, username: record.username, previous_username: previousUsername,
    });
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
