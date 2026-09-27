import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import { seed } from './seed.js';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

const defaultMigrationsFolder = path.resolve(import.meta.dirname, '../../drizzle');

export interface DbOptions {
  file: string; // path or ':memory:'
  adminEmail: string;
  migrationsFolder?: string;
}

export function openDb({ file, adminEmail, migrationsFolder }: DbOptions): Db {
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: migrationsFolder ?? defaultMigrationsFolder });
  seed(db, adminEmail);
  return db;
}
