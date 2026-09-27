import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, type Category } from '../api';
import { ErrorBox, Loading, PageHeader } from '../components';
import { useCategories, useSave } from '../hooks';

export function CategoriesPage() {
  const categories = useCategories();
  const [name, setName] = useState('');
  const create = useSave((body: { name: string }) => api.post<Category>('/categories', body));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate({ name }, { onSuccess: () => setName('') });
  };

  if (categories.isPending) return <Loading />;
  if (categories.error) return <ErrorBox error={categories.error} />;

  return (
    <>
      <PageHeader title="Categorie di spesa" />
      <p className="muted">
        Le categorie archiviate non vengono proposte per le nuove spese, ma restano sulle spese esistenti e nei
        report.
      </p>
      <ul className="list">
        {categories.data.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
      </ul>
      <form className="form inline-form" onSubmit={submit}>
        <h2>Nuova categoria</h2>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <ErrorBox error={create.error} />
        <button className="primary" disabled={create.isPending}>Aggiungi</button>
      </form>
    </>
  );
}

function CategoryRow({ category: c }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const rename = useSave((name: string) => api.patch<Category>(`/categories/${c.id}`, { name }));
  const archive = useSave((archived: boolean) =>
    api.post<Category>(`/categories/${c.id}/${archived ? 'archive' : 'restore'}`),
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    rename.mutate(name, { onSuccess: () => setEditing(false) });
  };

  return (
    <li className={c.archivedAt ? 'archived' : ''}>
      {editing ? (
        <form className="row-form" onSubmit={submit}>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus aria-label="Nome" />
          <button className="primary" disabled={rename.isPending}>Salva</button>
          <button type="button" onClick={() => (setEditing(false), setName(c.name))}>Annulla</button>
        </form>
      ) : (
        <div className="row">
          <div>
            <strong>{c.name}</strong>
            {c.archivedAt && <span className="muted">archiviata</span>}
          </div>
          <div className="row-actions">
            <Link className="button" to={`/storico/category/${c.id}`}>Storico</Link>
            <button onClick={() => setEditing(true)}>Rinomina</button>
            <button onClick={() => archive.mutate(!c.archivedAt)} disabled={archive.isPending}>
              {c.archivedAt ? 'Ripristina' : 'Archivia'}
            </button>
          </div>
        </div>
      )}
      <ErrorBox error={rename.error ?? archive.error} />
    </li>
  );
}
