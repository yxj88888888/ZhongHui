import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemoryStore } from '../cloud-functions/api/_shared/store.js';
import { createSessionCookie, ensureBootstrapAdmin, hashPassword, USERS_KEY } from '../cloud-functions/api/_shared/auth.js';
import { onRequestPost as login } from '../cloud-functions/api/admin/login.js';
import { onRequestPost as changeCredentials } from '../cloud-functions/api/admin/password.js';
import { onRequestGet as readPrices } from '../cloud-functions/api/admin/prices.js';
import { onRequestGet as me } from '../cloud-functions/api/admin/me.js';

const env = { AUTH_SECRET: 'initial-credentials-test-secret', INITIAL_ADMIN_PASSWORD: '123456' };
const request = (path, body, cookie) => new Request('https://example.test/api/admin/' + path, {
  method: body ? 'POST' : 'GET',
  headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});
const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';')[0];
async function initialLogin(store) {
  return login({ request: request('login', { username: 'admin', password: '123456' }), store, env });
}

test('default admin login requires changing both initial credentials, including after reload', async () => {
  const store = createMemoryStore();
  const response = await initialLogin(store);
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.equal(data.user.username, 'admin');
  assert.equal(data.forcePasswordChange, true);
  assert.equal(data.user.forceUsernameChange, true);
  const cookie = cookieFrom(response);
  assert.equal((await readPrices({ request: request('prices', null, cookie), store, env })).status, 403);
  const reload = await me({ request: request('me', null, cookie), store, env });
  assert.equal((await reload.json()).data.user.forceUsernameChange, true);
});

test('password-only changes and invalid or unchanged initial usernames cannot unlock the admin', async () => {
  const store = createMemoryStore();
  const response = await initialLogin(store);
  assert.equal(response.status, 200);
  const cookie = cookieFrom(response);
  const original = store.snapshot()[USERS_KEY][0];
  for (const new_username of [undefined, 'admin', '<bad>', 'ab']) {
    const changed = await changeCredentials({
      request: request('password', { current_password: '123456', new_password: 'Owner12345', new_username }, cookie), store, env,
    });
    assert.equal(changed.status, 400, 'must reject username: ' + new_username);
    assert.deepEqual(store.snapshot()[USERS_KEY][0], original);
  }
});

test('a duplicate username is rejected without changing the password', async () => {
  const store = createMemoryStore();
  const response = await initialLogin(store);
  assert.equal(response.status, 200);
  const original = store.snapshot()[USERS_KEY][0];
  await store.setJSON(USERS_KEY, [original, { id: 'staff', username: 'owner01', role: 'clerk', active: true }]);
  const changed = await changeCredentials({
    request: request('password', { current_password: '123456', new_password: 'Owner12345', new_username: 'owner01' }, cookieFrom(response)), store, env,
  });
  assert.equal(changed.status, 409);
  assert.deepEqual(store.snapshot()[USERS_KEY][0], original);
});

test('changing both credentials preserves admin identity and disables the initial login', async () => {
  const store = createMemoryStore();
  const response = await initialLogin(store);
  assert.equal(response.status, 200);
  const changed = await changeCredentials({
    request: request('password', { current_password: '123456', new_password: 'Owner12345', new_username: 'owner01' }, cookieFrom(response)), store, env,
  });
  assert.equal(changed.status, 200);
  const user = (await changed.json()).data.user;
  assert.equal(user.id, 'admin');
  assert.equal(user.role, 'admin');
  assert.equal(user.username, 'owner01');
  assert.equal(user.forcePasswordChange, false);
  assert.equal(user.forceUsernameChange, false);
  assert.equal((await readPrices({ request: request('prices', null, cookieFrom(changed)), store, env })).status, 200);
  assert.equal((await initialLogin(store)).status, 401);
  assert.equal((await login({ request: request('login', { username: 'owner01', password: 'Owner12345' }), store, env })).status, 200);
});

test('only an unchanged legacy bootstrap account is migrated to admin', async () => {
  const passwordHash = await hashPassword('123456');
  const original = { id: 'admin', username: 'XBZJ001', role: 'admin', active: true, forcePasswordChange: true, passwordHash };
  const store = createMemoryStore({ [USERS_KEY]: [original] });
  const migrated = await ensureBootstrapAdmin(store, { username: 'admin', password: '123456' });
  assert.equal(migrated.username, 'admin');
  assert.equal(migrated.forceUsernameChange, true);
  assert.equal(migrated.passwordHash, passwordHash);
  assert.equal(store.snapshot()[USERS_KEY][0].username, 'admin');
});

test('bootstrap migration preserves an already configured account and password', async () => {
  const passwordHash = await hashPassword('Owner12345');
  for (const username of ['XBZJ001', 'owner01']) {
    const original = { id: 'admin', username, role: 'admin', active: true, forcePasswordChange: false, passwordHash };
    const store = createMemoryStore({ [USERS_KEY]: [original] });
    await ensureBootstrapAdmin(store, { username: 'admin', password: '123456' });
    assert.deepEqual(store.snapshot()[USERS_KEY][0], original);
  }
});

test('an existing initial-login session also requires changing the username after deployment', async () => {
  const store = createMemoryStore({ [USERS_KEY]: [{
    id: 'admin', username: 'XBZJ001', role: 'admin', active: true,
    forcePasswordChange: true, passwordHash: await hashPassword('123456'),
  }] });
  const token = await createSessionCookie({ userId: 'admin', role: 'admin', passwordChangeOnly: true }, env.AUTH_SECRET);
  const cookie = 'zhonghui_session=' + token;
  const session = await me({ request: request('me', null, cookie), store, env });
  assert.equal((await session.json()).data.user.forceUsernameChange, true);
  const changed = await changeCredentials({
    request: request('password', { current_password: '123456', new_password: 'Owner12345' }, cookie), store, env,
  });
  assert.equal(changed.status, 400);
  assert.equal(store.snapshot()[USERS_KEY][0].forcePasswordChange, true);
});
