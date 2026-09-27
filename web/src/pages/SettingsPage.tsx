import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { api, type Settings } from '../api';
import { ErrorBox, Loading, Money, PageHeader } from '../components';
import { centsToInput, formatDate, parseEuro, today } from '../format';
import { useMe, useSave } from '../hooks';

export function SettingsPage() {
  const { data: me } = useMe();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<Settings>('/settings') });
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [formError, setFormError] = useState('');
  const save = useSave((body: Settings) => api.put<Settings>('/settings/opening-balance', body));

  useEffect(() => {
    if (settings.data?.openingBalanceCents != null) setAmount(centsToInput(settings.data.openingBalanceCents));
    if (settings.data?.openingBalanceDate) setDate(settings.data.openingBalanceDate);
  }, [settings.data]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cents = parseEuro(amount);
    if (cents === null) return setFormError('Importo non valido');
    setFormError('');
    save.mutate({ openingBalanceCents: cents, openingBalanceDate: date });
  };

  if (settings.isPending) return <Loading />;
  const current = settings.data;

  return (
    <>
      <PageHeader title="Saldo iniziale" />
      <p className="muted">
        Il saldo della cassa quando si è iniziato a usare CatZilla. Il saldo attuale è saldo iniziale +
        donazioni − spese.
      </p>
      {current?.openingBalanceCents != null && (
        <p>
          Attuale: <Money cents={current.openingBalanceCents} />
          {current.openingBalanceDate && ` al ${formatDate(current.openingBalanceDate)}`}
        </p>
      )}
      {me?.isAdmin ? (
        <form className="form" onSubmit={submit}>
          <label>
            Importo (€)
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label>
            Alla data
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <ErrorBox error={formError ? new Error(formError) : save.error} />
          {save.isSuccess && <p className="ok">Salvato.</p>}
          <button className="primary" disabled={save.isPending}>Salva</button>
        </form>
      ) : (
        <p className="muted">Solo un amministratore può modificarlo.</p>
      )}
    </>
  );
}
