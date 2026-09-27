import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, type Expense, type ExpenseInput } from '../api';
import { DeletedBanner, ErrorBox, Loading, PageHeader } from '../components';
import { centsToInput, parseEuro, today } from '../format';
import { useCategories, useCats, useSave } from '../hooks';

export function ExpenseFormPage() {
  const id = useParams().id;
  const navigate = useNavigate();
  const existing = useQuery({
    queryKey: ['expense', id],
    queryFn: () => api.get<Expense>(`/expenses/${id}`),
    enabled: !!id,
  });
  const categories = useCategories();
  const cats = useCats();

  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [catId, setCatId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const e = existing.data;
    if (!e) return;
    setDate(e.date);
    setAmount(centsToInput(e.amountCents));
    setCategoryId(String(e.categoryId));
    setDescription(e.description);
    setCatId(e.catId ? String(e.catId) : '');
    setSupplier(e.supplier ?? '');
    setNotes(e.notes ?? '');
  }, [existing.data]);

  const save = useSave((body: ExpenseInput) =>
    id ? api.put<Expense>(`/expenses/${id}`, body) : api.post<Expense>('/expenses', body),
  );
  const remove = useSave(() => api.del<Expense>(`/expenses/${id}`));
  const restore = useSave(() => api.post<Expense>(`/expenses/${id}/restore`));

  // Archived items are offered only if this expense already uses them.
  const categoryOptions = (categories.data ?? []).filter(
    (c) => !c.archivedAt || c.id === existing.data?.categoryId,
  );
  const catOptions = (cats.data ?? []).filter((c) => !c.archivedAt || c.id === existing.data?.catId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amountCents = parseEuro(amount);
    if (!amountCents || amountCents <= 0) return setFormError('Inserisci un importo maggiore di zero');
    setFormError('');
    save.mutate(
      {
        date,
        amountCents,
        categoryId: Number(categoryId),
        description,
        catId: catId ? Number(catId) : null,
        supplier,
        notes,
      },
      { onSuccess: () => navigate('/movimenti?tipo=spese') },
    );
  };

  if ((id && existing.isPending) || categories.isPending || cats.isPending) return <Loading />;
  const loadError = existing.error ?? categories.error ?? cats.error;
  if (loadError) return <ErrorBox error={loadError} />;
  const deleted = !!existing.data?.deletedAt;

  return (
    <>
      <PageHeader
        title={id ? 'Spesa' : 'Nuova spesa'}
        action={id && <Link className="button" to={`/storico/expense/${id}`}>Storico</Link>}
      />
      {deleted && <DeletedBanner onRestore={() => restore.mutate(undefined)} busy={restore.isPending} />}
      <form className="form" onSubmit={submit}>
        <fieldset disabled={deleted}>
          <label>
            Data
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Importo (€)
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus={!id}
            />
          </label>
          <label>
            Categoria
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="" disabled>Scegli…</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.archivedAt && ' (archiviata)'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Descrizione
            <input value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>
          <label>
            Gatto
            <select value={catId} onChange={(e) => setCatId(e.target.value)}>
              <option value="">Nessuno</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.archivedAt && ' (archiviato)'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fornitore / beneficiario
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </label>
          <label>
            Note
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </label>
        </fieldset>
        <ErrorBox error={formError ? new Error(formError) : (save.error ?? remove.error ?? restore.error)} />
        {!deleted && (
          <div className="actions">
            <button className="primary" disabled={save.isPending}>Salva</button>
            {id && (
              <button type="button" className="danger" disabled={remove.isPending} onClick={() => remove.mutate(undefined)}>
                Elimina
              </button>
            )}
          </div>
        )}
      </form>
    </>
  );
}
