import { and, asc, count, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { users } from '../db/schema.js';
import { requireAdmin, type AuthEnv } from '../lib/auth.js';
import { conflict, idParam, notFound, nowIso, requiredText, validate } from '../lib/validation.js';

const email = z.email().trim().toLowerCase();

const createInput = z.object({
  email,
  name: requiredText(),
  isAdmin: z.boolean().default(false),
});

const updateInput = z.object({
  email: email.optional(),
  name: requiredText().optional(),
  isAdmin: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

// Users are never deleted, only disabled, so the history keeps pointing to them.
export const userRoutes = (db: Db) =>
  new Hono<AuthEnv>()
    .use(requireAdmin)
    .get('/', (c) => c.json(db.select().from(users).orderBy(asc(users.name)).all()))
    .post('/', validate('json', createInput), (c) => {
      const me = c.var.user.id;
      const row = db
        .insert(users)
        .values({ ...c.req.valid('json'), createdBy: me, updatedBy: me })
        .returning()
        .get();
      return c.json(row, 201);
    })
    .patch('/:id', validate('param', idParam), validate('json', updateInput), (c) => {
      const { id } = c.req.valid('param');
      const row = db.transaction((tx) => {
        const updated = tx
          .update(users)
          .set({ ...c.req.valid('json'), updatedBy: c.var.user.id, updatedAt: nowIso() })
          .where(eq(users.id, id))
          .returning()
          .get();
        if (!updated) throw notFound();
        const [{ n }] = tx
          .select({ n: count() })
          .from(users)
          .where(and(eq(users.isAdmin, true), eq(users.enabled, true)))
          .all();
        if (n === 0) throw conflict('Deve esserci almeno un amministratore abilitato');
        return updated;
      });
      return c.json(row);
    });
