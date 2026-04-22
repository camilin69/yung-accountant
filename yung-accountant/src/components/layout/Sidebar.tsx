// components/layout/Sidebar.tsx

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore, useTotalBalance, useGoalsAllocatedBalance, useDebtsBalance } from '../../store/useStore';
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
  ChevronLeft,
  ChevronRight,
  Tag,
  Sparkles,
  X
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: '#6366F1' },
  { path: '/calendar', icon: Calendar, label: 'Calendar', color: '#EC4899' },
  { path: '/transactions', icon: Receipt, label: 'Transactions', color: '#10B981' },
  { path: '/goals', icon: Target, label: 'Goals', color: '#F59E0B' },
  { path: '/debts', icon: HandCoins, label: 'Debts', color: '#EF4444' },
  { path: '/habits', icon: CheckSquare, label: 'Habits', color: '#14B8A6' },
  { path: '/categories', icon: Tag, label: 'Categories', color: '#8B5CF6' },
  { path: '/wallets', icon: Wallet, label: 'Wallets', color: '#10B981' },
  { path: '/community', icon: Users, label: 'Community', color: '#A855F7' },
  { path: '/simulation', icon: TrendingUp, label: 'Simulation', color: '#EC4899' },
];

const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const location = useLocation();
  const { transactions, goals } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const totalBalance = useTotalBalance();
  const allocatedToGoals = useGoalsAllocatedBalance();
  const { borrowed: totalBorrowed, lent: totalLent, net: netDebtPosition } = useDebtsBalance();
  const activeGoals = goals.filter(g => g.status === 'active').length;

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null && window.innerWidth >= 1024) {
      setIsCollapsed(JSON.parse(saved));
    }
    
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const totalIncome = transactions.filter(t => {
    const cat = useStore.getState().categories.find(c => c.id === t.categoryId);
    return cat?.type === 'income';
  }).reduce((s, t) => s + t.amount, 0);

  const totalExpenses = transactions.filter(t => {
    const cat = useStore.getState().categories.find(c => c.id === t.categoryId);
    return cat?.type === 'expense';
  }).reduce((s, t) => s + t.amount, 0);

  const netMonthly = totalIncome - totalExpenses;
  const availableBalance = totalBalance - allocatedToGoals;
  const realAvailableBalance = availableBalance + netDebtPosition;

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  // Versión móvil del sidebar (siempre expandido)
  if (isMobile) {
    return (
      <aside className="w-72 h-full bg-[#1A1A2E] backdrop-blur-xl border-r border-white/10 flex flex-col">
        {/* Mobile header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-light text-white">Yung Accountant</span>
          </div>
          <button onClick={onCloseMobile} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>
        
        <SidebarContent 
          isCollapsed={false}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          netMonthly={netMonthly}
          totalBalance={totalBalance}
          allocatedToGoals={allocatedToGoals}
          availableBalance={availableBalance}
          totalBorrowed={totalBorrowed}
          totalLent={totalLent}
          netDebtPosition={netDebtPosition}
          realAvailableBalance={realAvailableBalance}
          activeGoals={activeGoals}
          location={location}
          onLinkClick={handleLinkClick}
        />
      </aside>
    );
  }

  // Versión desktop (con colapso)
  return (
    <aside 
      className={`hidden lg:flex flex-col bg-[#1A1A2E] backdrop-blur-sm border-r border-white/10 transition-all duration-300 ease-in-out h-screen ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
      style={{ overflow: 'visible' }}
    >
      {/* Toggle button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 z-10 hover:bg-white/20"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-white/80" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-white/80" />
        )}
      </button>

      <SidebarContent 
        isCollapsed={isCollapsed}
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        netMonthly={netMonthly}
        totalBalance={totalBalance}
        allocatedToGoals={allocatedToGoals}
        availableBalance={availableBalance}
        totalBorrowed={totalBorrowed}
        totalLent={totalLent}
        netDebtPosition={netDebtPosition}
        realAvailableBalance={realAvailableBalance}
        activeGoals={activeGoals}
        location={location}
        onLinkClick={handleLinkClick}
      />
    </aside>
  );
};

const SidebarContent: React.FC<{
  isCollapsed: boolean;
  totalIncome: number;
  totalExpenses: number;
  netMonthly: number;
  totalBalance: number;
  allocatedToGoals: number;
  availableBalance: number;
  totalBorrowed: number;
  totalLent: number;
  netDebtPosition: number;
  realAvailableBalance: number;
  activeGoals: number;
  location: any;
  onLinkClick?: () => void;
}> = ({ 
  isCollapsed, 
  totalIncome, 
  totalExpenses,
  totalBalance,
  allocatedToGoals,
  availableBalance,
  totalBorrowed,
  totalLent,
  netDebtPosition,
  realAvailableBalance,
  activeGoals,
  location, 
  onLinkClick 
}) => {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  let emoji = '🌅';
  if (hour >= 12 && hour < 18) { greeting = 'Good afternoon'; emoji = '☀️'; }
  else if (hour >= 18) { greeting = 'Good evening'; emoji = '🌙'; }

  const balance = totalIncome - totalExpenses;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* User section */}
      <div className={`p-4 border-b border-white/10 ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl blur-md opacity-60" />
                <div className="relative w-10 h-10 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl flex items-center justify-center text-sm font-light shadow-lg">
                  YN
                </div>
              </div>
              <div>
                <h3 className="text-sm font-light text-white">Yung Nigga</h3>
                <p className="text-[10px] text-white/40">Free Plan</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <span>{emoji}</span>
              <span>{greeting}, Yung!</span>
            </div>
          </>
        ) : (
          <div className="relative w-10 h-10 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl blur-md opacity-60" />
            <div className="relative w-10 h-10 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl flex items-center justify-center text-sm font-light">
              YN
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onLinkClick}
                className={({ isActive: active }) =>
                  `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg transition-all duration-300 group relative ${
                    active
                      ? 'bg-gradient-to-r from-[#6366F1]/20 to-transparent text-white border-l-2 border-[#6366F1]'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" style={{ color: isActive ? item.color : 'currentColor' }} />
                {!isCollapsed && <span className="text-sm font-light truncate">{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#1A1A2E] backdrop-blur-sm border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      {!isCollapsed ? (
        <div className="px-3 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-2 text-center backdrop-blur-sm border border-white/5">
              <Target className="w-3.5 h-3.5 text-[#F59E0B] mx-auto mb-1" />
              <p className="text-[9px] text-white/40">Goals</p>
              <p className="text-xs font-light text-[#F59E0B]">{activeGoals}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2 text-center backdrop-blur-sm border border-white/5">
              <Wallet className="w-3.5 h-3.5 text-[#6366F1] mx-auto mb-1" />
              <p className="text-[9px] text-white/40">Net</p>
              <p className={`text-xs font-light ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 mb-3">
          <div className="bg-white/[0.03] rounded-lg p-2 text-center backdrop-blur-sm border border-white/5">
            <Target className="w-3.5 h-3.5 text-[#F59E0B] mx-auto mb-1" />
            <p className="text-[9px] text-white/40">Goals</p>
            <p className="text-xs font-light text-[#F59E0B]">{activeGoals}</p>
          </div>
        </div>
      )}

      {/* Balances */}
      {!isCollapsed ? (
        <div className="px-3 pb-3">
          <div className="bg-white/[0.03] rounded-lg p-2 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-1 mb-1">
              <Wallet className="w-3 h-3 text-[#6366F1]" />
              <p className="text-[9px] font-semibold text-white/40">Balances</p>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-white/40">Total</span>
                <span className="text-[#6366F1]">{formatCurrency(totalBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">In Goals</span>
                <span className="text-yellow-500">{formatCurrency(allocatedToGoals)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10">
                <span className="text-white/60">Available</span>
                <span className="text-green-500">{formatCurrency(availableBalance)}</span>
              </div>
              {(totalBorrowed > 0 || totalLent > 0) && (
                <>
                  <div className="flex justify-between">
                    <span className="text-white/40">Net Debt</span>
                    <span className={netDebtPosition >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {netDebtPosition >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netDebtPosition))}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/10">
                    <span className="text-white/60">Real Available</span>
                    <span className="text-[#6366F1]">{formatCurrency(realAvailableBalance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 pb-3">
          <div className="relative group">
            <div className="bg-white/[0.03] rounded-lg p-2 text-center backdrop-blur-sm border border-white/5 cursor-pointer">
              <Wallet className="w-4 h-4 text-[#6366F1] mx-auto" />
            </div>
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#1A1A2E] backdrop-blur-sm border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
              <div className="space-y-1">
                <div className="flex justify-between gap-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totalBalance)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>In Goals:</span>
                  <span>{formatCurrency(allocatedToGoals)}</span>
                </div>
                <div className="border-t border-white/10 my-1" />
                <div className="flex justify-between gap-2">
                  <span>Available:</span>
                  <span>{formatCurrency(availableBalance)}</span>
                </div>
                {(totalBorrowed > 0 || totalLent > 0) && (
                  <>
                    <div className="flex justify-between gap-2">
                      <span>Net Debt:</span>
                      <span>{formatCurrency(Math.abs(netDebtPosition))}</span>
                    </div>
                    <div className="border-t border-white/10 my-1" />
                    <div className="flex justify-between gap-2">
                      <span>Real Available:</span>
                      <span>{formatCurrency(realAvailableBalance)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      {!isCollapsed ? (
        <div className="px-3 pb-4 mt-auto">
          <div className="bg-white/[0.03] rounded-lg p-2 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-orange-500" />
              <p className="text-[9px] font-semibold text-white/40">Monthly</p>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-white/40">Income</span>
                <span className="text-green-500">+{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Expenses</span>
                <span className="text-red-500">-{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="flex justify-between font-light">
                <span className="text-white/60">Net</span>
                <span className={balance >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 pb-4 mt-auto">
          <div className="relative group">
            <div className="bg-white/[0.03] rounded-lg p-2 text-center backdrop-blur-sm border border-white/5 cursor-pointer">
              <TrendingUp className="w-4 h-4 text-orange-500 mx-auto" />
            </div>
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#1A1A2E] backdrop-blur-sm border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
              <div className="space-y-1">
                <div className="flex justify-between gap-2">
                  <span>Income:</span>
                  <span>+{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Expenses:</span>
                  <span>-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="border-t border-white/10 my-1" />
                <div className="flex justify-between gap-2">
                  <span>Net:</span>
                  <span>{formatCurrency(balance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;