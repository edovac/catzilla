import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { categories } from '../db/schema.js';
import type { AuthEnv } from '../lib/auth.js';
import { idParam, notFound, nowIso, requiredText, validate } from '../lib/validation.js';

const input = z.object({ name: requiredText(100) });

// Categories are never deleted: archived ones are hidden from new expenses only.
export const categoryRoutes = (db: Db) => {
  const setArchived = (id: number, userId: number, archived: boolean) => {
    const now = nowIso();
    const row = db
      .update(categories)
      .set({ archivedAt: archived ? now : null, updatedBy: userId, updatedAt: now })
      .where(eq(categories.id, id))
      .returning()
      .get();
    if (!row) throw notFound();
    return row;
  };

  return new Hono<AuthEnv>()
    .get('/', (c) => c.json(db.select().from(categories).orderBy(asc(categories.name)).all()))
    .post('/', validate('json', input), (c) => {
      const me = c.var.user.id;
      const row = db
        .insert(categories)
        .values({ ...c.req.valid('json'), createdBy: me, updatedBy: me })
        .returning()
        .get();
      return c.json(row, 201);
    })
    .patch('/:id', validate('param', idParam), validate('json', input), (c) => {
      const row = db
        .update(categories)
        .set({ ...c.req.valid('json'), updatedBy: c.var.user.id, updatedAt: nowIso() })
        .where(eq(categories.id, c.req.valid('param').id))
        .returning()
        .get();
      if (!row) throw notFound();
      return c.json(row);
    })
    .post('/:id/archive', validate('param', idParam), (c) =>
      c.json(setArchived(c.req.valid('param').id, c.var.user.id, true)),
    )
    .post('/:id/restore', validate('param', idParam), (c) =>
      c.json(setArchived(c.req.valid('param').id, c.var.user.id, false)),
    );
};
