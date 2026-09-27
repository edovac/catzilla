import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../api';
import { PageHeader } from '../components';
import { useMe } from '../hooks';

export function MorePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const logout = async () => {
    await api.post('/auth/logout');
    qc.clear();
    qc.setQueryData(['me'], null);
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
