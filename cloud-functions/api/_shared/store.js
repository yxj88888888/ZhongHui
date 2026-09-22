import { getStore } from '@edgeone/pages-blob';

const STORE_NAME = 'zhonghui-gold-control';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createMemoryStore(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, clone(value)]));
  return {
    async get(key, options = {}) {
      const value = values.get(key);
      if (value == null) return null;
      if (options.type === 'json') return clone(value);
      return typeof value === 'string' ? value : JSON.stringify(value);
    },
    async setJSON(key, value) {
      values.set(key, clone(value));
    },
    async set(key, value) {
      values.set(key, typeof value === 'string' ? value : clone(value));
    },
    snapshot() {
      return Object.fromEntries([...values.entries()].map(([key, value]) => [key, clone(value)]));
    },
  };
}

export function getControlStore() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

export async function readJson(store, key, fallback) {
  const value = await store.get(key, { type: 'json', consistency: 'strong' });
  return value == null ? clone(fallback) : value;
}

export async function writeJson(store, key, value) {
  await store.setJSON(key, value);
  return value;
}
