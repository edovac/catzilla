import { and, desc, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { donations, paymentMethods } from '../db/schema.js';
import type { AuthEnv } from '../lib/auth.js';
import { created, nowIso, updated } from '../lib/tracking.js';
import { inPeriod } from '../lib/period.js';
import {
  amountCents,
  conflict,
  idParam,
  isoDate,
  notFound,
  optionalText,
  periodQuery,
  validate,
} from '../lib/validation.js';

const input = z.object({
  date: isoDate,
  amountCents,
  donor: optionalText(200), // null means anonymous
  paymentMethod: z.enum(paymentMethods),
  notes: optionalText(),
});

const listQuery = periodQuery.extend({ includeDeleted: z.stringbool().optional() });

export const donationRoutes = (db: Db) => {
  const find = (id: number) => {
    const row = db.select().from(donations).where(eq(donations.id, id)).get();
    if (!row) throw notFound();
    return row;
  };

  const setDeleted = (id: number, userId: number, deleted: boolean) => {
    const now = nowIso();
    const row = db
      .update(donations)
      .set({ deletedAt: deleted ? now : null, ...updated(userId, now) })
      .where(eq(donations.id, id))
      .returning()
      .get();
    if (!row) throw notFound();
    return row;
  };

  return new Hono<AuthEnv>()
    .get('/', validate('query', listQuery), (c) => {
      const { from, to, includeDeleted } = c.req.valid('query');
      const rows = db
        .select()
        .from(donations)
        .where(
          and(
            ...inPeriod(donations.date, from, to),
            includeDeleted ? undefined : isNull(donations.deletedAt),
          ),
        )
        .orderBy(desc(donations.date), desc(donations.id))
        .all();
      return c.json(rows);
    })
    .get('/:id', validate('param', idParam), (c) => c.json(find(c.req.valid('param').id)))
    .post('/', validate('json', input), (c) => {
      const me = c.var.user.id;
      const row = db
        .insert(donations)
        .values({ ...c.req.valid('json'), ...created(me) })
        .returning()
        .get();
      return c.json(row, 201);
    })
    .put('/:id', validate('param', idParam), validate('json', input), (c) => {
      const { id } = c.req.valid('param');
      if (find(id).deletedAt) throw conflict('Ripristina la donazione prima di modificarla');
      const row = db
        .update(donations)
        .set({ ...c.req.valid('json'), ...updated(c.var.user.id) })
        .where(eq(donations.id, id))
        .returning()
        .get();
      return c.json(row);
    })
    // Soft delete: the entry is kept, but excluded from balance and reports.
    .delete('/:id', validate('param', idParam), (c) =>
      c.json(setDeleted(c.req.valid('param').id, c.var.user.id, true)),
    )
    .post('/:id/restore', validate('param', idParam), (c) =>
      c.json(setDeleted(c.req.valid('param').id, c.var.user.id, false)),
    );
};
