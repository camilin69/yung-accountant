// components/layout/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useTranslation } from '../../i18n';
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
import { Logo } from '../common/Logo';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', labelKey: 'sidebar.dashboard' },
  { path: '/wallets', icon: Wallet, label: 'Wallets', labelKey: 'sidebar.wallets' },
  { path: '/calendar', icon: Calendar, label: 'Calendar', labelKey: 'sidebar.calendar' },
  { path: '/transactions', icon: Receipt, label: 'Transactions', labelKey: 'sidebar.transactions' },
  { path: '/goals', icon: Target, label: 'Goals', labelKey: 'sidebar.goals' },
  { path: '/debts', icon: HandCoins, label: 'Debts', labelKey: 'sidebar.debts' },
  { path: '/habits', icon: CheckSquare, label: 'Habits', labelKey: 'sidebar.habits' },
  { path: '/categories', icon: Tag, label: 'Categories', labelKey: 'sidebar.categories' },
  { path: '/community', icon: Users, label: 'Community', labelKey: 'sidebar.community' },
  { path: '/simulation', icon: TrendingUp, label: 'Simulation', labelKey: 'sidebar.simulation' },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { categories } = useCategoryStore();
  const { transactions } = useTransactionStore();
  const { goals } = useGoalStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px)') && !isDesktop;

  const totalBalance = useTotalBalance();
  const allocatedToGoals = useGoalsAllocatedBalance();
  const { borrowed: totalBorrowed, lent: totalLent, net: netDebtPosition } = useDebtsBalance();

  const activeGoals = goals.filter(g => g.status === 'active').length;

  useEffect(() => {
    if (isTablet) {
      // Auto-collapse on tablet for more content space
      setIsCollapsed(true);
    } else if (isDesktop) {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) {
        setIsCollapsed(JSON.parse(saved));
      }
    }
  }, [isDesktop, isTablet]);

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
          <div className="fixed inset-0 modal-overlay z-40" onClick={handleCloseMobile} />
        )}
        <aside 
          className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            background: 'var(--theme-background-glass)',
            backdropFilter: 'blur(80px) saturate(2.5)',
            WebkitBackdropFilter: 'blur(80px) saturate(2.5)',
            borderRight: '1px solid var(--theme-border-dark)',
            boxShadow: 'var(--shadow-glass-lg)',
          }}
        >
          <div className="p-5 flex justify-between items-center" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
            <div className="flex items-center gap-2.5">
              <Logo size="sm" withText={false} />
              <span className="text-sm font-medium tracking-[-0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{t('nav.appName')}</span>
            </div>
            <button
              onClick={handleCloseMobile}
              aria-label="Close navigation menu"
              className="p-2 rounded-2xl transition-all duration-300 hover:scale-110"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
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
      className={`flex flex-col transition-all duration-300 ease-in-out h-screen relative ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
      style={{
        background: 'var(--theme-background-glass)',
        backdropFilter: 'blur(60px) saturate(2)',
        WebkitBackdropFilter: 'blur(60px) saturate(2)',
        borderRight: '1px solid var(--theme-border-dark)',
        boxShadow: '0 4px 24px -8px rgba(0,0,0,0.15)',
      }}
    >
      <button
        onClick={toggleCollapse}
       
        className="absolute top-20 z-50 w-7 h-7 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-all duration-300"
        style={{
          background: 'var(--theme-background-glass-hover)',
          backdropFilter: 'blur(40px)',
          border: '1px solid var(--theme-border-dark)',
          right: '-14px',
        }}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} />
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
  const { t } = useTranslation();
  const { user } = useUserStore();
  const hour = new Date().getHours();
  let greeting = '';
  let greetingIcon = null;

  if (hour < 12) {
    greeting = t('nav.greetingMorning');
    greetingIcon = <Sun className="w-3.5 h-3.5" style={{ color: 'var(--semantic-warning)' }} />;
  } else if (hour < 18) {
    greeting = t('nav.greetingAfternoon');
    greetingIcon = <Sun className="w-3.5 h-3.5" style={{ color: 'var(--semantic-warning)' }} />;
  } else {
    greeting = t('nav.greetingEvening');
    greetingIcon = <Moon className="w-3.5 h-3.5" style={{ color: '#8B5CF6' }} />;
  }

  const displayName = user?.displayName || user?.firstName || user?.username || t('nav.userFallback');

  return (
    <div className="flex flex-col">
      {/* User section */}
      <div className={`p-5 ${isCollapsed ? 'text-center' : ''}`} style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3.5 mb-4">
              <Avatar user={user} size="xl" />
              <div>
                <h3 className="text-sm font-medium tracking-[-0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{displayName}</h3>
                <p className="text-[10px] font-medium capitalize mt-0.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>{user?.plan ? `${user.plan} Plan` : t('nav.freePlan')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
              {greetingIcon}
              <span>{greeting}, {displayName}!</span>
              <Sparkles className="w-3 h-3" style={{ color: 'var(--semantic-warning)' }} />
            </div>
          </>
        ) : (
          <div>
            <Avatar user={user} size="md" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="py-5">
        <div className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive: active }) =>
                  `flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all duration-500 group relative ${
                    isCollapsed ? 'justify-center' : ''
                  } ${active ? '' : 'hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-1'}`
                }
                style={({ isActive: active }) => ({
                  background: active ? 'var(--theme-background-glass-hover)' : 'transparent',
                  color: active ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)',
                  boxShadow: active ? '0 0 20px -8px var(--theme-primary)' : 'none',
                  fontWeight: active ? 500 : 400,
                })}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm truncate">{t(item.labelKey)}</span>}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Financial Dashboard */}
      {!isCollapsed ? (
        <div className="px-4 pb-8 space-y-4">
          {/* Main Financial Card */}
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(40px)',
              border: '1px solid var(--theme-border-dark)',
              boxShadow: 'var(--shadow-glass-sm)',
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} />
                <p className="text-[10px] font-medium tracking-[0.06em] uppercase truncate" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {t('nav.financialDashboard')}
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-2.5">
                <div className="rounded-2xl p-3 text-center overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--theme-border-dark)' }}>
                  <p className="text-[9px] font-medium tracking-[0.04em] uppercase truncate" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.income')}</p>
                  <p className="text-xs font-medium mt-1 truncate" style={{ color: 'var(--semantic-income)' }}>+{formatCurrency(totalIncome)}</p>
                </div>
                <div className="rounded-2xl p-3 text-center overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--theme-border-dark)' }}>
                  <p className="text-[9px] font-medium tracking-[0.04em] uppercase truncate" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.expenses')}</p>
                  <p className="text-xs font-medium mt-1 truncate" style={{ color: 'var(--semantic-expense)' }}>-{formatCurrency(totalExpenses)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 gap-2" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
                <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--theme-text-tertiary)' }}>{t('nav.netMonthly')}</span>
                <span className="text-xs font-medium truncate" style={{ color: netMonthly >= 0 ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>
                  {netMonthly >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netMonthly))}
                </span>
              </div>

              <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--theme-border-dark), transparent)' }} />

              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.totalBalance')}</span>
                <span className="text-xs font-medium truncate" style={{ color: 'var(--theme-primary)' }}>{formatCurrency(totalBalance)}</span>
              </div>

              <div className="flex justify-between items-center pl-3 gap-2" style={{ borderLeft: '2px solid var(--semantic-warning)' }}>
                <span className="text-[9px] font-medium flex-shrink-0" style={{ color: 'var(--theme-text-tertiary)' }}>{t('nav.inGoals')}</span>
                <span className="text-[11px] font-medium truncate" style={{ color: 'var(--semantic-warning)' }}>-{formatCurrency(allocatedToGoals)}</span>
              </div>

              <div className="flex justify-between items-center pl-3 gap-2" style={{ borderLeft: '2px solid var(--semantic-income)' }}>
                <span className="text-[9px] font-medium flex-shrink-0" style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.available')}</span>
                <span className="text-[11px] font-medium truncate" style={{ color: 'var(--semantic-income)' }}>{formatCurrency(availableBalance)}</span>
              </div>

              {(totalBorrowed > 0 || totalLent > 0) && (
                <>
                  <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--theme-border-dark), transparent)' }} />

                  <div className="space-y-2.5">
                    {totalBorrowed > 0 && (
                      <div className="flex justify-between items-center pl-3 gap-2" style={{ borderLeft: '2px solid var(--semantic-expense)' }}>
                        <span className="text-[9px] font-medium flex-shrink-0" style={{ color: 'var(--theme-text-tertiary)' }}>{t('nav.iOwe')}</span>
                        <span className="text-[11px] font-medium truncate" style={{ color: 'var(--semantic-expense)' }}>-{formatCurrency(totalBorrowed)}</span>
                      </div>
                    )}
                    {totalLent > 0 && (
                      <div className="flex justify-between items-center pl-3 gap-2" style={{ borderLeft: '2px solid var(--semantic-income)' }}>
                        <span className="text-[9px] font-medium flex-shrink-0" style={{ color: 'var(--theme-text-tertiary)' }}>{t('nav.owedToMe')}</span>
                        <span className="text-[11px] font-medium truncate" style={{ color: 'var(--semantic-income)' }}>+{formatCurrency(totalLent)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pl-3 gap-2" style={{ borderLeft: '2px solid var(--theme-primary)' }}>
                      <span className="text-[9px] font-medium flex-shrink-0" style={{ color: 'var(--theme-text-tertiary)' }}>{t('nav.netDebt')}</span>
                      <span className="text-[11px] font-medium truncate" style={{ color: netDebtPosition >= 0 ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>
                        {netDebtPosition >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netDebtPosition))}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--theme-primary), transparent)' }} />

              <div className="rounded-2xl p-3" style={{ background: 'var(--theme-background-glass-hover)', border: '1px solid var(--theme-border-dark)' }}>
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} />
                    <span className="text-[9px] font-medium tracking-[0.04em] uppercase truncate" style={{ color: 'var(--theme-text-secondary)' }}>
                      {t('nav.realAvailable')}
                    </span>
                  </div>
                  <span className="text-sm font-medium tracking-[-0.02em] truncate" style={{ color: 'var(--theme-primary)' }}>
                    {formatCurrency(realAvailableBalance)}
                  </span>
                </div>
                <p className="text-[8px] font-medium mt-1.5 text-center" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>
                  {t('nav.afterGoalsDebts')}
                </p>
              </div>
            </div>
          </div>

          {/* Active Goals Card */}
          <div 
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(40px)',
              border: '1px solid var(--theme-border-dark)',
              boxShadow: 'var(--shadow-glass-sm)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--semantic-warning)' }} />
              <p className="text-[10px] font-medium tracking-[0.06em] uppercase truncate" style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('nav.activeGoals')}
              </p>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--theme-text-secondary)' }}>{t('nav.numberOfGoals')}</span>
              <span className="text-lg font-medium tracking-[-0.02em] flex-shrink-0" style={{ color: 'var(--semantic-warning)' }}>{activeGoals}</span>
            </div>
          </div>

          {/* Net Position Card */}
          <div 
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(40px)',
              border: '1px solid var(--theme-border-dark)',
              boxShadow: 'var(--shadow-glass-sm)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} />
              <p className="text-[10px] font-medium tracking-[0.06em] uppercase truncate" style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('nav.netPosition')}
              </p>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--theme-text-secondary)' }}>{t('nav.netPositionDesc')}</span>
              <span className="text-lg font-medium tracking-[-0.02em] flex-shrink-0" style={{ color: netDebtPosition >= 0 ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>
                {netDebtPosition >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netDebtPosition))}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 pb-8 space-y-2">
          <div className="relative group">
            <div 
              className="rounded-2xl p-2.5 text-center cursor-pointer transition-all duration-300 hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--theme-border-dark)',
              }}
            >
              <Wallet className="w-4 h-4 mx-auto" style={{ color: 'var(--theme-primary)' }} />
            </div>
            <div 
              className="absolute left-full ml-3 px-4 py-3 rounded-2xl text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none"
              style={{ 
                background: 'var(--theme-background-secondary)',
                backdropFilter: 'blur(60px)',
                border: '1px solid var(--theme-border-dark)',
                boxShadow: 'var(--shadow-glass-lg)',
              }}
            >
              <div className="space-y-1.5">
                <div className="flex justify-between gap-4">
                  <span style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.income')}:</span>
                  <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--semantic-income)' }}>+{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.expenses')}:</span>
                  <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--semantic-expense)' }}>-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="border-t my-1.5" style={{ borderColor: 'var(--theme-border-dark)' }} />
                <div className="flex justify-between gap-4">
                  <span style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.total')}:</span>
                  <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--theme-primary)' }}>{formatCurrency(totalBalance)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: 'var(--theme-text-tertiary)' }}>{t('nav.inGoals')}:</span>
                  <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--semantic-warning)' }}>-{formatCurrency(allocatedToGoals)}</span>
                </div>
                <div className="border-t my-1.5" style={{ borderColor: 'var(--theme-border-dark)' }} />
                <div className="flex justify-between gap-4">
                  <span style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.available')}:</span>
                  <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--semantic-income)' }}>{formatCurrency(availableBalance)}</span>
                </div>
                {totalBorrowed > 0 && (
                  <div className="flex justify-between gap-4">
                    <span style={{ color: 'var(--theme-text-tertiary)' }}>{t('debts.borrowed')}:</span>
                    <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--semantic-expense)' }}>-{formatCurrency(totalBorrowed)}</span>
                  </div>
                )}
                {totalLent > 0 && (
                  <div className="flex justify-between gap-4">
                    <span style={{ color: 'var(--theme-text-tertiary)' }}>{t('debts.lent')}:</span>
                    <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--semantic-income)' }}>+{formatCurrency(totalLent)}</span>
                  </div>
                )}
                <div className="border-t my-1.5" style={{ borderColor: 'var(--theme-border-dark)' }} />
                <div className="flex justify-between gap-4">
                  <span style={{ color: 'var(--theme-text-tertiary)' }}>{t('nav.realAvailable')}:</span>
                  <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--theme-primary)' }}>{formatCurrency(realAvailableBalance)}</span>
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