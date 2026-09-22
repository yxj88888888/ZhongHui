import { json } from '../_shared/http.js';
import { AUDIT_KEY, appendAudit } from '../_shared/auth.js';
import { readJson } from '../_shared/store.js';
import { CAPABILITIES } from '../_shared/permissions.js';
import { authenticated, handleError } from './_helpers.js';

export async function onRequestGet(context = {}) {
  try {
    const { store, user } = await authenticated(context, CAPABILITIES.auditRead);
    const audit = await readJson(store, AUDIT_KEY, []);
    const data = user.role === 'manager'
      ? audit.filter((entry) => entry.action === 'price.update')
      : audit;
    return json({ code: 1, data });
  } catch (error) {
    return handleError(error);
  }
}
