import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { api, paymentMethods, type HistoryEntity, type HistoryEvent, type PaymentMethod } from '../api';
import { ErrorBox, Loading, PageHeader } from '../components';
import { formatDate, formatEuro } from '../format';

const titles: Record<HistoryEntity, string> = {
  donation: 'Storico donazione',
  expense: 'Storico spesa',
  category: 'Storico categoria',
  cat: 'Storico gatto',
};

// Past participles agree with the entity's gender (spesa, donazione, categoria are feminine).
const feminine = new Set<HistoryEntity>(['donation', 'expense', 'category']);
const actionLabels: Record<HistoryEvent['action'], [string, string]> = {
  create: ['Creato', 'Creata'],
  update: ['Modificato', 'Modificata'],
  delete: ['Eliminato', 'Eliminata'],
  restore: ['Ripristinato', 'Ripristinata'],
  archive: ['Archiviato', 'Archiviata'],
};

const fieldLabels: Record<string, string> = {
  date: 'Data',
  amountCents: 'Importo',
  donor: 'Donatore',
  paymentMethod: 'Metodo di pagamento',
  notes: 'Note',
  category: 'Categoria',
  description: 'Descrizione',
  cat: 'Gatto',
  supplier: 'Fornitore',
  name: 'Nome',
};

const timestamp = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' });

function formatValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'amountCents') return formatEuro(value as number);
  if (field === 'date') return formatDate(value as string);
  if (field === 'paymentMethod') return paymentMethods[value as PaymentMethod] ?? String(value);
  return String(value);
}

export function HistoryPage() {
  const { entity, id } = useParams() as { entity: HistoryEntity; id: string };
  const { data, error, isPending } = useQuery({
    queryKey: ['history', entity, id],
    queryFn: () => api.get<HistoryEvent[]>(`/history/${entity}/${id}`),
  });

  return (
    <>
      <PageHeader title={titles[entity] ?? 'Storico'} />
      {isPending && <Loading />}
      <ErrorBox error={error} />
      {data?.length === 0 && <p className="muted">Nessuna modifica registrata.</p>}
      <ol className="timeline">
        {data?.map((e) => (
          <li key={e.id}>
            <p>
              <strong>{actionLabels[e.action][feminine.has(entity) ? 1 : 0]}</strong>
              <span className="muted">
                {' '}
                {e.user ? `da ${e.user.name}` : 'dal sistema'} · {timestamp.format(new Date(e.at))}
              </span>
            </p>
            {e.changes.length > 0 && (
              <dl className="changes">
                {e.changes.map((ch) => (
                  <div key={ch.field}>
                    <dt>{fieldLabels[ch.field] ?? ch.field}</dt>
                    <dd>
                      {e.action === 'update' && (
                        <>
                          <del>{formatValue(ch.field, ch.old)}</del> →{' '}
                        </>
                      )}
                      {formatValue(ch.field, ch.new)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
