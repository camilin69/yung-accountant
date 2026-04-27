import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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
  ArrowLeftRight,
  X
} from 'lucide-react';
import { useCategoryStore, useDebtsBalance, useGoalsAllocatedBalance, useGoalStore, useTotalBalance, useTransactionStore } from '../../store';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: '#6366F1' },
  { path: '/wallets', icon: Wallet, label: 'Wallets', color: '#10B981' },
  { path: '/calendar', icon: Calendar, label: 'Calendar', color: '#EC4899' },
  { path: '/transactions', icon: Receipt, label: 'Transactions', color: '#10B981' },
  { path: '/goals', icon: Target, label: 'Goals', color: '#F59E0B' },
  { path: '/debts', icon: HandCoins, label: 'Debts', color: '#EF4444' },
  { path: '/habits', icon: CheckSquare, label: 'Habits', color: '#14B8A6' },
  { path: '/categories', icon: Tag, label: 'Categories', color: '#8B5CF6' },
  { path: '/community', icon: Users, label: 'Community', color: '#A855F7' },
  { path: '/simulation', icon: TrendingUp, label: 'Simulation', color: '#EC4899' },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const location = useLocation();
  const { categories } = useCategoryStore();
  const { transactions } = useTransactionStore();
  const { goals } = useGoalStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const totalBalance = useTotalBalance();
  const allocatedToGoals = useGoalsAllocatedBalance();
  const { borrowed: totalBorrowed, lent: totalLent, net: netDebtPosition } = useDebtsBalance();

  const activeGoals = goals.filter(g => g.status === 'active').length;

  // Cargar estado colapsado solo en desktop
  useEffect(() => {
    if (isDesktop) {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) {
        setIsCollapsed(JSON.parse(saved));
      }
    }
  }, [isDesktop]);

  const totalIncome = transactions.filter(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    return cat?.type === 'income';
  }).reduce((s, t) => s + t.amount, 0);

  const totalExpenses = transactions.filter(t => {
    const cat = categories.find(c => c.id === t.categoryId);
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

  const handleCloseMobile = () => {
    if (onCloseMobile) onCloseMobile();
  };

  // Vista Mobile
  if (!isDesktop) {
    return (
      <>
        {isMobileOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={handleCloseMobile} />
        )}
        <aside className={`fixed top-0 left-0 h-full w-72 bg-[#1A1A2E] backdrop-blur-xl border-r border-white/10 z-50 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-5 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-light text-white">Yung Accountant</span>
            </div>
            <button onClick={handleCloseMobile} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-73px)] pb-8">
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
              onClose={handleCloseMobile} 
            />
          </div>
        </aside>
      </>
    );
  }

  // Vista Desktop
  return (
    <aside 
      className={`flex flex-col bg-[#1A1A2E] backdrop-blur-sm border-r border-white/10 transition-all duration-300 ease-in-out h-screen relative ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
      style={{ overflow: 'visible' }}
    >
      {/* Toggle button */}
      <button
        onClick={toggleCollapse}
        className="absolute top-20 z-50 w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-md hover:scale-110 transition-all duration-300 hover:bg-white/20"
        style={{ right: '-12px' }}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-white/70" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-white/70" />
        )}
      </button>

      <div className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll pb-12">
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
        />
      </div>
    </aside>
  );
};

// SidebarContent se mantiene igual que antes
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
  onClose?: () => void;
}> = ({ 
  isCollapsed, 
  totalIncome, 
  totalExpenses,
  netMonthly,
  totalBalance,
  allocatedToGoals,
  availableBalance,
  totalBorrowed,
  totalLent,
  netDebtPosition,
  realAvailableBalance,
  activeGoals,
  location, 
  onClose 
}) => {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  let emoji = '🌅';
  if (hour >= 12 && hour < 18) { greeting = 'Good afternoon'; emoji = '☀️'; }
  else if (hour >= 18) { greeting = 'Good evening'; emoji = '🌙'; }

  return (
    <div className="flex flex-col">
      {/* User section */}
      <div className={`p-5 border-b border-white/10 ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl blur-md opacity-60" />
                <div className="relative w-12 h-12 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl flex items-center justify-center text-base font-light shadow-lg">
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
          <div>
            <div className="relative w-10 h-10 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl blur-md opacity-60" />
              <div className="relative w-10 h-10 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-xl flex items-center justify-center text-sm font-light">
                YN
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="py-4">
        <div className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive: active }) =>
                  `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-300 group relative ${
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

      {/* Financial Dashboard - mantener igual */}
      {!isCollapsed ? (
        <div className="px-4 pb-8">
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl border border-white/10 overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-[#6366F1]" />
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Financial Dashboard</p>
              </div>
            </div>

            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                  <p className="text-[9px] text-white/40">Income</p>
                  <p className="text-sm font-light text-green-500">+{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                  <p className="text-[9px] text-white/40">Expenses</p>
                  <p className="text-sm font-light text-red-500">-{formatCurrency(totalExpenses)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-white/10">
                <span className="text-[10px] text-white/40">Net Monthly</span>
                <span className={`text-sm font-light ${netMonthly >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {netMonthly >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netMonthly))}
                </span>
              </div>

              <div className="relative flex justify-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="absolute -top-2 bg-[#1A1A2E] px-2">
                  <span className="text-[8px] text-white/30">▼</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40">Total Balance</span>
                <span className="text-sm font-light text-[#6366F1]">{formatCurrency(totalBalance)}</span>
              </div>

              <div className="flex justify-between items-center pl-2 border-l-2 border-yellow-500/30">
                <span className="text-[9px] text-white/40">└─ In Goals</span>
                <span className="text-xs font-light text-yellow-500">-{formatCurrency(allocatedToGoals)}</span>
              </div>

              <div className="flex justify-between items-center pl-2 border-l-2 border-green-500/30">
                <span className="text-[9px] text-white/40">└─ Available</span>
                <span className="text-xs font-light text-green-500">{formatCurrency(availableBalance)}</span>
              </div>

              {(totalBorrowed > 0 || totalLent > 0) && (
                <>
                  <div className="relative flex justify-center pt-1">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="absolute -top-2 bg-[#1A1A2E] px-2">
                      <span className="text-[8px] text-white/30">▼</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {totalBorrowed > 0 && (
                      <div className="flex justify-between items-center pl-2 border-l-2 border-red-500/30">
                        <span className="text-[9px] text-white/40">└─ I Owe</span>
                        <span className="text-xs font-light text-red-500">-{formatCurrency(totalBorrowed)}</span>
                      </div>
                    )}
                    {totalLent > 0 && (
                      <div className="flex justify-between items-center pl-2 border-l-2 border-green-500/30">
                        <span className="text-[9px] text-white/40">└─ Owed to Me</span>
                        <span className="text-xs font-light text-green-500">+{formatCurrency(totalLent)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pl-2 border-l-2 border-[#6366F1]/50">
                      <span className="text-[9px] text-white/40">└─ Net Debt</span>
                      <span className={`text-xs font-light ${netDebtPosition >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {netDebtPosition >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netDebtPosition))}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="relative flex justify-center pt-1">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-[#6366F1]/50 to-transparent" />
                <div className="absolute -top-2 bg-[#1A1A2E] px-2">
                  <span className="text-[8px] text-white/50">▼</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#6366F1]/10 to-[#EC4899]/10 rounded-lg p-2 mt-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#6366F1]" />
                    <span className="text-[9px] font-semibold text-white/60">REAL AVAILABLE</span>
                  </div>
                  <span className="text-base font-light text-[#6366F1]">{formatCurrency(realAvailableBalance)}</span>
                </div>
                <p className="text-[7px] text-white/30 mt-1 text-center">After goals & debts</p>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-white/[0.03] rounded-xl p-3 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-3.5 h-3.5 text-[#F59E0B]" />
              <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">Active Goals</p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">Number of goals</span>
              <span className="text-lg font-light text-[#F59E0B]">{activeGoals}</span>
            </div>
          </div>

          <div className="mt-3 bg-white/[0.03] rounded-xl p-3 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#EF4444]" />
              <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">Net Position</p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">What I'm owed - What I owe</span>
              <span className={`text-lg font-light ${netDebtPosition >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {netDebtPosition >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netDebtPosition))}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 pb-8 space-y-2">
          <div className="relative group">
            <div className="bg-white/[0.03] rounded-xl p-2 text-center backdrop-blur-sm border border-white/5 cursor-pointer">
              <Wallet className="w-4 h-4 text-[#6366F1] mx-auto" />
            </div>
            <div className="absolute left-full ml-2 px-3 py-2 bg-[#1A1A2E] backdrop-blur-sm border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
              <div className="space-y-1">
                <div className="flex justify-between gap-3">
                  <span>Income:</span>
                  <span className="text-green-500">+{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Expenses:</span>
                  <span className="text-red-500">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="border-t border-white/10 my-1" />
                <div className="flex justify-between gap-3">
                  <span>Total:</span>
                  <span className="text-[#6366F1]">{formatCurrency(totalBalance)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>In Goals:</span>
                  <span className="text-yellow-500">-{formatCurrency(allocatedToGoals)}</span>
                </div>
                <div className="border-t border-white/10 my-1" />
                <div className="flex justify-between gap-3">
                  <span>Available:</span>
                  <span className="text-green-500">{formatCurrency(availableBalance)}</span>
                </div>
                {totalBorrowed > 0 && (
                  <div className="flex justify-between gap-3">
                    <span>I Owe:</span>
                    <span className="text-red-500">-{formatCurrency(totalBorrowed)}</span>
                  </div>
                )}
                {totalLent > 0 && (
                  <div className="flex justify-between gap-3">
                    <span>Owed:</span>
                    <span className="text-green-500">+{formatCurrency(totalLent)}</span>
                  </div>
                )}
                <div className="border-t border-white/10 my-1" />
                <div className="flex justify-between gap-3">
                  <span>Real Available:</span>
                  <span className="text-[#6366F1]">{formatCurrency(realAvailableBalance)}</span>
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