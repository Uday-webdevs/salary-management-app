import { lazy, Suspense, useEffect, useState } from 'react';
import { Building2, ChevronDown, Command, LayoutDashboard, LogOut, Search, UsersRound } from 'lucide-react';
import { ApiError, api } from './services/api';
import type { AuthSession } from './types/api';

const Dashboard = lazy(() => import('./features/Dashboard'));
const Employees = lazy(() => import('./features/Employees'));

type Page = 'dashboard' | 'employees';
type AuthState = 'loading' | 'signed-out' | 'ready' | 'error';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);

  const loadSession = () => {
    setAuthState('loading');
    void api.authSession().then((value) => {
      setSession(value);
      setAuthState('ready');
    }).catch((error: unknown) => {
      setSession(null);
      setAuthState(error instanceof ApiError && error.status === 401 ? 'signed-out' : 'error');
    });
  };

  useEffect(() => { loadSession(); }, []);

  if (authState === 'loading') return <div className="auth-state" role="status">Checking your sign-in…</div>;
  if (authState === 'signed-out') return <SignInPage onRetry={loadSession} />;
  if (authState === 'error' || !session) return <AuthMessage title="We couldn’t verify your sign-in" message="The server did not confirm your session. You can try again or continue to your organization sign-in.">
    <div className="auth-actions"><a className="button button-primary" href="/api/auth/login"><Building2 size={16}/> Continue with Microsoft</a><button className="button button-secondary" onClick={loadSession}>Try again</button></div>
  </AuthMessage>;
  if (!session.permissions.readEmployeeData) return <AuthMessage title="Access not assigned" message="You’re signed in, but your account doesn’t have an HR workspace role. Ask your administrator to assign Salary reader or Salary editor."><a className="button button-secondary" href="/api/auth/logout"><LogOut size={15}/> Sign out</a></AuthMessage>;

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setPage('dashboard'); }}><span className="brand-mark"><Command size={19}/></span><span>people<span className="brand-os">OS</span></span></a>
      <div className="workspace-switch"><div className="workspace-avatar">HR</div><div><strong>People workspace</strong><small>Compensation</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        <button className={`nav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}><LayoutDashboard size={18}/><span>Dashboard</span></button>
        <button className={`nav-item ${page === 'employees' ? 'active' : ''}`} onClick={() => setPage('employees')}><UsersRound size={18}/><span>Employees</span></button>
      </nav>
      <div className="sidebar-bottom"><div className="user-profile"><span className="workspace-avatar"><Command size={15}/></span><span className="user-info"><strong>{session.user.name}</strong><small>{session.permissions.editCompensation ? 'Compensation editor' : 'Read-only access'}</small></span></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumbs"><span>People</span><span className="crumb-divider">/</span><strong>{page === 'dashboard' ? 'Dashboard' : 'Employees'}</strong></div>
        <div className="topbar-actions">
          <button className="top-search" onClick={() => setPage('employees')}><Search size={15}/><span>Search employees</span><kbd>⌘ K</kbd></button>
          <a className="auth-action" href="/api/auth/logout" aria-label={`Sign out ${session.user.name}`}><LogOut size={15}/><span>Sign out</span></a>
        </div>
      </header>
      {session.mode === 'development' && <div className="auth-mode-notice" role="status"><strong>Local development sign-in is active.</strong> To test Microsoft SSO, set <code>AUTH_MODE=oidc</code> in <code>server/.env</code> and restart the API.</div>}
      <Suspense fallback={<div className="page-loading" role="status">Loading workspace…</div>}>
        {page === 'dashboard' ? <Dashboard key="dashboard"/> : <Employees key="employees" canEditCompensation={session.permissions.editCompensation} canViewSalaryHistory={session.permissions.viewSalaryHistory}/>}
      </Suspense>
      <footer className="app-footer"><span><span className="footer-dot"/>Internal HR workspace</span><span>PeopleOS · Compensation management</span></footer>
    </main>
  </div>;
}

function SignInPage({ onRetry }: { onRetry: () => void }) {
  return <AuthMessage title="Sign in to PeopleOS" message="Use your organization’s Microsoft account to access employee and compensation information.">
    <div className="auth-actions"><a className="button button-primary auth-ms-button" href="/api/auth/login"><Building2 size={16}/> Continue with Microsoft</a><button className="auth-retry" onClick={onRetry}>Check sign-in again</button></div>
    <p className="auth-help">If sign-in doesn’t start, confirm the API is running with <code>AUTH_MODE=oidc</code> and that this app’s callback URL is registered in Microsoft Entra ID.</p>
  </AuthMessage>;
}

function AuthMessage({ title, message, children }: { title: string; message: string; children: React.ReactNode }) {
  return <main className="auth-state"><section className="auth-card"><span className="brand-mark"><Command size={19}/></span><p className="eyebrow">PEOPLEOS · HR WORKSPACE</p><h1>{title}</h1><p>{message}</p>{children}</section></main>;
}
