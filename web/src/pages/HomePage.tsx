import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, type Balance } from '../api';
import { ErrorBox, Loading, Money } from '../components';
import { formatDate } from '../format';

export function HomePage() {
  const { data, error, isPending } = useQuery({
    queryKey: ['balance'],
    queryFn: () => api.get<Balance>('/reports/balance'),
  });

  return (
    <>
      <section className="card balance">
        <p className="muted">Fondi disponibili</p>
        {isPending ? <Loading /> : data && <p className="big"><Money cents={data.balanceCents} /></p>}
        <ErrorBox error={error} />
        {data && (
          <dl className="breakdown">
            <dt>
              Saldo iniziale
              {data.openingBalanceDate && ` (${formatDate(data.openingBalanceDate)})`}
            </dt>
            <dd>
              {data.openingBalanceCents === null ? (
                <Link to="/impostazioni">da impostare</Link>
              ) : (
                <Money cents={data.openingBalanceCents} />
              )}
            </dd>
            <dt>Donazioni</dt>
            <dd><Money cents={data.donationsCents} sign="in" /></dd>
            <dt>Spese</dt>
            <dd><Money cents={data.expensesCents} sign="out" /></dd>
          </dl>
        )}
      </section>
      <div className="actions">
        <Link className="button primary" to="/spese/nuova">+ Spesa</Link>
        <Link className="button" to="/donazioni/nuova">+ Donazione</Link>
      </div>
    </>
  );
}
