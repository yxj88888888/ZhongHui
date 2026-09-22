import { parseJson, json } from '../../_shared/http.js';
import { appendAudit, hashPassword, USERS_KEY } from '../../_shared/auth.js';
import { readJson, writeJson } from '../../_shared/store.js';
import { CAPABILITIES, ROLES } from '../../_shared/permissions.js';
import { authenticated, getRequest, handleError, HttpError, publicUser, resolveUserId, validateNewPassword } from '../_helpers.js';

async function loadTarget(context) {
  const { store, user } = await authenticated(context, CAPABILITIES.usersWrite);
  const users = await readJson(store, USERS_KEY, []);
  const targetId = resolveUserId(context);
  const index = users.findIndex((item) => item.id === targetId);
  if (index < 0) throw new HttpError(404, '账号不存在', 'user_not_found');
  return { store, user, users, target: users[index], index };
}

export async function onRequestPatch(context = {}) {
  try {
    const { store, user, users, target } = await loadTarget(context);
    const body = await parseJson(getRequest(context));
    if (body.role && !ROLES.includes(body.role)) throw new HttpError(400, '账号身份无效', 'invalid_role');
    if (target.id === user.id && body.role && body.role !== 'admin') {
      throw new HttpError(400, '管理员不能降低自己的身份', 'self_role_change_denied');
    }
    if (target.role === 'admin' && body.role !== 'admin' &&
        users.filter((item) => item.role === 'admin' && item.active !== false).length <= 1) {
      throw new HttpError(400, '不能移除最后一个管理员', 'last_admin_required');
    }
    if (body.role) target.role = body.role;
    if (typeof body.active === 'boolean') target.active = body.active;
    target.updatedAt = new Date().toISOString();
    await writeJson(store, USERS_KEY, users);
    await appendAudit(store, {
      action: 'user.update',
      user_id: user.id,
      username: user.username,
      target_id: target.id,
      changes: { role: body.role, active: body.active },
    });
    return json({ code: 1, data: publicUser(target) });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestDelete(context = {}) {
  try {
    const { store, user, users, target, index } = await loadTarget(context);
    if (target.role === 'admin' &&
        users.filter((item) => item.role === 'admin' && item.active !== false).length <= 1) {
      throw new HttpError(400, '不能删除最后一个管理员', 'last_admin_required');
    }
    if (target.id === user.id) throw new HttpError(400, '不能删除当前登录账号', 'self_delete_denied');
    users.splice(index, 1);
    await writeJson(store, USERS_KEY, users);
    await appendAudit(store, {
      action: 'user.delete',
      user_id: user.id,
      username: user.username,
      target_id: target.id,
      target_username: target.username,
    });
    return json({ code: 1, data: null });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPost(context = {}) {
  try {
    const { store, user, users, target } = await loadTarget(context);
    const body = await parseJson(getRequest(context));
    validateNewPassword(body.temporary_password);
    target.passwordHash = await hashPassword(body.temporary_password);
    target.forcePasswordChange = true;
    target.updatedAt = new Date().toISOString();
    await writeJson(store, USERS_KEY, users);
    await appendAudit(store, {
      action: 'user.reset_password',
      user_id: user.id,
      username: user.username,
      target_id: target.id,
      target_username: target.username,
    });
    return json({ code: 1, data: publicUser(target) });
  } catch (error) {
    return handleError(error);
  }
}
