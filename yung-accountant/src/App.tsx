import { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useUserStore } from './store/user.store';
import { WholePost } from './pages/Community/WholePost';

// Lazy load pages
const Layout = lazy(() => import('./components/layout/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CalendarTransactions = lazy(() => import('./pages/Calendar'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Wallets = lazy(() => import('./pages/Wallets'));
const Categories = lazy(() => import('./pages/Categories'));
const Goals = lazy(() => import('./pages/Goals'));
const Debts = lazy(() => import('./pages/Debts'));
const Habits = lazy(() => import('./pages/Habits'));
const Community = lazy(() => import('./pages/Community'));
const Simulation = lazy(() => import('./pages/Simulation'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Help = lazy(() => import('./pages/Help'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/60 text-sm font-light">Cargando...</p>
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
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={!isAuthenticated ? <Home /> : <Navigate to="/dashboard" replace />} />
              <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
              <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />} />
              
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
          </Suspense>
        </AuthListener>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;