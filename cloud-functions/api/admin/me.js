import { json } from '../_shared/http.js';
import { CAPABILITIES, capabilitiesFor } from '../_shared/permissions.js';
import { authenticated, handleError } from './_helpers.js';

export async function onRequestGet(context = {}) {
  try {
    const { user } = await authenticated(context, CAPABILITIES.pricesRead, { allowPasswordChange: true });
    return json({
      code: 1,
      data: { user, capabilities: capabilitiesFor(user.role) },
    });
  } catch (error) {
    return handleError(error);
  }
}
