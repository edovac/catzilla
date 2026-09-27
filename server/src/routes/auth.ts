import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { users } from '../db/schema.js';
import { endSession, startSession, type SessionConfig } from '../lib/auth.js';
import { validate } from '../lib/validation.js';

// POC login: pick an enabled user, no password. Replaced by Google OIDC later.
export const authRoutes = (db: Db, cfg: SessionConfig & { devLogin: boolean }) =>
  new Hono()
    .get('/dev-users', (c) => {
      if (!cfg.devLogin) throw new HTTPException(404);
      const rows = db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.enabled, true))
        .orderBy(asc(users.name))
        .all();
      return c.json(rows);
    })
    .post('/dev-login', validate('json', z.object({ userId: z.number().int() })), async (c) => {
      if (!cfg.devLogin) throw new HTTPException(404);
      const { userId } = c.req.valid('json');
      const user = db.select().from(users).where(eq(users.id, userId)).get();
      if (!user || !user.enabled) {
        throw new HTTPException(401, { message: 'Utente non abilitato' });
      }
      await startSession(c, cfg, user.id);
      return c.json({ ok: true });
    })
    .post('/logout', (c) => {
      endSession(c);
      return c.json({ ok: true });
    });
