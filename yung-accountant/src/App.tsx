;
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import CalendarTransactions from './pages/CalendarTransactions';
import Transactions from './pages/Transactions';
import Wallets from './pages/Wallets';
import Categories from './pages/Categories';
import Goals from './pages/Goals';
import Debts from './pages/Debts';
import Habits from './pages/Habits';
import Community from './pages/Community';
import SimulationCalendar from './pages/SimulationCalendar';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<CalendarTransactions />} />
          <Route path="categories" element={<Categories />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="wallets" element={<Wallets />} />
          <Route path="goals" element={<Goals />} />
          <Route path="debts" element={<Debts />} />
          <Route path="habits" element={<Habits />} />
          <Route path="community" element={<Community />} />
          <Route path="simulation" element={<SimulationCalendar />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;