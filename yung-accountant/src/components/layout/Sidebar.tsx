// components/layout/Sidebar.tsx

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { 
  LayoutDashboard, 
  Calendar, 
  Receipt, 
  Target, 
  HandCoins, 
  CheckSquare, 
  Users, 
  TrendingUp,
  Wallet,
  Flame,
  ChevronLeft,
  ChevronRight,
  Tag,
  Sparkles
} from 'lucide-react';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: '#6366F1' },
  { path: '/calendar', icon: Calendar, label: 'Calendar', color: '#EC4899' },
  { path: '/transactions', icon: Receipt, label: 'Transactions', color: '#10B981' },
  { path: '/goals', icon: Target, label: 'Goals', color: '#F59E0B' },
  { path: '/debts', icon: HandCoins, label: 'Debts', color: '#EF4444' },
  { path: '/habits', icon: CheckSquare, label: 'Habits', color: '#14B8A6' },
  { path: '/categories', icon: Tag, label: 'Categories', color: '#8B5CF6' },
  { path: '/community', icon: Users, label: 'Community', color: '#A855F7' },
  { path: '/simulation', icon: TrendingUp, label: 'Simulation', color: '#EC4899' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { transactions, goals } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null && window.innerWidth >= 1024) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  const totalIncome = transactions.filter(t => {
    const cat = useStore.getState().categories.find(c => c.id === t.categoryId);
    return cat?.type === 'income';
  }).reduce((s, t) => s + t.amount, 0);

  const totalExpenses = transactions.filter(t => {
    const cat = useStore.getState().categories.find(c => c.id === t.categoryId);
    return cat?.type === 'expense';
  }).reduce((s, t) => s + t.amount, 0);

  const balance = totalIncome - totalExpenses;
  const activeGoals = goals.filter(g => g.status === 'active').length;

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  // Mobile sidebar
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    return (
      <>
        {isMobileOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsMobileOpen(false)} />
        )}
        <aside className={`fixed top-0 left-0 h-full w-64 bg-white/[0.03] backdrop-blur-xl border-r border-white/10 z-50 transform transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-light text-white">Yung Accountant</span>
            </div>
            <button onClick={() => setIsMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </button>
          </div>
          <SidebarContent isCollapsed={false} balance={balance} activeGoals={activeGoals} totalIncome={totalIncome} totalExpenses={totalExpenses} location={location} onClose={() => setIsMobileOpen(false)} />
        </aside>
      </>
    );
  }

  return (
    <aside className={`hidden lg:flex flex-col bg-white/[0.03] backdrop-blur-sm border-r border-white/10 transition-all duration-300 h-full ${isCollapsed ? 'w-[72px]' : 'w-64'}`}>
      {/* Toggle button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-gradient-to-r from-[#6366F1] to-[#EC4899] flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 z-10"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-white" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-white" />
        )}
      </button>

      <SidebarContent isCollapsed={isCollapsed} balance={balance} activeGoals={activeGoals} totalIncome={totalIncome} totalExpenses={totalExpenses} location={location} />
    </aside>
  );
};

const SidebarContent: React.FC<{
  isCollapsed: boolean;
  balance: number;
  activeGoals: number;
  totalIncome: number;
  totalExpenses: number;
  location: any;
  onClose?: () => void;
}> = ({ isCollapsed, balance, activeGoals, totalIncome, totalExpenses, location, onClose }) => {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  let emoji = '🌅';
  if (hour >= 12 && hour < 18) { greeting = 'Good afternoon'; emoji = '☀️'; }
  else if (hour >= 18) { greeting = 'Good evening'; emoji = '🌙'; }

  return (
    <>
      {/* User section */}
      <div className={`p-4 border-b border-white/10 ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl blur-sm opacity-50" />
                <div className="relative w-10 h-10 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl flex items-center justify-center text-sm font-light">
                  YN
                </div>
              </div>
              <div>
                <h3 className="text-sm font-light text-white">Yung Nigga</h3>
                <p className="text-[10px] text-white/40">Free Plan</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/40 mb-3">
              <span>{emoji}</span>
              <span>{greeting}, Yung!</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.03] rounded-lg p-2 text-center backdrop-blur-sm border border-white/5">
                <Wallet className="w-3 h-3 text-[#6366F1] mx-auto mb-1" />
                <p className="text-[9px] text-white/40">Balance</p>
                <p className="text-xs font-light text-[#6366F1]">{formatCurrency(balance)}</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-2 text-center backdrop-blur-sm border border-white/5">
                <Target className="w-3 h-3 text-[#F59E0B] mx-auto mb-1" />
                <p className="text-[9px] text-white/40">Goals</p>
                <p className="text-xs font-light text-[#F59E0B]">{activeGoals}</p>
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="relative w-10 h-10 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl blur-sm opacity-50" />
              <div className="relative w-10 h-10 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl flex items-center justify-center text-sm font-light">
                YN
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="text-xs font-light text-[#6366F1]">{formatCurrency(balance)}</div>
              <div className="text-[8px] text-white/30">Balance</div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive: active }) =>
                  `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg transition-all duration-300 group relative ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5" style={{ color: isActive ? item.color : 'currentColor' }} />
                {!isCollapsed && <span className="text-sm font-light">{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-white/10 backdrop-blur-sm text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Monthly summary */}
      <div className={`p-4 border-t border-white/10 ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-3 h-3 text-orange-500" />
              <p className="text-[9px] font-light text-white/40 uppercase tracking-wider">Monthly Summary</p>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Income</span>
                <span className="text-green-500/80">+{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Expenses</span>
                <span className="text-red-500/80">-{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="flex justify-between font-light">
                <span className="text-white/60">Net</span>
                <span className={balance >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="relative group">
            <Flame className="w-4 h-4 text-orange-500 mx-auto" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-white/10 backdrop-blur-sm text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Monthly Summary
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;