import { json } from '../_shared/http.js';
import {
  getSessionUser,
  requireCapability,
} from '../_shared/auth.js';
import { getControlStore } from '../_shared/store.js';

export class HttpError extends Error {
  constructor(status, message, code = 'request_failed') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getRequest(context = {}) {
  return context.request || new Request('https://example.test/api/admin');
}

export function getStore(context = {}) {
  return context.store || getControlStore();
}

export function getEnv(context = {}) {
  if (context.env) return context.env;
  if (typeof process !== 'undefined' && process.env) return process.env;
  return {};
}

export async function authenticated(context, capability, options = {}) {
  const store = getStore(context);
  const env = getEnv(context);
  if (!env.AUTH_SECRET) throw new HttpError(503, '后台安全配置未完成', 'auth_not_configured');
  const user = await getSessionUser(getRequest(context), store, env.AUTH_SECRET);
  if (!user) throw new HttpError(401, '登录状态已失效', 'unauthorized');
  if (user.passwordChangeOnly && !options.allowPasswordChange) {
    throw new HttpError(403, '请先修改初始密码', 'password_change_required');
  }
  requireCapability(user, capability);
  return { store, env, user };
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    active: user.active !== false,
    forcePasswordChange: user.forcePasswordChange === true,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt || null,
  };
}

export function validateNewPassword(value) {
  if (typeof value !== 'string' || value.length < 8 || !/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    throw new HttpError(400, '密码至少 8 位且必须包含字母和数字', 'invalid_password');
  }
}

export function handleError(error) {
  if (error instanceof HttpError) {
    return json({ code: 0, msg: error.message, error: error.code }, error.status);
  }
  if (error?.message === 'unauthorized') return json({ code: 0, msg: '请先登录' }, 401);
  if (error?.message === 'forbidden') return json({ code: 0, msg: '没有执行该操作的权限' }, 403);
  console.error('Admin function failed:', error);
  return json({ code: 0, msg: '后台服务暂时不可用' }, 503);
}

export function resolveUserId(context = {}) {
  if (context.params?.id) return context.params.id;
  const url = new URL(getRequest(context).url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts.at(-1);
}
