import { createApp } from '../src/app.js';
import { openDb } from '../src/db/client.js';

export function setup() {
  const db = openDb({ file: ':memory:', adminEmail: 'admin@test.it' });
  const app = createApp(db, { secret: 'test-secret', secureCookie: false, devLogin: true });

  const loginAs = async (userId: number) => {
    const res = await app.request('/api/auth/dev-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
    const cookie = res.headers.get('set-cookie')!.split(';')[0];

    const call = async (method: string, path: string, body?: unknown) => {
      const res = await app.request(`/api${path}`, {
        method,
        headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, body: (await res.json()) as any };
    };
    return {
      get: (path: string) => call('GET', path),
      post: (path: string, body?: unknown) => call('POST', path, body),
      put: (path: string, body?: unknown) => call('PUT', path, body),
      patch: (path: string, body?: unknown) => call('PATCH', path, body),
      del: (path: string) => call('DELETE', path),
    };
  };

  return { app, db, loginAs };
}

// The seeded admin is always user 1.
export const ADMIN_ID = 1;
