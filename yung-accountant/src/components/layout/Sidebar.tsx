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
  ChevronRight
} from 'lucide-react';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: '#6C63FF' },
  { path: '/calendar', icon: Calendar, label: 'Calendar', color: '#FF6584' },
  { path: '/transactions', icon: Receipt, label: 'Transactions', color: '#00D26A' },
  { path: '/goals', icon: Target, label: 'Goals', color: '#FFB347' },
  { path: '/debts', icon: HandCoins, label: 'Debts', color: '#FF4757' },
  { path: '/habits', icon: CheckSquare, label: 'Habits', color: '#4ECDC4' },
  { path: '/community', icon: Users, label: 'Community', color: '#A855F7' },
  { path: '/simulations', icon: TrendingUp, label: 'Simulate', color: '#EC4899' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { transactions, goals } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  const totalIncome = transactions.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  const activeGoals = goals.filter(g => g.status === 'active').length;

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  // Mobile sidebar (slide from left)
  const handleMobileOpen = () => setIsMobileOpen(true);
  const handleMobileClose = () => setIsMobileOpen(false);

  // Expose mobile open function to navbar via window event
  useEffect(() => {
    const handleMobileToggle = () => setIsMobileOpen(prev => !prev);
    window.addEventListener('mobile-sidebar-toggle', handleMobileToggle);
    return () => window.removeEventListener('mobile-sidebar-toggle', handleMobileToggle);
  }, []);

  // Desktop sidebar
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    return (
      <aside 
        className={`relative hidden lg:flex flex-col bg-[#1A1A2E] border-r border-white/10 transition-all duration-300 h-full ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Toggle button - positioned at the right edge of sidebar */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584] flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-white" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-white" />
          )}
        </button>

        {/* User section */}
        <div className={`p-4 border-b border-white/10 ${isCollapsed ? 'text-center' : ''}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#6C63FF] to-[#FF6584] rounded-xl flex items-center justify-center text-lg font-bold">
                  YN
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Yung Nigga</h3>
                  <p className="text-xs text-gray-500">Free Plan</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0F0F1A] rounded-lg p-2 text-center">
                  <Wallet className="w-3 h-3 text-[#6C63FF] mx-auto mb-1" />
                  <p className="text-[10px] text-gray-500">Balance</p>
                  <p className="text-xs font-bold text-[#6C63FF]">{formatCurrency(balance)}</p>
                </div>
                <div className="bg-[#0F0F1A] rounded-lg p-2 text-center">
                  <Target className="w-3 h-3 text-[#FFB347] mx-auto mb-1" />
                  <p className="text-[10px] text-gray-500">Goals</p>
                  <p className="text-xs font-bold text-[#FFB347]">{activeGoals}</p>
                </div>
              </div>
            </>
          ) : (
            <div>
              <div className="w-10 h-10 bg-gradient-to-br from-[#6C63FF] to-[#FF6584] rounded-xl flex items-center justify-center text-lg font-bold mx-auto">
                YN
              </div>
              <div className="mt-2 text-center">
                <div className="text-xs font-bold text-[#6C63FF]">{formatCurrency(balance)}</div>
                <div className="text-[9px] text-gray-500">Balance</div>
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
                  className={({ isActive: active }) =>
                    `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg transition-all duration-200 group relative ${
                      active
                        ? 'bg-[#6C63FF]/10 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
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
                <p className="text-[10px] font-semibold text-gray-500 uppercase">Monthly Summary</p>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Income</span>
                  <span className="text-green-500">+{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expenses</span>
                  <span className="text-red-500">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="h-px bg-white/10 my-1" />
                <div className="flex justify-between font-medium">
                  <span>Net</span>
                  <span className={balance >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="relative group">
              <Flame className="w-4 h-4 text-orange-500 mx-auto" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                Monthly Summary
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Mobile sidebar (slide from left)
  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={handleMobileClose} />
      )}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#1A1A2E] z-50 transform transition-transform duration-300 lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">YA</span>
            </div>
            <span className="font-semibold text-sm">Yung Accountant</span>
          </div>
          <button onClick={handleMobileClose} className="p-2 rounded-lg hover:bg-white/5">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile user section */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#6C63FF] to-[#FF6584] rounded-xl flex items-center justify-center text-lg font-bold">
              YN
            </div>
            <div>
              <h3 className="font-semibold text-sm">Yung Nigga</h3>
              <p className="text-xs text-gray-500">Free Plan</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0F0F1A] rounded-lg p-2 text-center">
              <Wallet className="w-3 h-3 text-[#6C63FF] mx-auto mb-1" />
              <p className="text-[10px] text-gray-500">Balance</p>
              <p className="text-xs font-bold text-[#6C63FF]">{formatCurrency(balance)}</p>
            </div>
            <div className="bg-[#0F0F1A] rounded-lg p-2 text-center">
              <Target className="w-3 h-3 text-[#FFB347] mx-auto mb-1" />
              <p className="text-[10px] text-gray-500">Goals</p>
              <p className="text-xs font-bold text-[#FFB347]">{activeGoals}</p>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleMobileClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#6C63FF]/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Mobile summary */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-3 h-3 text-orange-500" />
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Monthly Summary</p>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Income</span>
              <span className="text-green-500">+{formatCurrency(totalIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Expenses</span>
              <span className="text-red-500">-{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex justify-between font-medium">
              <span>Net</span>
              <span className={balance >= 0 ? 'text-green-500' : 'text-red-500'}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;