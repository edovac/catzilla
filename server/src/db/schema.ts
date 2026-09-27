import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

// Conventions:
// - amounts are integer cents (EUR)
// - dates are 'YYYY-MM-DD' strings, timestamps are ISO-8601 strings (UTC)
// - nothing is hard-deleted: archival and deletion are timestamps
// - every row records who created and last updated it (audit history comes later)

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

const tracking = {
  createdAt: text('created_at').notNull().default(now),
  createdBy: integer('created_by').references((): AnySQLiteColumn => users.id),
  updatedAt: text('updated_at').notNull().default(now),
  updatedBy: integer('updated_by').references((): AnySQLiteColumn => users.id),
};

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  ...tracking,
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  archivedAt: text('archived_at'),
  ...tracking,
});

export const cats = sqliteTable('cats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  notes: text('notes'),
  archivedAt: text('archived_at'),
  ...tracking,
});

export const paymentMethods = ['cash', 'bank_transfer', 'paypal', 'other'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const donations = sqliteTable(
  'donations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    amountCents: integer('amount_cents').notNull(),
    donor: text('donor'),
    paymentMethod: text('payment_method', { enum: paymentMethods }).notNull(),
    notes: text('notes'),
    deletedAt: text('deleted_at'),
    ...tracking,
  },
  (t) => [
    check('donations_amount_positive', sql`${t.amountCents} > 0`),
    index('donations_date_idx').on(t.date),
  ],
);

export const expenses = sqliteTable(
  'expenses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    amountCents: integer('amount_cents').notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    description: text('description').notNull(),
    catId: integer('cat_id').references(() => cats.id),
    supplier: text('supplier'),
    notes: text('notes'),
    deletedAt: text('deleted_at'),
    ...tracking,
  },
  (t) => [
    check('expenses_amount_positive', sql`${t.amountCents} > 0`),
    index('expenses_date_idx').on(t.date),
    index('expenses_category_idx').on(t.categoryId),
    index('expenses_cat_idx').on(t.catId),
  ],
);

// Single-row table for app-wide settings.
export const settings = sqliteTable(
  'settings',
  {
    id: integer('id').primaryKey(),
    openingBalanceCents: integer('opening_balance_cents'),
    openingBalanceDate: text('opening_balance_date'),
    ...tracking,
  },
  (t) => [check('settings_single_row', sql`${t.id} = 1`)],
);

// Written only by the triggers in drizzle/0002_audit_triggers.sql, never by the app.
export const auditEntityTypes = ['donation', 'expense', 'category', 'cat'] as const;
export type AuditEntityType = (typeof auditEntityTypes)[number];
export const auditActions = ['create', 'update', 'delete', 'restore', 'archive'] as const;

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    entityType: text('entity_type', { enum: auditEntityTypes }).notNull(),
    entityId: integer('entity_id').notNull(),
    action: text('action', { enum: auditActions }).notNull(),
    userId: integer('user_id').references(() => users.id), // null for seed data
    at: text('at').notNull(),
    oldValues: text('old_values', { mode: 'json' }).$type<Record<string, unknown>>(),
    newValues: text('new_values', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  },
  (t) => [index('audit_log_entity_idx').on(t.entityType, t.entityId)],
);
