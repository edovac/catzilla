import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { settings } from '../db/schema.js';
import { requireAdmin, type AuthEnv } from '../lib/auth.js';
import { updated } from '../lib/tracking.js';
import { isoDate, validate } from '../lib/validation.js';

const openingBalanceInput = z.object({
  openingBalanceCents: z.number().int(),
  openingBalanceDate: isoDate,
});

const read = (db: Db) => {
  const { openingBalanceCents, openingBalanceDate } = db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .get()!;
  return { openingBalanceCents, openingBalanceDate };
};

export const settingsRoutes = (db: Db) =>
  new Hono<AuthEnv>()
    .get('/', (c) => c.json(read(db)))
    .put('/opening-balance', requireAdmin, validate('json', openingBalanceInput), (c) => {
      db.update(settings)
        .set({ ...c.req.valid('json'), ...updated(c.var.user.id) })
        .where(eq(settings.id, 1))
        .run();
      return c.json(read(db));
    });
