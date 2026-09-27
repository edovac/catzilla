import { NavLink, Navigate, Route, Routes } from 'react-router';
import { Loading } from './components';
import { useMe } from './hooks';
import { CategoriesPage } from './pages/CategoriesPage';
import { CatPage } from './pages/CatPage';
import { CatsPage } from './pages/CatsPage';
import { DonationFormPage } from './pages/DonationFormPage';
import { EntriesPage } from './pages/EntriesPage';
import { ExpenseFormPage } from './pages/ExpenseFormPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MorePage } from './pages/MorePage';
import { ReportPage } from './pages/ReportPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';

const nav = [
  { to: '/', label: 'Saldo', icon: '€' },
  { to: '/movimenti', label: 'Movimenti', icon: '⇅' },
  { to: '/report', label: 'Report', icon: '▤' },
  { to: '/gatti', label: 'Gatti', icon: '🐈' },
  { to: '/altro', label: 'Altro', icon: '☰' },
];

export function App() {
  const { data: me, isPending, error } = useMe();
  if (isPending) return <main className="content"><Loading /></main>;
  if (error) return <main className="content"><p className="error">Server non raggiungibile.</p></main>;
  if (!me) return <LoginPage />;

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">CatZilla</span>
        <span className="muted">{me.name}</span>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movimenti" element={<EntriesPage />} />
          <Route path="/donazioni/nuova" element={<DonationFormPage />} />
          <Route path="/donazioni/:id" element={<DonationFormPage />} />
          <Route path="/spese/nuova" element={<ExpenseFormPage />} />
          <Route path="/spese/:id" element={<ExpenseFormPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/gatti" element={<CatsPage />} />
          <Route path="/gatti/:id" element={<CatPage />} />
          <Route path="/storico/:entity/:id" element={<HistoryPage />} />
          <Route path="/categorie" element={<CategoriesPage />} />
          <Route path="/impostazioni" element={<SettingsPage />} />
          <Route path="/altro" element={<MorePage />} />
          {me.isAdmin && <Route path="/utenti" element={<UsersPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="tabbar">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}>
            <span className="icon" aria-hidden>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
