import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, type Cat } from '../api';
import { ErrorBox, Loading, PageHeader } from '../components';
import { useCats, useSave } from '../hooks';

export function CatsPage() {
  const cats = useCats();
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const create = useSave((body: { name: string; notes: string }) => api.post<Cat>('/cats', body));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate({ name, notes }, { onSuccess: () => (setName(''), setNotes('')) });
  };

  if (cats.isPending) return <Loading />;
  if (cats.error) return <ErrorBox error={cats.error} />;
  const visible = cats.data.filter((c) => showArchived || !c.archivedAt);

  return (
    <>
      <PageHeader title="Gatti" />
      <label className="checkbox">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Mostra archiviati
      </label>
      {visible.length === 0 ? (
        <p className="muted">Nessun gatto.</p>
      ) : (
        <ul className="list">
          {visible.map((c) => (
            <li key={c.id} className={c.archivedAt ? 'archived' : ''}>
              <Link to={`/gatti/${c.id}`}>
                <div>
                  <strong>{c.name}</strong>
                  <span className="muted">
                    {c.archivedAt && 'archiviato'}
                    {c.archivedAt && c.notes && ' · '}
                    {c.notes}
                  </span>
                </div>
                <span aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <form className="form inline-form" onSubmit={submit}>
        <h2>Aggiungi un gatto</h2>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Note
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <ErrorBox error={create.error} />
        <button className="primary" disabled={create.isPending}>Aggiungi</button>
      </form>
    </>
  );
}
