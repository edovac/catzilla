import { gte, lte, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

// Inclusive date range; either bound may be missing.
export const inPeriod = (col: SQLiteColumn, from?: string, to?: string): (SQL | undefined)[] => [
  from ? gte(col, from) : undefined,
  to ? lte(col, to) : undefined,
];
