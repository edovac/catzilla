import { describe, expect, it } from 'vitest';
import { ADMIN_ID, setup } from './helpers.js';

describe('auth', () => {
  it('rejects requests without a session', async () => {
    const { app } = setup();
    expect((await app.request('/api/me')).status).toBe(401);
  });

  it('rejects a tampered session cookie', async () => {
    const { app } = setup();
    const res = await app.request('/api/me', { headers: { cookie: 'catzilla_session=1.fake' } });
    expect(res.status).toBe(401);
  });

  it('logs in the seeded admin', async () => {
    const { loginAs } = setup();
    const me = await (await loginAs(ADMIN_ID)).get('/me');
    expect(me.body).toMatchObject({ email: 'admin@test.it', isAdmin: true });
  });

  it('locks out a user as soon as they are disabled', async () => {
    const { loginAs } = setup();
    const admin = await loginAs(ADMIN_ID);
    const { body: user } = await admin.post('/users', { email: 'anna@test.it', name: 'Anna' });
    const anna = await loginAs(user.id);
    expect((await anna.get('/me')).status).toBe(200);

    await admin.patch(`/users/${user.id}`, { enabled: false });
    expect((await anna.get('/me')).status).toBe(401);
    await expect(loginAs(user.id)).rejects.toThrow();
  });
});

describe('user management', () => {
  it('is reserved to administrators', async () => {
    const { loginAs } = setup();
    const admin = await loginAs(ADMIN_ID);
    const { body: user } = await admin.post('/users', { email: 'bruno@test.it', name: 'Bruno' });
    const bruno = await loginAs(user.id);
    expect((await bruno.get('/users')).status).toBe(403);
  });

  it('keeps at least one enabled administrator', async () => {
    const { loginAs } = setup();
    const admin = await loginAs(ADMIN_ID);
    expect((await admin.patch(`/users/${ADMIN_ID}`, { isAdmin: false })).status).toBe(409);
    expect((await admin.patch(`/users/${ADMIN_ID}`, { enabled: false })).status).toBe(409);

    const { body: other } = await admin.post('/users', { email: 'c@test.it', name: 'C', isAdmin: true });
    expect((await admin.patch(`/users/${ADMIN_ID}`, { isAdmin: false })).status).toBe(200);
    expect((await admin.get('/users')).status).toBe(403); // no longer admin
    const c = await loginAs(other.id);
    expect((await c.patch(`/users/${other.id}`, { enabled: false })).status).toBe(409);
  });

  it('rejects duplicate emails', async () => {
    const { loginAs } = setup();
    const admin = await loginAs(ADMIN_ID);
    const res = await admin.post('/users', { email: 'ADMIN@test.it', name: 'Dup' });
    expect(res.status).toBe(409);
  });
});
