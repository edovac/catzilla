// Timestamps and authors for the tracking columns (created_*/updated_*).
// Every write takes them from here rather than from SQLite defaults: the audit
// triggers read the author from these columns and reject an update that leaves
// updated_at unchanged, so timestamps must come from one strictly increasing
// clock. (Two writes in the same millisecond, or in one Workers request, where
// the clock doesn't advance, still get different values.)

let lastNow = 0;

export const nowIso = () => {
  lastNow = Math.max(Date.now(), lastNow + 1);
  return new Date(lastNow).toISOString();
};

export const created = (userId: number | null) => {
  const at = nowIso();
  return { createdAt: at, createdBy: userId, updatedAt: at, updatedBy: userId };
};

export const updated = (userId: number, at = nowIso()) => ({ updatedAt: at, updatedBy: userId });
