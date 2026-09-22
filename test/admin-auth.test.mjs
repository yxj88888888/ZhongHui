import assert from 'node:assert/strict';

import {
  hashPassword,
  verifyPassword,
  createSessionCookie,
  readSessionCookie,
  ensureBootstrapAdmin,
} from '../cloud-functions/api/_shared/auth.js';
import { createMemoryStore } from '../cloud-functions/api/_shared/store.js';
import { can } from '../cloud-functions/api/_shared/permissions.js';

const store = createMemoryStore();
const hash = await hashPassword('change-me');
assert.equal(await verifyPassword('change-me', hash), true);
assert.equal(await verifyPassword('wrong', hash), false);

const cookie = await createSessionCookie(
  { userId: 'u1', role: 'manager' },
  'test-secret',
  3600,
  1700000000000,
);
assert.deepEqual(
  await readSessionCookie(cookie, 'test-secret', 1700000000000),
  { userId: 'u1', role: 'manager' },
);

assert.equal(can('manager', 'prices:write'), true);
assert.equal(can('manager', 'users:write'), false);
assert.equal(can('clerk', 'password:self'), true);

const admin = await ensureBootstrapAdmin(store, {
  username: 'XBZJ001',
  password: '123456',
});
assert.equal(admin.username, 'XBZJ001');
assert.equal(admin.forcePasswordChange, true);

console.log('Admin auth red-green contract passed');
