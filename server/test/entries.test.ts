import { describe, expect, it } from 'vitest';
import { ADMIN_ID, setup } from './helpers.js';

const donation = { date: '2026-09-01', amountCents: 5000, paymentMethod: 'cash' };

describe('donations', () => {
  it('validates input', async () => {
    const api = await setup().loginAs(ADMIN_ID);
    expect((await api.post('/donations', { ...donation, amountCents: 0 })).status).toBe(400);
    expect((await api.post('/donations', { ...donation, date: '2026-02-30' })).status).toBe(400);
    expect((await api.post('/donations', { ...donation, paymentMethod: 'gold' })).status).toBe(400);
  });

  it('stores an empty donor as anonymous and tracks the author', async () => {
    const api = await setup().loginAs(ADMIN_ID);
    const { status, body } = await api.post('/donations', { ...donation, donor: '  ' });
    expect(status).toBe(201);
    expect(body).toMatchObject({ donor: null, createdBy: ADMIN_ID, updatedBy: ADMIN_ID });
  });

  it('soft-deletes and restores', async () => {
    const api = await setup().loginAs(ADMIN_ID);
    const { body: d } = await api.post('/donations', donation);
    await api.del(`/donations/${d.id}`);
    expect((await api.get('/donations')).body).toHaveLength(0);
    expect((await api.get('/donations?includeDeleted=true')).body).toHaveLength(1);
    expect((await api.put(`/donations/${d.id}`, donation)).status).toBe(409);
    await api.post(`/donations/${d.id}/restore`);
    expect((await api.get('/donations')).body).toHaveLength(1);
  });
});

describe('expenses', () => {
  it('refuses archived categories and cats for new expenses but keeps them on existing ones', async () => {
    const api = await setup().loginAs(ADMIN_ID);
    const { body: cat } = await api.post('/cats', { name: 'Micio' });
    const expense = {
      date: '2026-09-02',
      amountCents: 1234,
      categoryId: 1,
      catId: cat.id,
      description: 'Visita',
    };
    const { status, body: e } = await api.post('/expenses', expense);
    expect(status).toBe(201);
    expect(e).toMatchObject({ categoryName: 'Cure veterinarie', catName: 'Micio' });

    await api.post('/categories/1/archive');
    await api.post(`/cats/${cat.id}/archive`);
    expect((await api.post('/expenses', expense)).status).toBe(409);
    expect((await api.post('/expenses', { ...expense, categoryId: 2, catId: null })).status).toBe(201);

    const edit = await api.put(`/expenses/${e.id}`, { ...expense, amountCents: 999 });
    expect(edit.status).toBe(200);
    expect(edit.body.amountCents).toBe(999);
  });

  it('filters by cat and period', async () => {
    const api = await setup().loginAs(ADMIN_ID);
    const { body: cat } = await api.post('/cats', { name: 'Fuffi' });
    const base = { amountCents: 100, categoryId: 1, description: 'x' };
    await api.post('/expenses', { ...base, date: '2026-01-15', catId: cat.id });
    await api.post('/expenses', { ...base, date: '2026-02-15', catId: cat.id });
    await api.post('/expenses', { ...base, date: '2026-02-20' });
    expect((await api.get(`/expenses?catId=${cat.id}`)).body).toHaveLength(2);
    expect((await api.get('/expenses?from=2026-02-01&to=2026-02-28')).body).toHaveLength(2);
  });
});

describe('categories', () => {
  it('seeds the initial categories and rejects duplicates', async () => {
    const api = await setup().loginAs(ADMIN_ID);
    const names = (await api.get('/categories')).body.map((c: any) => c.name);
    expect(names).toEqual(['Bollette', 'Cibo e beni', 'Cure veterinarie']);
    expect((await api.post('/categories', { name: 'Bollette' })).status).toBe(409);
  });
});
