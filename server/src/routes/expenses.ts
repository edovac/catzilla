import { and, desc, eq, getTableColumns, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { categories, cats, expenses } from '../db/schema.js';
import type { AuthEnv } from '../lib/auth.js';
import { created, nowIso, updated } from '../lib/tracking.js';
import { inPeriod } from '../lib/period.js';
import {
  amountCents,
  conflict,
  idParam,
  isoDate,
  notFound,
  optionalText,
  periodQuery,
  requiredText,
  validate,
} from '../lib/validation.js';

const input = z.object({
  date: isoDate,
  amountCents,
  categoryId: z.number().int().positive(),
  description: requiredText(500),
  catId: z.number().int().positive().nullish().transform((v) => v ?? null),
  supplier: optionalText(200),
  notes: optionalText(),
});

const listQuery = periodQuery.extend({
  categoryId: z.coerce.number().int().positive().optional(),
  catId: z.coerce.number().int().positive().optional(),
  includeDeleted: z.stringbool().optional(),
});

type Input = z.infer<typeof input>;

export const expenseRoutes = (db: Db) => {
  const select = () =>
    db
      .select({
        ...getTableColumns(expenses),
        categoryName: categories.name,
        catName: cats.name,
      })
      .from(expenses)
      .innerJoin(categories, eq(categories.id, expenses.categoryId))
      .leftJoin(cats, eq(cats.id, expenses.catId));

  const find = (id: number) => {
    const row = select().where(eq(expenses.id, id)).get();
    if (!row) throw notFound();
    return row;
  };

  // A new category or cat must be active. An existing expense may keep an
  // archived one it already had.
  const checkReferences = (data: Input, current?: { categoryId: number; catId: number | null }) => {
    if (data.categoryId !== current?.categoryId) {
      const category = db.select().from(categories).where(eq(categories.id, data.categoryId)).get();
      if (!category) throw conflict('Categoria inesistente');
      if (category.archivedAt) throw conflict('La categoria è archiviata');
    }
    if (data.catId !== null && data.catId !== current?.catId) {
      const cat = db.select().from(cats).where(eq(cats.id, data.catId)).get();
      if (!cat) throw conflict('Gatto inesistente');
      if (cat.archivedAt) throw conflict('Il gatto è archiviato');
    }
  };

  const setDeleted = (id: number, userId: number, deleted: boolean) => {
    const now = nowIso();
    const row = db
      .update(expenses)
      .set({ deletedAt: deleted ? now : null, ...updated(userId, now) })
      .where(eq(expenses.id, id))
      .returning({ id: expenses.id })
      .get();
    if (!row) throw notFound();
    return find(id);
  };

  return new Hono<AuthEnv>()
    .get('/', validate('query', listQuery), (c) => {
      const { from, to, categoryId, catId, includeDeleted } = c.req.valid('query');
      const rows = select()
        .where(
          and(
            ...inPeriod(expenses.date, from, to),
            categoryId ? eq(expenses.categoryId, categoryId) : undefined,
            catId ? eq(expenses.catId, catId) : undefined,
            includeDeleted ? undefined : isNull(expenses.deletedAt),
          ),
        )
        .orderBy(desc(expenses.date), desc(expenses.id))
        .all();
      return c.json(rows);
    })
    .get('/:id', validate('param', idParam), (c) => c.json(find(c.req.valid('param').id)))
    .post('/', validate('json', input), (c) => {
      const data = c.req.valid('json');
      checkReferences(data);
      const me = c.var.user.id;
      const { id } = db
        .insert(expenses)
        .values({ ...data, ...created(me) })
        .returning({ id: expenses.id })
        .get();
      return c.json(find(id), 201);
    })
    .put('/:id', validate('param', idParam), validate('json', input), (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const current = find(id);
      if (current.deletedAt) throw conflict('Ripristina la spesa prima di modificarla');
      checkReferences(data, current);
      db.update(expenses)
        .set({ ...data, ...updated(c.var.user.id) })
        .where(eq(expenses.id, id))
        .run();
      return c.json(find(id));
    })
    // Soft delete: the entry is kept, but excluded from balance and reports.
    .delete('/:id', validate('param', idParam), (c) =>
      c.json(setDeleted(c.req.valid('param').id, c.var.user.id, true)),
    )
    .post('/:id/restore', validate('param', idParam), (c) =>
      c.json(setDeleted(c.req.valid('param').id, c.var.user.id, false)),
    );
};
