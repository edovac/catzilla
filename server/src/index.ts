import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { openDb } from './db/client.js';

const production = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;
if (production && !sessionSecret) throw new Error('SESSION_SECRET is required in production');

const db = openDb({
  file: process.env.DB_FILE ?? 'catzilla.db',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@example.org',
});

const app = createApp(db, {
  secret: sessionSecret ?? 'dev-only-secret-change-me',
  secureCookie: production,
  devLogin: process.env.DEV_LOGIN === 'true' || !production,
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => console.log(`API listening on http://localhost:${port}`));
