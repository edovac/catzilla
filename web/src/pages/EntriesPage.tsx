import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, paymentMethods, query, type Donation, type Expense } from '../api';
import { ErrorBox, Loading, Money, PageHeader, PeriodPicker } from '../components';
import { formatDate } from '../format';
import { currentMonth, periodRange, type Period } from '../period';

export function EntriesPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tipo') === 'donazioni' ? 'donazioni' : 'spese';
  const [period, setPeriod] = useState<Period>(currentMonth());
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const q = query({ ...periodRange(period), includeDeleted });

  return (
    <>
      <PageHeader
        title="Movimenti"
        action={
          <Link className="button primary" to={tab === 'spese' ? '/spese/nuova' : '/donazioni/nuova'}>
            + {tab === 'spese' ? 'Spesa' : 'Donazione'}
          </Link>
        }
      />
      <div className="tabs" role="tablist">
        {(['spese', 'donazioni'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setParams({ tipo: t }, { replace: true })}
          >
            {t === 'spese' ? 'Spese' : 'Donazioni'}
          </button>
        ))}
      </div>
      <div className="filters">
        <PeriodPicker value={period} onChange={setPeriod} allowAll />
        <label className="checkbox">
          <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
          Mostra eliminati
        </label>
      </div>
      {tab === 'spese' ? <ExpenseList q={q} /> : <DonationList q={q} />}
    </>
  );
}

const total = (rows: { amountCents: number; deletedAt: string | null }[]) =>
  rows.filter((r) => !r.deletedAt).reduce((s, r) => s + r.amountCents, 0);

function ExpenseList({ q }: { q: string }) {
  const { data, error, isPending } = useQuery({
    queryKey: ['expenses', q],
    queryFn: () => api.get<Expense[]>(`/expenses${q}`),
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (data.length === 0) return <p className="muted">Nessuna spesa nel periodo.</p>;
  return (
    <>
      <p className="total">Totale: <Money cents={total(data)} /></p>
      <ul className="list">
        {data.map((e) => (
          <li key={e.id} className={e.deletedAt ? 'deleted' : ''}>
            <Link to={`/spese/${e.id}`}>
              <div>
                <strong>{e.description}</strong>
                <span className="muted">
                  {formatDate(e.date)} · {e.categoryName}
                  {e.catName && ` · ${e.catName}`}
                  {e.deletedAt && ' · eliminata'}
                </span>
              </div>
              <Money cents={e.amountCents} sign="out" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function DonationList({ q }: { q: string }) {
  const { data, error, isPending } = useQuery({
    queryKey: ['donations', q],
    queryFn: () => api.get<Donation[]>(`/donations${q}`),
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (data.length === 0) return <p className="muted">Nessuna donazione nel periodo.</p>;
  return (
    <>
      <p className="total">Totale: <Money cents={total(data)} /></p>
      <ul className="list">
        {data.map((d) => (
          <li key={d.id} className={d.deletedAt ? 'deleted' : ''}>
            <Link to={`/donazioni/${d.id}`}>
              <div>
                <strong>{d.donor ?? 'Anonimo'}</strong>
                <span className="muted">
                  {formatDate(d.date)} · {paymentMethods[d.paymentMethod]}
                  {d.deletedAt && ' · eliminata'}
                </span>
              </div>
              <Money cents={d.amountCents} sign="in" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
