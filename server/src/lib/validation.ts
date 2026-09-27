import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

z.config(z.locales.it());

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida (formato AAAA-MM-GG)')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, 'Data non valida');

export const requiredText = (max = 200) => z.string().trim().min(1, 'Campo obbligatorio').max(max);

// Empty or missing strings become null.
export const optionalText = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

export const amountCents = z.number().int().positive("L'importo deve essere maggiore di zero");

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const periodQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const nowIso = () => new Date().toISOString();

// zValidator that reports errors as { error, issues } with status 400.
export const validate = <T extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      const first = issues[0];
      const error = first.path ? `${first.path}: ${first.message}` : first.message;
      return c.json({ error, issues }, 400);
    }
  });

export const notFound = () => new HTTPException(404, { message: 'Elemento non trovato' });
export const conflict = (message: string) => new HTTPException(409, { message });
