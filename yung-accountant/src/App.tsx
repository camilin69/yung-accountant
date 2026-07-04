import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useUserStore } from './store/user.store';

// Direct imports — no lazy loading. All pages bundled upfront.
// Trade-off: larger initial bundle, but every page works offline immediately.
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import CalendarTransactions from './pages/Calendar';
import Transactions from './pages/Transactions';
import Wallets from './pages/Wallets';
import Categories from './pages/Categories';
import Goals from './pages/Goals';
import Debts from './pages/Debts';
import Habits from './pages/Habits';
import Community from './pages/Community';
import { WholePost } from './pages/Community/WholePost';
import Simulation from './pages/Simulation';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-background-primary)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--theme-primary)', borderTopColor: 'transparent' }} />
        <p className="text-sm font-light" style={{ color: 'var(--theme-text-tertiary)' }}>Cargando...</p>
      </div>
    </div>
  );
}

function AuthListener({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { logout } = useUserStore();

  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('[Auth] Unauthorized event received, redirecting to home');
      logout();
      navigate('/', { replace: true });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate, logout]);

  return <>{children}</>;
}

function App() {
  const { isAuthenticated, initialize, isInitialized, isLoading } = useUserStore();
  const authInitialized = useRef(false);

  useEffect(() => {
    if (!authInitialized.current && !isInitialized) {
      authInitialized.current = true;
      initialize();
    }
  }, [initialize, isInitialized]);

  if (!isInitialized || isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthListener>
          <Routes>
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Home />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

            <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/" replace />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="calendar" element={<CalendarTransactions />} />
              <Route path="categories" element={<Categories />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="wallets" element={<Wallets />} />
              <Route path="goals" element={<Goals />} />
              <Route path="debts" element={<Debts />} />
              <Route path="habits" element={<Habits />} />
              <Route path="community" element={<Community />} />
              <Route path="/community/post/:postId" element={<WholePost />} />
              <Route path="simulation" element={<Simulation />} />
              <Route path="profile/:username" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<Help />} />
            </Route>
          </Routes>
        </AuthListener>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;