import { SqliteError } from 'better-sqlite3';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Db } from './db/client.js';
import { requireUser, type AuthEnv, type SessionConfig } from './lib/auth.js';
import { authRoutes } from './routes/auth.js';
import { catRoutes } from './routes/cats.js';
import { categoryRoutes } from './routes/categories.js';
import { donationRoutes } from './routes/donations.js';
import { expenseRoutes } from './routes/expenses.js';
import { reportRoutes } from './routes/reports.js';
import { settingsRoutes } from './routes/settings.js';
import { userRoutes } from './routes/users.js';

export interface AppConfig extends SessionConfig {
  devLogin: boolean;
}

export function createApp(db: Db, cfg: AppConfig) {
  const api = new Hono<AuthEnv>()
    .use(requireUser(db, cfg))
    .get('/me', (c) => c.json(c.var.user))
    .route('/users', userRoutes(db))
    .route('/categories', categoryRoutes(db))
    .route('/cats', catRoutes(db))
    .route('/donations', donationRoutes(db))
    .route('/expenses', expenseRoutes(db))
    .route('/settings', settingsRoutes(db))
    .route('/reports', reportRoutes(db));

  const app = new Hono()
    .route('/api/auth', authRoutes(db, cfg))
    .route('/api', api);

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message || 'Errore' }, err.status);
    }
    if (err instanceof SqliteError && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return c.json({ error: 'Esiste già un elemento con questo valore' }, 409);
    }
    console.error(err);
    return c.json({ error: 'Errore interno' }, 500);
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
