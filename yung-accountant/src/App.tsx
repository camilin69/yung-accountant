// App.tsx
import { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useUserStore } from './store/user.store';
import { useCategoryStore } from './store/category.store';
import { useDebtStore } from './store/debt.store';

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

function App() {
  const { isAuthenticated, initialize, isInitialized, isLoading } = useUserStore();
  const { fetchAllCategories } = useCategoryStore();
  const { fetchDebts } = useDebtStore();

  const authInitialized = useRef(false);
  const categoriesLoaded = useRef(false);
  const debtsLoaded = useRef(false);

  useEffect(() => {
    if (!authInitialized.current && !isInitialized) {
      authInitialized.current = true;
      initialize();
    }
  }, [initialize, isInitialized]);

  useEffect(() => {
    if (!categoriesLoaded.current && isAuthenticated) {
      categoriesLoaded.current = true;
      fetchAllCategories();
    }
  }, [isAuthenticated, fetchAllCategories]);

  useEffect(() => {
    if (!debtsLoaded.current && isAuthenticated) {
      debtsLoaded.current = true;
      fetchDebts();
    }
  }, [isAuthenticated, fetchDebts]);

  if (!isInitialized || isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Rutas públicas */}
            <Route 
              path="/" 
              element={!isAuthenticated ? <Home /> : <Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/login" 
              element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/register" 
              element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />} 
            />
            
            {/* Rutas protegidas */}
            <Route 
              path="/" 
              element={isAuthenticated ? <Layout /> : <Navigate to="/" replace />}
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="calendar" element={<CalendarTransactions />} />
              <Route path="categories" element={<Categories />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="wallets" element={<Wallets />} />
              <Route path="goals" element={<Goals />} />
              <Route path="debts" element={<Debts />} />
              <Route path="habits" element={<Habits />} />
              <Route path="community" element={<Community />} />
              <Route path="simulation" element={<Simulation />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<Help />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;