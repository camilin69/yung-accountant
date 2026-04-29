import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
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
import Simulation from './pages/Simulation';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import { useUserStore } from './store';

function App() {
  const { user } = useUserStore();

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={!user ? <Home /> : <Navigate to="/dashboard" replace />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
          
          {/* Rutas protegidas */}
          <Route path="/" element={user ? <Layout /> : <Navigate to="/" replace />}>
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
            <Route path="profile/:userId" element={<Profile />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;