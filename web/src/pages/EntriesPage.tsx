import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, paymentMethods, query, type Donation, type Expense } from '../api';
import { ErrorBox, Loading, Money, PageHeader, PeriodPicker } from '../components';
import { formatDate } from '../format';
import { currentMonth, periodRange, type Period } from '../period';

const tabs = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'spese', label: 'Spese' },
  { id: 'donazioni', label: 'Donazioni' },
] as const;
type Tab = (typeof tabs)[number]['id'];

// Passed to the entry forms, so saving returns to the tab the user came from.
export type BackState = { back?: string };

export function EntriesPage() {
  const [params, setParams] = useSearchParams();
  const tipo = params.get('tipo');
  const tab: Tab = tipo === 'spese' || tipo === 'donazioni' ? tipo : 'tutti';
  const [period, setPeriod] = useState<Period>(currentMonth());
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const q = query({ ...periodRange(period), includeDeleted });
  const back: BackState = { back: `/movimenti?tipo=${tab}` };

  const addExpense = (
    <Link className="button primary" to="/spese/nuova" state={back}>
      + Spesa
    </Link>
  );
  const addDonation = (
    <Link className={tab === 'donazioni' ? 'button primary' : 'button'} to="/donazioni/nuova" state={back}>
      + Donazione
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Movimenti"
        action={
          tab === 'tutti' ? (
            <div className="row-actions">
              {addExpense}
              {addDonation}
            </div>
          ) : tab === 'spese' ? (
            addExpense
          ) : (
            addDonation
          )
        }
      />
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tipo: t.id }, { replace: true })}
          >
            {t.label}
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
      {tab === 'tutti' && <AllList q={q} back={back} />}
      {tab === 'spese' && <ExpenseList q={q} back={back} />}
      {tab === 'donazioni' && <DonationList q={q} back={back} />}
    </>
  );
}

const useExpenses = (q: string) =>
  useQuery({ queryKey: ['expenses', q], queryFn: () => api.get<Expense[]>(`/expenses${q}`) });

const useDonations = (q: string) =>
  useQuery({ queryKey: ['donations', q], queryFn: () => api.get<Donation[]>(`/donations${q}`) });

const total = (rows: { amountCents: number; deletedAt: string | null }[]) =>
  rows.filter((r) => !r.deletedAt).reduce((s, r) => s + r.amountCents, 0);

function ExpenseRow({ e, back }: { e: Expense; back: BackState }) {
  return (
    <li className={e.deletedAt ? 'deleted' : ''}>
      <Link to={`/spese/${e.id}`} state={back}>
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
  );
}

function DonationRow({ d, back }: { d: Donation; back: BackState }) {
  return (
    <li className={d.deletedAt ? 'deleted' : ''}>
      <Link to={`/donazioni/${d.id}`} state={back}>
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
  );
}

function ExpenseList({ q, back }: { q: string; back: BackState }) {
  const { data, error, isPending } = useExpenses(q);
  if (isPending) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (data.length === 0) return <p className="muted">Nessuna spesa nel periodo.</p>;
  return (
    <>
      <p className="total">Totale: <Money cents={total(data)} /></p>
      <ul className="list">
        {data.map((e) => (
          <ExpenseRow key={e.id} e={e} back={back} />
        ))}
      </ul>
    </>
  );
}

function DonationList({ q, back }: { q: string; back: BackState }) {
  const { data, error, isPending } = useDonations(q);
  if (isPending) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (data.length === 0) return <p className="muted">Nessuna donazione nel periodo.</p>;
  return (
    <>
      <p className="total">Totale: <Money cents={total(data)} /></p>
      <ul className="list">
        {data.map((d) => (
          <DonationRow key={d.id} d={d} back={back} />
        ))}
      </ul>
    </>
  );
}

// Expenses and donations in one list, newest first. Both API lists are already
// sorted by date descending, so on the same date expenses come before donations.
function AllList({ q, back }: { q: string; back: BackState }) {
  const expenses = useExpenses(q);
  const donations = useDonations(q);
  if (expenses.isPending || donations.isPending) return <Loading />;
  if (expenses.error || donations.error) return <ErrorBox error={expenses.error ?? donations.error} />;

  const rows = [
    ...expenses.data.map((e) => ({ kind: 'expense' as const, date: e.date, e })),
    ...donations.data.map((d) => ({ kind: 'donation' as const, date: d.date, d })),
  ].sort((a, b) => b.date.localeCompare(a.date)); // stable: keeps each list's own order

  const donationsCents = total(donations.data);
  const expensesCents = total(expenses.data);
  const netCents = donationsCents - expensesCents;

  return (
    <>
      <section className="stats">
        <div>
          <span className="muted">Entrate</span>
          <Money cents={donationsCents} sign="in" />
        </div>
        <div>
          <span className="muted">Uscite</span>
          <Money cents={expensesCents} sign="out" />
        </div>
        <div>
          <span className="muted">Differenza</span>
          <Money cents={Math.abs(netCents)} sign={netCents < 0 ? 'out' : 'in'} />
        </div>
      </section>
      {rows.length === 0 ? (
        <p className="muted">Nessun movimento nel periodo.</p>
      ) : (
        <ul className="list">
          {rows.map((r) =>
            r.kind === 'expense' ? (
              <ExpenseRow key={`e${r.e.id}`} e={r.e} back={back} />
            ) : (
              <DonationRow key={`d${r.d.id}`} d={r.d} back={back} />
            ),
          )}
        </ul>
      )}
    </>
  );
}
