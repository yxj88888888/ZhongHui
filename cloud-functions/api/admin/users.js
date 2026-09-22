import { parseJson, json } from '../_shared/http.js';
import { appendAudit, hashPassword, USERS_KEY } from '../_shared/auth.js';
import { readJson, writeJson } from '../_shared/store.js';
import { CAPABILITIES, ROLES } from '../_shared/permissions.js';
import { getRequest, authenticated, handleError, HttpError, publicUser, validateNewPassword } from './_helpers.js';

function newId() {
  return 'user-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export async function onRequestGet(context = {}) {
  try {
    const { store } = await authenticated(context, CAPABILITIES.usersWrite);
    const users = await readJson(store, USERS_KEY, []);
    return json({ code: 1, data: users.map(publicUser) });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPost(context = {}) {
  try {
    const { store, user } = await authenticated(context, CAPABILITIES.usersWrite);
    const body = await parseJson(getRequest(context));
    const username = String(body.username || '').trim();
    const role = body.role;
    validateNewPassword(body.temporary_password);
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(username)) {
      throw new HttpError(400, '账号需为 3-32 位字母、数字、下划线或短横线', 'invalid_username');
    }
    if (!ROLES.includes(role) || role === 'admin' && user.role !== 'admin') {
      throw new HttpError(400, '账号身份无效', 'invalid_role');
    }
    const users = await readJson(store, USERS_KEY, []);
    if (users.some((item) => item.username === username)) {
      throw new HttpError(409, '账号已存在', 'duplicate_username');
    }
    const now = new Date().toISOString();
    const created = {
      id: newId(),
      username,
      role,
      passwordHash: await hashPassword(body.temporary_password),
      forcePasswordChange: true,
      active: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };
    users.push(created);
    await writeJson(store, USERS_KEY, users);
    await appendAudit(store, {
      action: 'user.create',
      user_id: user.id,
      username: user.username,
      target_id: created.id,
      target_username: created.username,
      target_role: created.role,
    });
    return json({ code: 1, data: publicUser(created) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
