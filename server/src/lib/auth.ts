import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { Db } from '../db/client.js';
import { users } from '../db/schema.js';

export type User = typeof users.$inferSelect;
export type AuthEnv = { Variables: { user: User } };

const COOKIE = 'catzilla_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionConfig {
  secret: string;
  secureCookie: boolean;
}

export async function startSession(c: Context, cfg: SessionConfig, userId: number) {
  await setSignedCookie(c, COOKIE, String(userId), cfg.secret, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: cfg.secureCookie,
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function endSession(c: Context) {
  deleteCookie(c, COOKIE, { path: '/' });
}

// Loads the logged-in user. Disabled users are rejected on every request,
// so disabling a user takes effect immediately.
export const requireUser = (db: Db, cfg: SessionConfig) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const value = await getSignedCookie(c, cfg.secret, COOKIE);
    const userId = value ? Number(value) : NaN;
    const user = Number.isInteger(userId)
      ? db.select().from(users).where(eq(users.id, userId)).get()
      : undefined;
    if (!user || !user.enabled) {
      endSession(c);
      throw new HTTPException(401, { message: 'Accesso richiesto' });
    }
    c.set('user', user);
    await next();
  });

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  if (!c.var.user.isAdmin) {
    throw new HTTPException(403, { message: 'Operazione riservata agli amministratori' });
  }
  await next();
});
