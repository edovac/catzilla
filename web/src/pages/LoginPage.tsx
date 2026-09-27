import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import { ErrorBox, Loading } from '../components';

// POC only: pick a user, no password. Google login replaces this.
export function LoginPage() {
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ['dev-users'],
    queryFn: () => api.get<{ id: number; name: string; email: string }[]>('/auth/dev-users'),
  });
  const [error, setError] = useState<unknown>(null);

  const login = async (userId: number) => {
    try {
      await api.post('/auth/dev-login', { userId });
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      setError(e);
    }
  };

  return (
    <main className="content login">
      <h1 className="brand">CatZilla</h1>
      <p className="muted">Accesso di sviluppo: scegli un utente.</p>
      {users.isPending && <Loading />}
      <ErrorBox error={users.error ?? error} />
      <div className="stack">
        {users.data?.map((u) => (
          <button key={u.id} className="card-button" onClick={() => login(u.id)}>
            <strong>{u.name}</strong>
            <span className="muted">{u.email}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
