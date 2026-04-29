// components/layout/Sidebar.tsx
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
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useCategoryStore, useDebtsBalance, useGoalsAllocatedBalance, useGoalStore, useTotalBalance, useTransactionStore, useUserStore } from '../../store';
import { Avatar } from '../common/Avatar';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/wallets', icon: Wallet, label: 'Wallets' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/transactions', icon: Receipt, label: 'Transactions' },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/debts', icon: HandCoins, label: 'Debts' },
  { path: '/habits', icon: CheckSquare, label: 'Habits' },
  { path: '/categories', icon: Tag, label: 'Categories' },
  { path: '/community', icon: Users, label: 'Community' },
  { path: '/simulation', icon: TrendingUp, label: 'Simulation' },
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

  if (!isDesktop) {
    return (
      <>
        {isMobileOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={handleCloseMobile} />
        )}
        <aside className={`fixed top-0 left-0 h-full w-72 backdrop-blur-xl border-r z-50 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: 'var(--theme-background-secondary)', borderColor: 'var(--theme-border-light)' }}>
          <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--theme-border-light)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--theme-gradient-primary)' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-light" style={{ color: 'var(--theme-text-primary)' }}>Yung Accountant</span>
            </div>
            <button onClick={handleCloseMobile} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--theme-text-tertiary)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-73px)] pb-8 sidebar-scroll">
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

  return (
    <aside 
      className={`flex flex-col backdrop-blur-sm border-r transition-all duration-300 ease-in-out h-screen relative ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
      style={{ backgroundColor: 'var(--theme-background-secondary)', borderColor: 'var(--theme-border-light)' }}
    >
      <button
        onClick={toggleCollapse}
        className="absolute top-20 z-50 w-6 h-6 rounded-full backdrop-blur-sm border flex items-center justify-center shadow-md hover:scale-110 transition-all duration-300"
        style={{ backgroundColor: 'var(--theme-background-glass)', borderColor: 'var(--theme-border-light)', right: '-12px' }}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)' }} />
        ) : (
          <ChevronLeft className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)' }} />
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
  onClose 
}) => {
  const { user } = useUserStore();
  const hour = new Date().getHours();
  let greeting = '';
  let greetingIcon = null;

  if (hour < 12) {
    greeting = 'Good Morning';
    greetingIcon = <Sun className="w-3 h-3" />;
  } else if (hour < 18) {
    greeting = 'Good Afternoon';
    greetingIcon = <Sun className="w-3 h-3" />;
  } else {
    greeting = 'Good Evening';
    greetingIcon = <Moon className="w-3 h-3" />;
  }

  const displayName = user?.displayName || user?.firstName || user?.username || 'User';

  return (
    <div className="flex flex-col">
      {/* User section */}
      <div className={`p-5 border-b ${isCollapsed ? 'text-center' : ''}`} style={{ borderColor: 'var(--theme-border-light)' }}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Avatar user={user} size="lg" />
              <div>
                <h3 className="text-sm font-light" style={{ color: 'var(--theme-text-primary)' }}>{displayName}</h3>
                <p className="text-[10px] capitalize" style={{ color: 'var(--theme-text-tertiary)' }}>{user?.plan || 'Free'} Plan</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>
              {greetingIcon}
              <span>{greeting}, {displayName}!</span>
              <Sparkles className="w-3 h-3 text-yellow-500" />
            </div>
          </>
        ) : (
          <div>
            <Avatar user={user} size="lg" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="py-4">
        <div className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive: active }) =>
                  `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-300 group relative ${
                    active
                      ? 'text-white border-l-2'
                      : 'hover:bg-white/5'
                  }`
                }
                style={({ isActive: active }) => ({
                  background: active ? 'var(--theme-primary)/10' : 'transparent',
                  borderLeftColor: active ? 'var(--theme-primary)' : 'transparent',
                  color: active ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)'
                })}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-light truncate">{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 backdrop-blur-sm border rounded-lg text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg" style={{ backgroundColor: 'var(--theme-background-secondary)', borderColor: 'var(--theme-border-light)' }}>
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Financial Dashboard */}
      {!isCollapsed ? (
        <div className="px-4 pb-8">
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-gradient-secondary)', borderColor: 'var(--theme-border-light)' }}>
            <div className="p-3 border-b" style={{ borderColor: 'var(--theme-border-light)', backgroundColor: 'var(--theme-background-glass)' }}>
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-tertiary)' }}>Financial Dashboard</p>
              </div>
            </div>

            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2 text-center" style={{ backgroundColor: 'var(--theme-background-glass)' }}>
                  <p className="text-[9px]" style={{ color: 'var(--theme-text-tertiary)' }}>Income</p>
                  <p className="text-sm font-light text-green-700">+{formatCurrency(totalIncome)}</p>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ backgroundColor: 'var(--theme-background-glass)' }}>
                  <p className="text-[9px]" style={{ color: 'var(--theme-text-tertiary)' }}>Expenses</p>
                  <p className="text-sm font-light text-red-700">-{formatCurrency(totalExpenses)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: 'var(--theme-border-light)' }}>
                <span className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>Net Monthly</span>
                <span className={`text-sm font-light ${netMonthly >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {netMonthly >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netMonthly))}
                </span>
              </div>

              <div className="relative flex justify-center">
                <div className="w-full h-px" style={{ background: 'linear-gradient(to right, transparent, var(--theme-border-light), transparent)' }} />
                <div className="absolute -top-2 px-2" style={{ backgroundColor: 'var(--theme-background-secondary)' }}>
                  <span className="text-[8px]" style={{ color: 'var(--theme-text-tertiary)' }}>▼</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>Total Balance</span>
                <span className="text-sm font-light" style={{ color: 'var(--theme-primary)' }}>{formatCurrency(totalBalance)}</span>
              </div>

              <div className="flex justify-between items-center pl-2 border-l-2" style={{ borderLeftColor: '#F59E0B' }}>
                <span className="text-[9px]" style={{ color: 'var(--theme-text-tertiary)' }}>└─ In Goals</span>
                <span className="text-xs font-light text-yellow-600">-{formatCurrency(allocatedToGoals)}</span>
              </div>

              <div className="flex justify-between items-center pl-2 border-l-2" style={{ borderLeftColor: '#10B981' }}>
                <span className="text-[9px]" style={{ color: 'var(--theme-text-tertiary)' }}>└─ Available</span>
                <span className="text-xs font-light text-green-700">{formatCurrency(availableBalance)}</span>
              </div>

              {(totalBorrowed > 0 || totalLent > 0) && (
                <>
                  <div className="relative flex justify-center pt-1">
                    <div className="w-full h-px" style={{ background: 'linear-gradient(to right, transparent, var(--theme-border-light), transparent)' }} />
                    <div className="absolute -top-2 px-2" style={{ backgroundColor: 'var(--theme-background-secondary)' }}>
                      <span className="text-[8px]" style={{ color: 'var(--theme-text-tertiary)' }}>▼</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {totalBorrowed > 0 && (
                      <div className="flex justify-between items-center pl-2 border-l-2" style={{ borderLeftColor: '#EF4444' }}>
                        <span className="text-[9px]" style={{ color: 'var(--theme-text-tertiary)' }}>└─ I Owe</span>
                        <span className="text-xs font-light text-red-700">-{formatCurrency(totalBorrowed)}</span>
                      </div>
                    )}
                    {totalLent > 0 && (
                      <div className="flex justify-between items-center pl-2 border-l-2" style={{ borderLeftColor: '#10B981' }}>
                        <span className="text-[9px]" style={{ color: 'var(--theme-text-tertiary)' }}>└─ Owed to Me</span>
                        <span className="text-xs font-light text-green-700">+{formatCurrency(totalLent)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pl-2 border-l-2" style={{ borderLeftColor: 'var(--theme-primary)' }}>
                      <span className="text-[9px]" style={{ color: 'var(--theme-text-tertiary)' }}>└─ Net Debt</span>
                      <span className={`text-xs font-light ${netDebtPosition >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {netDebtPosition >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netDebtPosition))}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="relative flex justify-center pt-1">
                <div className="w-full h-px" style={{ background: 'linear-gradient(to right, transparent, var(--theme-primary), transparent)' }} />
                <div className="absolute -top-2 px-2" style={{ backgroundColor: 'var(--theme-background-secondary)' }}>
                  <span className="text-[8px]" style={{ color: 'var(--theme-text-secondary)' }}>▼</span>
                </div>
              </div>

              <div className="rounded-lg p-2 mt-1" style={{ background: 'var(--theme-primary)/10' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" style={{ color: 'var(--theme-primary)' }} />
                    <span className="text-[9px] font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>REAL AVAILABLE</span>
                  </div>
                  <span className="text-base font-light" style={{ color: 'var(--theme-primary)' }}>{formatCurrency(realAvailableBalance)}</span>
                </div>
                <p className="text-[7px] mt-1 text-center" style={{ color: 'var(--theme-text-tertiary)' }}>After goals & debts</p>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl p-3 backdrop-blur-sm border" style={{ backgroundColor: 'var(--theme-background-glass)', borderColor: 'var(--theme-border-dark)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-3.5 h-3.5 text-yellow-600" />
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-tertiary)' }}>Active Goals</p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>Number of goals</span>
              <span className="text-lg font-light text-yellow-600">{activeGoals}</span>
            </div>
          </div>

          <div className="mt-3 rounded-xl p-3 backdrop-blur-sm border" style={{ backgroundColor: 'var(--theme-background-glass)', borderColor: 'var(--theme-border-dark)' }}>
            <div className="flex items-center gap-2 mb-2">
              <ArrowLeftRight className="w-3.5 h-3.5 text-red-700" />
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-tertiary)' }}>Net Position</p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>What I'm owed - What I owe</span>
              <span className={`text-lg font-light ${netDebtPosition >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {netDebtPosition >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netDebtPosition))}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 pb-8 space-y-2">
          <div className="relative group">
            <div className="rounded-xl p-2 text-center backdrop-blur-sm border cursor-pointer" style={{ backgroundColor: 'var(--theme-background-glass)', borderColor: 'var(--theme-border-dark)' }}>
              <Wallet className="w-4 h-4 mx-auto" style={{ color: 'var(--theme-primary)' }} />
            </div>
            <div className="absolute left-full ml-2 px-3 py-2 backdrop-blur-sm border rounded-lg text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg" style={{ backgroundColor: 'var(--theme-background-secondary)', borderColor: 'var(--theme-border-light)' }}>
              <div className="space-y-1">
                <div className="flex justify-between gap-3">
                  <span>Income:</span>
                  <span className="text-green-700">+{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Expenses:</span>
                  <span className="text-red-700">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="border-t my-1" style={{ borderColor: 'var(--theme-border-light)' }} />
                <div className="flex justify-between gap-3">
                  <span>Total:</span>
                  <span style={{ color: 'var(--theme-primary)' }}>{formatCurrency(totalBalance)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>In Goals:</span>
                  <span className="text-yellow-600">-{formatCurrency(allocatedToGoals)}</span>
                </div>
                <div className="border-t my-1" style={{ borderColor: 'var(--theme-border-light)' }} />
                <div className="flex justify-between gap-3">
                  <span>Available:</span>
                  <span className="text-green-700">{formatCurrency(availableBalance)}</span>
                </div>
                {totalBorrowed > 0 && (
                  <div className="flex justify-between gap-3">
                    <span>I Owe:</span>
                    <span className="text-red-700">-{formatCurrency(totalBorrowed)}</span>
                  </div>
                )}
                {totalLent > 0 && (
                  <div className="flex justify-between gap-3">
                    <span>Owed:</span>
                    <span className="text-green-700">+{formatCurrency(totalLent)}</span>
                  </div>
                )}
                <div className="border-t my-1" style={{ borderColor: 'var(--theme-border-light)' }} />
                <div className="flex justify-between gap-3">
                  <span>Real Available:</span>
                  <span style={{ color: 'var(--theme-primary)' }}>{formatCurrency(realAvailableBalance)}</span>
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