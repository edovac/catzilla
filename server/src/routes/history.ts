import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import {
  auditEntityTypes,
  auditLog,
  categories,
  cats,
  donations,
  expenses,
  users,
  type AuditEntityType,
} from '../db/schema.js';
import type { AuthEnv } from '../lib/auth.js';
import { notFound, validate } from '../lib/validation.js';

const params = z.object({
  entity: z.enum(auditEntityTypes),
  id: z.coerce.number().int().positive(),
});

// Fields whose change is already expressed by the action (delete, archive, restore).
const stateFields = new Set(['deletedAt', 'archivedAt']);

type Values = Record<string, unknown>;
export interface Change {
  field: string;
  old: unknown;
  new: unknown;
}

export const historyRoutes = (db: Db) => {
  const exists: Record<AuditEntityType, (id: number) => boolean> = {
    donation: (id) => !!db.select({ id: donations.id }).from(donations).where(eq(donations.id, id)).get(),
    expense: (id) => !!db.select({ id: expenses.id }).from(expenses).where(eq(expenses.id, id)).get(),
    category: (id) => !!db.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).get(),
    cat: (id) => !!db.select({ id: cats.id }).from(cats).where(eq(cats.id, id)).get(),
  };

  // Expense snapshots hold ids: show category and cat names instead.
  const resolver = (entity: AuditEntityType) => {
    if (entity !== 'expense') return (field: string, value: unknown) => ({ field, value });
    const categoryNames = new Map(db.select().from(categories).all().map((c) => [c.id, c.name]));
    const catNames = new Map(db.select().from(cats).all().map((c) => [c.id, c.name]));
    return (field: string, value: unknown) => {
      if (field === 'categoryId') return { field: 'category', value: categoryNames.get(value as number) ?? value };
      if (field === 'catId') return { field: 'cat', value: value === null ? null : (catNames.get(value as number) ?? value) };
      return { field, value };
    };
  };

  const changes = (action: string, oldValues: Values | null, newValues: Values, resolve: ReturnType<typeof resolver>) => {
    if (action !== 'create' && action !== 'update') return [];
    const result: Change[] = [];
    for (const [field, value] of Object.entries(newValues)) {
      if (stateFields.has(field)) continue;
      const before = oldValues?.[field] ?? null;
      if (action === 'create' ? value === null : JSON.stringify(before) === JSON.stringify(value)) continue;
      const n = resolve(field, value);
      result.push({ field: n.field, old: action === 'create' ? null : resolve(field, before).value, new: n.value });
    }
    return result;
  };

  return new Hono<AuthEnv>().get('/:entity/:id', validate('param', params), (c) => {
    const { entity, id } = c.req.valid('param');
    if (!exists[entity](id)) throw notFound();
    const rows = db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        at: auditLog.at,
        userId: auditLog.userId,
        userName: users.name,
        oldValues: auditLog.oldValues,
        newValues: auditLog.newValues,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.userId))
      .where(and(eq(auditLog.entityType, entity), eq(auditLog.entityId, id)))
      .orderBy(asc(auditLog.id))
      .all();
    const resolve = resolver(entity);
    return c.json(
      rows.map((r) => ({
        id: r.id,
        action: r.action,
        at: r.at,
        user: r.userId === null ? null : { id: r.userId, name: r.userName ?? '' },
        changes: changes(r.action, r.oldValues ?? null, r.newValues, resolve),
      })),
    );
  });
};
