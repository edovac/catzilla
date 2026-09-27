import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { donations } from '../src/db/schema.js';
import { ADMIN_ID, setup } from './helpers.js';

const donation = { date: '2026-09-01', amountCents: 5000, donor: 'Maria', paymentMethod: 'cash' };

describe('history', () => {
  it('records create, update, delete and restore of a donation, with authors', async () => {
    const { loginAs } = setup();
    const admin = await loginAs(ADMIN_ID);
    const { body: user } = await admin.post('/users', { email: 'anna@test.it', name: 'Anna' });
    const anna = await loginAs(user.id);

    const { body: d } = await admin.post('/donations', donation);
    await anna.put(`/donations/${d.id}`, { ...donation, amountCents: 7500 });
    await admin.del(`/donations/${d.id}`);
    await anna.post(`/donations/${d.id}/restore`);

    const { status, body: events } = await admin.get(`/history/donation/${d.id}`);
    expect(status).toBe(200);
    expect(events.map((e: any) => [e.action, e.user?.name])).toEqual([
      ['create', 'Amministratore'],
      ['update', 'Anna'],
      ['delete', 'Amministratore'],
      ['restore', 'Anna'],
    ]);
    expect(events[0].changes).toEqual([
      { field: 'date', old: null, new: '2026-09-01' },
      { field: 'amountCents', old: null, new: 5000 },
      { field: 'donor', old: null, new: 'Maria' },
      { field: 'paymentMethod', old: null, new: 'cash' },
    ]);
    expect(events[1].changes).toEqual([{ field: 'amountCents', old: 5000, new: 7500 }]);
    expect(events[2].changes).toEqual([]);
  });

  it('records nothing when a save changes no value', async () => {
    const api = await setup().loginAs(ADMIN_ID);
    const { body: d } = await api.post('/donations', donation);
    await api.put(`/donations/${d.id}`, donation);
    expect((await api.get(`/history/donation/${d.id}`)).body).toHaveLength(1);
  });

  it('shows category and cat names on expense changes', async () => {
    const api = await setup().loginAs(ADMIN_ID);
    const { body: cat } = await api.post('/cats', { name: 'Luna' });
    const expense = { date: '2026-09-02', amountCents: 100, categoryId: 1, description: 'Visita' };
    const { body: e } = await api.post('/expenses', expense);
    await api.put(`/expenses/${e.id}`, { ...expense, categoryId: 3, catId: cat.id });

    const events = (await api.get(`/history/expense/${e.id}`)).body;
    expect(events[0].changes).toContainEqual({ field: 'category', old: null, new: 'Cure veterinarie' });
    expect(events[1].changes).toEqual([
      { field: 'category', old: 'Cure veterinarie', new: 'Cibo e beni' },
      { field: 'cat', old: null, new: 'Luna' },
    ]);
  });

  it('records rename, archive and restore of categories and cats', async () => {
    const api = await setup().loginAs(ADMIN_ID);
    await api.patch('/categories/2', { name: 'Utenze' });
    await api.post('/categories/2/archive');
    await api.post('/categories/2/restore');
    const events = (await api.get('/history/category/2')).body;
    // The seeded category has no author.
    expect(events.map((e: any) => [e.action, e.user?.id ?? null])).toEqual([
      ['create', null],
      ['update', ADMIN_ID],
      ['archive', ADMIN_ID],
      ['restore', ADMIN_ID],
    ]);
    expect(events[1].changes).toEqual([{ field: 'name', old: 'Bollette', new: 'Utenze' }]);

    const { body: cat } = await api.post('/cats', { name: 'Otello', notes: 'nero' });
    await api.post(`/cats/${cat.id}/archive`);
    const catEvents = (await api.get(`/history/cat/${cat.id}`)).body;
    expect(catEvents.map((e: any) => e.action)).toEqual(['create', 'archive']);
  });

  it('rejects updates that do not set updated_at', async () => {
    const { db, loginAs } = setup();
    const api = await loginAs(ADMIN_ID);
    const { body: d } = await api.post('/donations', donation);
    expect(() =>
      db.update(donations).set({ amountCents: 1 }).where(eq(donations.id, d.id)).run(),
    ).toThrow(/updated_at/);
  });

  it('validates the entity', async () => {
    const api = await setup().loginAs(ADMIN_ID);
    expect((await api.get('/history/donation/999')).status).toBe(404);
    expect((await api.get('/history/user/1')).status).toBe(400);
  });
});
