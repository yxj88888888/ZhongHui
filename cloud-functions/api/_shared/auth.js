import { readJson, writeJson } from './store.js';
import { can } from './permissions.js';

const USERS_KEY = 'auth/users.json';
const AUDIT_KEY = 'auth/audit.json';
const ITERATIONS = 120000;
const SESSION_SECONDS = 8 * 60 * 60;

function webCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable');
  }
  return globalThis.crypto;
}

function encodeBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left[index] ^ right[index];
  return result === 0;
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('password is required');
  }
  const crypto = webCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', textBytes(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return 'pbkdf2$' + ITERATIONS + '$' + encodeBase64Url(salt) + '$' + encodeBase64Url(new Uint8Array(bits));
}

export async function verifyPassword(password, encoded) {
  try {
    const [algorithm, iterationText, saltText, digestText] = String(encoded).split('$');
    if (algorithm !== 'pbkdf2') return false;
    const iterations = Number(iterationText);
    const salt = decodeBase64Url(saltText);
    const expected = decodeBase64Url(digestText);
    const crypto = webCrypto();
    const key = await crypto.subtle.importKey('raw', textBytes(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      expected.length * 8,
    );
    return equalBytes(new Uint8Array(bits), expected);
  } catch {
    return false;
  }
}

async function sign(value, secret) {
  const key = await webCrypto().subtle.importKey(
    'raw',
    textBytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return encodeBase64Url(new Uint8Array(await webCrypto().subtle.sign('HMAC', key, textBytes(value))));
}

export async function createSessionCookie(claims, secret, maxAge = SESSION_SECONDS, now = Date.now()) {
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  const payloadObject = { ...claims, exp: Math.floor(now / 1000) + maxAge };
  const payload = encodeBase64Url(textBytes(JSON.stringify(payloadObject)));
  return payload + '.' + await sign(payload, secret);
}

async function readClaims(cookie, secret, now = Date.now()) {
  if (!cookie || !secret) return null;
  const [payload, signature] = cookie.split('.');
  if (!payload || !signature) return null;
  const expectedSignature = await sign(payload, secret);
  if (!equalBytes(textBytes(expectedSignature), textBytes(signature))) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
    if (!claims.exp || claims.exp <= Math.floor(now / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function readSessionCookie(cookie, secret, now = Date.now()) {
  const claims = await readClaims(cookie, secret, now);
  if (!claims) return null;
  const { exp, ...publicClaims } = claims;
  return publicClaims;
}

export async function ensureBootstrapAdmin(store, { username, password }) {
  const users = await readJson(store, USERS_KEY, []);
  if (users.length > 0) return users.find((user) => user.role === 'admin') || users[0];
  if (!username || !password) throw new Error('initial administrator credentials are not configured');
  const now = new Date().toISOString();
  const admin = {
    id: 'admin',
    username,
    role: 'admin',
    passwordHash: await hashPassword(password),
    forcePasswordChange: true,
    active: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
  await writeJson(store, USERS_KEY, [admin]);
  return admin;
}

export async function getSessionUser(request, store, secret, now = Date.now()) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookie = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith('zhonghui_session='));
  const token = cookie?.slice('zhonghui_session='.length);
  const claims = await readClaims(token, secret, now);
  if (!claims) return null;
  const users = await readJson(store, USERS_KEY, []);
  const user = users.find((item) => item.id === claims.userId && item.active !== false);
  if (!user || user.role !== claims.role) return null;
  return { ...user, passwordHash: undefined, passwordChangeOnly: claims.passwordChangeOnly === true };
}

export function requireCapability(user, capability) {
  if (!user) throw new Error('unauthorized');
  if (!can(user.role, capability)) throw new Error('forbidden');
  return user;
}

export async function appendAudit(store, entry) {
  const audit = await readJson(store, AUDIT_KEY, []);
  audit.push({ ...entry, timestamp: entry.timestamp || new Date().toISOString() });
  await writeJson(store, AUDIT_KEY, audit.slice(-1000));
}

export { AUDIT_KEY, USERS_KEY, SESSION_SECONDS };
