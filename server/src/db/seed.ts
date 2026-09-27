import { count } from 'drizzle-orm';
import type { Db } from './client.js';
import { categories, settings, users } from './schema.js';

export const initialCategories = ['Cure veterinarie', 'Bollette', 'Cibo e beni'];

// Idempotent: only fills an empty database.
export function seed(db: Db, adminEmail: string) {
  db.transaction((tx) => {
    const [{ n: userCount }] = tx.select({ n: count() }).from(users).all();
    if (userCount === 0) {
      tx.insert(users).values({ email: adminEmail, name: 'Amministratore', isAdmin: true }).run();
    }
    const [{ n: categoryCount }] = tx.select({ n: count() }).from(categories).all();
    if (categoryCount === 0) {
      tx.insert(categories).values(initialCategories.map((name) => ({ name }))).run();
    }
    tx.insert(settings).values({ id: 1 }).onConflictDoNothing().run();
  });
}
