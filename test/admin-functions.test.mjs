import assert from 'node:assert/strict';

import { can } from '../cloud-functions/api/_shared/permissions.js';
import { createMemoryStore } from '../cloud-functions/api/_shared/store.js';

const login = await import('../cloud-functions/api/admin/login.js');
const logout = await import('../cloud-functions/api/admin/logout.js');
const me = await import('../cloud-functions/api/admin/me.js');
const password = await import('../cloud-functions/api/admin/password.js');
const prices = await import('../cloud-functions/api/admin/prices.js');
const users = await import('../cloud-functions/api/admin/users.js');
const userById = await import('../cloud-functions/api/admin/users/[id].js');
const audit = await import('../cloud-functions/api/admin/audit.js');

assert.equal(typeof login.onRequestPost, 'function');
assert.equal(typeof logout.onRequestPost, 'function');
assert.equal(typeof me.onRequestGet, 'function');
assert.equal(typeof password.onRequestPost, 'function');
assert.equal(typeof prices.onRequestGet, 'function');
assert.equal(typeof prices.onRequestPost, 'function');
assert.equal(typeof users.onRequestGet, 'function');
assert.equal(typeof users.onRequestPost, 'function');
assert.equal(typeof userById.onRequestPatch, 'function');
assert.equal(typeof userById.onRequestDelete, 'function');
assert.equal(typeof userById.onRequestPost, 'function');
assert.equal(typeof audit.onRequestGet, 'function');

assert.equal(can('manager', 'prices:write'), true);
assert.equal(can('manager', 'users:write'), false);
assert.equal(can('clerk', 'prices:write'), false);
assert.equal(can('clerk', 'password:self'), true);

const env = {
  AUTH_SECRET: 'integration-secret',
  INITIAL_ADMIN_USERNAME: 'XBZJ001',
  INITIAL_ADMIN_PASSWORD: '123456',
};
const store = createMemoryStore();
const request = (url, method, body, cookie) => new Request(url, {
  method,
  headers: {
    'content-type': 'application/json',
    ...(cookie ? { cookie } : {}),
  },
  body: body == null ? undefined : JSON.stringify(body),
});
const cookieFrom = (response) => {
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  return setCookie.split(';')[0];
};

const firstLogin = await login.onRequestPost({
  request: request('https://example.test/api/admin/login', 'POST', {
    username: 'XBZJ001',
    password: '123456',
  }),
  store,
  env,
});
assert.equal(firstLogin.status, 200);
assert.equal((await firstLogin.json()).data.forcePasswordChange, true);
const adminCookie = cookieFrom(firstLogin);

const changedPassword = await password.onRequestPost({
  request: request('https://example.test/api/admin/password', 'POST', {
    current_password: '123456',
    new_password: 'Admin1234',
  }, adminCookie),
  store,
  env,
});
assert.equal(changedPassword.status, 200);
const activeAdminCookie = cookieFrom(changedPassword);

const managerCreated = await users.onRequestPost({
  request: request('https://example.test/api/admin/users', 'POST', {
    username: 'manager01',
    role: 'manager',
    temporary_password: 'Manager123',
  }, activeAdminCookie),
  store,
  env,
});
assert.equal(managerCreated.status, 201);

const clerkCreated = await users.onRequestPost({
  request: request('https://example.test/api/admin/users', 'POST', {
    username: 'clerk01',
    role: 'clerk',
    temporary_password: 'Clerk1234',
  }, activeAdminCookie),
  store,
  env,
});
assert.equal(clerkCreated.status, 201);

const managerLogin = await login.onRequestPost({
  request: request('https://example.test/api/admin/login', 'POST', {
    username: 'manager01',
    password: 'Manager123',
  }),
  store,
  env,
});
let managerCookie = cookieFrom(managerLogin);
const managerPasswordChange = await password.onRequestPost({
  request: request('https://example.test/api/admin/password', 'POST', {
    current_password: 'Manager123',
    new_password: 'Manager1234',
  }, managerCookie),
  store,
  env,
});
assert.equal(managerPasswordChange.status, 200);
managerCookie = cookieFrom(managerPasswordChange);
const managerPriceRead = await prices.onRequestGet({ request: request('https://example.test/api/admin/prices', 'GET', null, managerCookie), store, env });
assert.equal(managerPriceRead.status, 200);
const currentPrices = (await managerPriceRead.json()).data.prices;
const managerPriceWrite = await prices.onRequestPost({
  request: request('https://example.test/api/admin/prices', 'POST', {
    prices: currentPrices.map((row) => row.id === 'silver' ? { ...row, sell_price: '20.10' } : row),
  }, managerCookie),
  store,
  env,
});
assert.equal(managerPriceWrite.status, 200);
const managerUsers = await users.onRequestGet({
  request: request('https://example.test/api/admin/users', 'GET', null, managerCookie),
  store,
  env,
});
assert.equal(managerUsers.status, 403);

const clerkLogin = await login.onRequestPost({
  request: request('https://example.test/api/admin/login', 'POST', {
    username: 'clerk01',
    password: 'Clerk1234',
  }),
  store,
  env,
});
let clerkCookie = cookieFrom(clerkLogin);
const clerkPasswordChange = await password.onRequestPost({
  request: request('https://example.test/api/admin/password', 'POST', {
    current_password: 'Clerk1234',
    new_password: 'Clerk5678',
  }, clerkCookie),
  store,
  env,
});
assert.equal(clerkPasswordChange.status, 200);
clerkCookie = cookieFrom(clerkPasswordChange);
const clerkPriceWrite = await prices.onRequestPost({
  request: request('https://example.test/api/admin/prices', 'POST', { prices: currentPrices }, clerkCookie),
  store,
  env,
});
assert.equal(clerkPriceWrite.status, 403);

console.log('Admin function red-green contract passed');
