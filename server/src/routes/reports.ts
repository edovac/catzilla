import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Db } from '../db/client.js';
import { categories, cats, donations, expenses, settings } from '../db/schema.js';
import type { AuthEnv } from '../lib/auth.js';
import { inPeriod } from '../lib/period.js';
import { idParam, notFound, periodQuery, validate } from '../lib/validation.js';

// Deleted entries are always excluded from reports.
export const reportRoutes = (db: Db) => {
  const sumCents = (col: typeof donations.amountCents | typeof expenses.amountCents) =>
    sql<number>`coalesce(sum(${col}), 0)`.mapWith(Number);

  const donationTotal = (from?: string, to?: string) =>
    db
      .select({ total: sumCents(donations.amountCents) })
      .from(donations)
      .where(and(isNull(donations.deletedAt), ...inPeriod(donations.date, from, to)))
      .get()!.total;

  const expenseTotal = (from?: string, to?: string) =>
    db
      .select({ total: sumCents(expenses.amountCents) })
      .from(expenses)
      .where(and(isNull(expenses.deletedAt), ...inPeriod(expenses.date, from, to)))
      .get()!.total;

  return new Hono<AuthEnv>()
    .get('/balance', (c) => {
      const { openingBalanceCents, openingBalanceDate } = db
        .select()
        .from(settings)
        .where(eq(settings.id, 1))
        .get()!;
      const donationsCents = donationTotal();
      const expensesCents = expenseTotal();
      return c.json({
        openingBalanceCents,
        openingBalanceDate,
        donationsCents,
        expensesCents,
        balanceCents: (openingBalanceCents ?? 0) + donationsCents - expensesCents,
      });
    })
    .get('/categories', validate('query', periodQuery), (c) => {
      const { from, to } = c.req.valid('query');
      const byCategory = db
        .select({
          categoryId: categories.id,
          name: categories.name,
          archivedAt: categories.archivedAt,
          count: sql<number>`count(*)`.mapWith(Number),
          totalCents: sumCents(expenses.amountCents),
        })
        .from(expenses)
        .innerJoin(categories, eq(categories.id, expenses.categoryId))
        .where(and(isNull(expenses.deletedAt), ...inPeriod(expenses.date, from, to)))
        .groupBy(categories.id)
        .orderBy(desc(sumCents(expenses.amountCents)))
        .all();
      const donationsCents = donationTotal(from, to);
      const expensesCents = expenseTotal(from, to);
      return c.json({
        from: from ?? null,
        to: to ?? null,
        byCategory,
        donationsCents,
        expensesCents,
        netCents: donationsCents - expensesCents,
      });
    })
    .get('/cats/:id', validate('param', idParam), validate('query', periodQuery), (c) => {
      const { id } = c.req.valid('param');
      const { from, to } = c.req.valid('query');
      const cat = db.select().from(cats).where(eq(cats.id, id)).get();
      if (!cat) throw notFound();
      const where = and(
        eq(expenses.catId, id),
        isNull(expenses.deletedAt),
        ...inPeriod(expenses.date, from, to),
      );
      const list = db
        .select({
          id: expenses.id,
          date: expenses.date,
          amountCents: expenses.amountCents,
          description: expenses.description,
          supplier: expenses.supplier,
          categoryId: expenses.categoryId,
          categoryName: categories.name,
        })
        .from(expenses)
        .innerJoin(categories, eq(categories.id, expenses.categoryId))
        .where(where)
        .orderBy(desc(expenses.date), desc(expenses.id))
        .all();
      const byCategory = db
        .select({
          categoryId: categories.id,
          name: categories.name,
          totalCents: sumCents(expenses.amountCents),
        })
        .from(expenses)
        .innerJoin(categories, eq(categories.id, expenses.categoryId))
        .where(where)
        .groupBy(categories.id)
        .orderBy(desc(sumCents(expenses.amountCents)))
        .all();
      const totalCents = list.reduce((s, e) => s + e.amountCents, 0);
      return c.json({ cat, from: from ?? null, to: to ?? null, expenses: list, byCategory, totalCents });
    });
};
