import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { api } from '../api';
import { PageHeader } from '../components';
import { useMe } from '../hooks';

export function MorePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const logout = async () => {
    await api.post('/auth/logout');
    // Update 'me' in place (App is subscribed to it) instead of clearing the whole
    // cache, which would detach App's subscription and leave the page unchanged.
    qc.setQueryData(['me'], null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    navigate('/', { replace: true });
  };

  return (
    <>
      <PageHeader title="Altro" />
      <ul className="menu">
        <li><Link to="/categorie">Categorie di spesa</Link></li>
        <li><Link to="/gatti">Gatti</Link></li>
        {me?.isAdmin && <li><Link to="/utenti">Utenti</Link></li>}
        <li><Link to="/impostazioni">Saldo iniziale</Link></li>
        <li><button className="link" onClick={logout}>Esci</button></li>
      </ul>
    </>
  );
}
