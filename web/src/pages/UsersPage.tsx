import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api, type User } from '../api';
import { ErrorBox, Loading, PageHeader } from '../components';
import { useMe, useSave } from '../hooks';

export function UsersPage() {
  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get<User[]>('/users') });
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const create = useSave((body: { email: string; name: string; isAdmin: boolean }) =>
    api.post<User>('/users', body),
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate({ email, name, isAdmin }, { onSuccess: () => (setEmail(''), setName(''), setIsAdmin(false)) });
  };

  if (users.isPending) return <Loading />;
  if (users.error) return <ErrorBox error={users.error} />;

  return (
    <>
      <PageHeader title="Utenti" />
      <p className="muted">Gli utenti non si cancellano: si disabilitano, così lo storico continua a riferirsi a loro.</p>
      <ul className="list">
        {users.data.map((u) => (
          <UserRow key={u.id} user={u} />
        ))}
      </ul>
      <form className="form inline-form" onSubmit={submit}>
        <h2>Nuovo utente</h2>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email (account Google)
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          Amministratore
        </label>
        <ErrorBox error={create.error} />
        <button className="primary" disabled={create.isPending}>Aggiungi</button>
      </form>
    </>
  );
}

function UserRow({ user: u }: { user: User }) {
  const { data: me } = useMe();
  const update = useSave((body: Partial<Pick<User, 'isAdmin' | 'enabled'>>) =>
    api.patch<User>(`/users/${u.id}`, body),
  );
  return (
    <li className={u.enabled ? '' : 'archived'}>
      <div className="row">
        <div>
          <strong>
            {u.name}
            {u.id === me?.id && ' (tu)'}
          </strong>
          <span className="muted">
            {u.email}
            {u.isAdmin && ' · amministratore'}
            {!u.enabled && ' · disabilitato'}
          </span>
        </div>
        <div className="row-actions">
          <button onClick={() => update.mutate({ isAdmin: !u.isAdmin })} disabled={update.isPending}>
            {u.isAdmin ? 'Togli admin' : 'Rendi admin'}
          </button>
          <button onClick={() => update.mutate({ enabled: !u.enabled })} disabled={update.isPending}>
            {u.enabled ? 'Disabilita' : 'Riabilita'}
          </button>
        </div>
      </div>
      <ErrorBox error={update.error} />
    </li>
  );
}
