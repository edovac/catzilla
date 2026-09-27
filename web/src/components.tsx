import type { ReactNode } from 'react';
import { formatEuro, today } from './format';
import type { Period } from './period';

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {action}
    </header>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="error" role="alert">
      {error instanceof Error ? error.message : 'Errore'}
    </p>
  );
}

export const Loading = () => <p className="muted">Caricamento…</p>;

export const Money = ({ cents, sign }: { cents: number; sign?: 'in' | 'out' }) => (
  <span className={`money ${sign ?? ''}`}>
    {sign === 'out' ? '−' : sign === 'in' ? '+' : ''}
    {formatEuro(cents)}
  </span>
);

export function PeriodPicker({
  value,
  onChange,
  allowAll = false,
}: {
  value: Period;
  onChange: (p: Period) => void;
  allowAll?: boolean;
}) {
  const setKind = (kind: Period['kind']) => {
    if (kind === 'all') onChange({ kind });
    if (kind === 'month') onChange({ kind, month: today().slice(0, 7) });
    if (kind === 'year') onChange({ kind, year: Number(today().slice(0, 4)) });
    if (kind === 'custom') onChange({ kind, from: '', to: '' });
  };
  return (
    <div className="period">
      <select value={value.kind} onChange={(e) => setKind(e.target.value as Period['kind'])} aria-label="Periodo">
        {allowAll && <option value="all">Sempre</option>}
        <option value="month">Mese</option>
        <option value="year">Anno</option>
        <option value="custom">Personalizzato</option>
      </select>
      {value.kind === 'month' && (
        <input
          type="month"
          value={value.month}
          onChange={(e) => e.target.value && onChange({ kind: 'month', month: e.target.value })}
          aria-label="Mese"
        />
      )}
      {value.kind === 'year' && (
        <input
          type="number"
          min={2000}
          max={2100}
          value={value.year}
          onChange={(e) => onChange({ kind: 'year', year: Number(e.target.value) })}
          aria-label="Anno"
        />
      )}
      {value.kind === 'custom' && (
        <>
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            aria-label="Dal"
          />
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            aria-label="Al"
          />
        </>
      )}
    </div>
  );
}

export function DeletedBanner({ onRestore, busy }: { onRestore: () => void; busy: boolean }) {
  return (
    <div className="banner">
      <span>Questo movimento è eliminato: non conta nel saldo e nei report.</span>
      <button onClick={onRestore} disabled={busy}>Ripristina</button>
    </div>
  );
}

// Horizontal bars for one series (e.g. expenses per category). Values sit at the
// bar tips; the same numbers are also shown in a table on the page.
export function BarList({ rows }: { rows: { key: number; label: string; cents: number; hint?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.cents), 1);
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.key} title={r.hint ? `${r.label}: ${formatEuro(r.cents)} (${r.hint})` : undefined}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            <span className="bar" style={{ width: `calc((100% - 7rem) * ${r.cents / max})` }} />
            <span className="bar-value">{formatEuro(r.cents)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
