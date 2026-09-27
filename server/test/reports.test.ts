import { describe, expect, it } from 'vitest';
import { ADMIN_ID, setup } from './helpers.js';

async function withData() {
  const { loginAs } = setup();
  const api = await loginAs(ADMIN_ID);
  await api.put('/settings/opening-balance', { openingBalanceCents: 10000, openingBalanceDate: '2026-01-01' });
  const { body: cat } = await api.post('/cats', { name: 'Tigre' });
  await api.post('/donations', { date: '2026-01-10', amountCents: 20000, paymentMethod: 'paypal' });
  const { body: gone } = await api.post('/donations', { date: '2026-02-10', amountCents: 99999, paymentMethod: 'cash' });
  await api.del(`/donations/${gone.id}`);
  const e = { categoryId: 1, description: 'x' };
  await api.post('/expenses', { ...e, date: '2026-01-20', amountCents: 3000, catId: cat.id });
  await api.post('/expenses', { ...e, date: '2026-02-05', amountCents: 2000, catId: cat.id, categoryId: 3 });
  await api.post('/expenses', { ...e, date: '2026-02-06', amountCents: 500, categoryId: 2 });
  return { api, cat, loginAs };
}

describe('reports', () => {
  it('computes the balance excluding deleted entries', async () => {
    const { api } = await withData();
    const { body } = await api.get('/reports/balance');
    expect(body).toMatchObject({
      openingBalanceCents: 10000,
      donationsCents: 20000,
      expensesCents: 5500,
      balanceCents: 24500,
    });
  });

  it('only lets admins set the opening balance', async () => {
    const { api, loginAs } = await withData();
    const { body: user } = await api.post('/users', { email: 'v@test.it', name: 'V' });
    const volunteer = await loginAs(user.id);
    const res = await volunteer.put('/settings/opening-balance', {
      openingBalanceCents: 1,
      openingBalanceDate: '2026-01-01',
    });
    expect(res.status).toBe(403);
    expect((await volunteer.get('/reports/balance')).body.balanceCents).toBe(24500);
  });

  it('totals expenses by category for a period', async () => {
    const { api } = await withData();
    const { body } = await api.get('/reports/categories?from=2026-02-01&to=2026-02-28');
    expect(body.byCategory.map((r: any) => [r.name, r.totalCents])).toEqual([
      ['Cibo e beni', 2000],
      ['Bollette', 500],
    ]);
    expect(body).toMatchObject({ donationsCents: 0, expensesCents: 2500, netCents: -2500 });
  });

  it('summarises expenses of a cat', async () => {
    const { api, cat } = await withData();
    const all = (await api.get(`/reports/cats/${cat.id}`)).body;
    expect(all.totalCents).toBe(5000);
    expect(all.expenses).toHaveLength(2);
    expect(all.byCategory).toHaveLength(2);
    const jan = (await api.get(`/reports/cats/${cat.id}?from=2026-01-01&to=2026-01-31`)).body;
    expect(jan.totalCents).toBe(3000);
  });
});
