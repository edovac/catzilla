import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { api, query, type Cat, type CatReport } from '../api';
import { ErrorBox, Loading, Money, PageHeader, PeriodPicker } from '../components';
import { formatDate } from '../format';
import { useSave } from '../hooks';
import { periodRange, type Period } from '../period';

export function CatPage() {
  const id = useParams().id;
  const [period, setPeriod] = useState<Period>({ kind: 'all' });
  const q = query(periodRange(period));
  const report = useQuery({
    queryKey: ['report-cat', id, q],
    queryFn: () => api.get<CatReport>(`/reports/cats/${id}${q}`),
  });
  const [editing, setEditing] = useState(false);

  const archive = useSave((archived: boolean) =>
    api.post<Cat>(`/cats/${id}/${archived ? 'archive' : 'restore'}`),
  );

  if (report.isPending) return <Loading />;
  if (report.error) return <ErrorBox error={report.error} />;
  const { cat, expenses, byCategory, totalCents } = report.data;

  return (
    <>
      <PageHeader
        title={cat.name}
        action={
          <div className="row-actions">
            <Link className="button" to={`/storico/cat/${cat.id}`}>Storico</Link>
            <button onClick={() => setEditing(!editing)}>{editing ? 'Chiudi' : 'Modifica'}</button>
          </div>
        }
      />
      {cat.archivedAt && <p className="banner">Archiviato: non viene proposto per le nuove spese.</p>}
      {cat.notes && !editing && <p className="muted">{cat.notes}</p>}
      {editing && <CatEditForm cat={cat} onDone={() => setEditing(false)} />}
      {editing && (
        <div className="stack">
          <button onClick={() => archive.mutate(!cat.archivedAt)} disabled={archive.isPending}>
            {cat.archivedAt ? 'Ripristina' : 'Archivia'}
          </button>
          <ErrorBox error={archive.error} />
        </div>
      )}

      <h2>Spese</h2>
      <div className="filters">
        <PeriodPicker value={period} onChange={setPeriod} allowAll />
      </div>
      <p className="total">Totale: <Money cents={totalCents} /></p>
      {byCategory.length > 0 && (
        <dl className="breakdown">
          {byCategory.map((c) => (
            <div key={c.categoryId} className="row">
              <dt>{c.name}</dt>
              <dd><Money cents={c.totalCents} /></dd>
            </div>
          ))}
        </dl>
      )}
      {expenses.length === 0 ? (
        <p className="muted">Nessuna spesa nel periodo.</p>
      ) : (
        <ul className="list">
          {expenses.map((e) => (
            <li key={e.id}>
              <Link to={`/spese/${e.id}`}>
                <div>
                  <strong>{e.description}</strong>
                  <span className="muted">{formatDate(e.date)} · {e.categoryName}</span>
                </div>
                <Money cents={e.amountCents} sign="out" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function CatEditForm({ cat, onDone }: { cat: Cat; onDone: () => void }) {
  const [name, setName] = useState(cat.name);
  const [notes, setNotes] = useState(cat.notes ?? '');
  useEffect(() => (setName(cat.name), setNotes(cat.notes ?? '')), [cat]);
  const save = useSave((body: { name: string; notes: string }) => api.patch<Cat>(`/cats/${cat.id}`, body));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ name, notes }, { onSuccess: onDone });
  };
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Nome
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Note
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      <ErrorBox error={save.error} />
      <button className="primary" disabled={save.isPending}>Salva</button>
    </form>
  );
}
