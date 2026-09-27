import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { api, paymentMethods, type Donation, type DonationInput, type PaymentMethod } from '../api';
import { DeletedBanner, ErrorBox, Loading, PageHeader } from '../components';
import { centsToInput, parseEuro, today } from '../format';
import { useSave } from '../hooks';
import type { BackState } from './EntriesPage';

export function DonationFormPage() {
  const id = useParams().id;
  const navigate = useNavigate();
  const back = (useLocation().state as BackState | null)?.back ?? '/movimenti?tipo=donazioni';
  const existing = useQuery({
    queryKey: ['donation', id],
    queryFn: () => api.get<Donation>(`/donations/${id}`),
    enabled: !!id,
  });

  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [donor, setDonor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const d = existing.data;
    if (!d) return;
    setDate(d.date);
    setAmount(centsToInput(d.amountCents));
    setDonor(d.donor ?? '');
    setPaymentMethod(d.paymentMethod);
    setNotes(d.notes ?? '');
  }, [existing.data]);

  const save = useSave((body: DonationInput) =>
    id ? api.put<Donation>(`/donations/${id}`, body) : api.post<Donation>('/donations', body),
  );
  const remove = useSave(() => api.del<Donation>(`/donations/${id}`));
  const restore = useSave(() => api.post<Donation>(`/donations/${id}/restore`));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amountCents = parseEuro(amount);
    if (!amountCents || amountCents <= 0) return setFormError("Inserisci un importo maggiore di zero");
    setFormError('');
    save.mutate(
      { date, amountCents, donor, paymentMethod, notes },
      { onSuccess: () => navigate(back) },
    );
  };

  if (id && existing.isPending) return <Loading />;
  if (existing.error) return <ErrorBox error={existing.error} />;
  const deleted = !!existing.data?.deletedAt;

  return (
    <>
      <PageHeader
        title={id ? 'Donazione' : 'Nuova donazione'}
        action={id && <Link className="button" to={`/storico/donation/${id}`}>Storico</Link>}
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
            Donatore
            <input value={donor} onChange={(e) => setDonor(e.target.value)} placeholder="Vuoto = anonimo" />
          </label>
          <label>
            Metodo di pagamento
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {Object.entries(paymentMethods).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
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
