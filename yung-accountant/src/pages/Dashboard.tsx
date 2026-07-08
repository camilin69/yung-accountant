// /src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  useTransactionStore, 
  useCategoryStore, 
  useGoalStore, 
  useWalletStore, 
  useDebtStore,
  useTotalBalance,
  useGoalsAllocatedBalance,
  useDebtsBalance,
  useHabitStore,
  useUserStore
} from '../store';
import { formatCurrency, formatDate, toLocalDateString } from '../utils/formatters';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { 
  Activity,
  ArrowLeftRight,
  Calendar,
  Clock, 
  HandCoins, 
  PieChart, 
  Sparkles, 
  Target, 
  TrendingDown, 
  TrendingUp, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { getIconComponent, getWalletIcon } from '../utils/iconHelpers';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useResponsive } from '../hooks/useResponsive';
import { Carousel } from '../components/common/Carousel';
import CachedBadge from '../components/common/CachedBadge';
import { isOffline } from '../services/offlineHelper';
import { useTranslation } from '../i18n';
import type { ChartOptions } from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  ArcElement, PointElement, LineElement, Filler
);

// ============================================
// COMPONENTES GLASS AERO
// ============================================

const StatCard: React.FC<{
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  accentColor: string;
  delay?: number;
}> = ({ label, value, sublabel, icon, accentColor, delay = 0 }) => (
  <div 
    className="group relative p-7 transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-3 cursor-default overflow-hidden glass-md"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Glow radial en hover */}
    <div className="absolute -inset-2 rounded-[1.25rem] opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none"
      style={{ background: `radial-gradient(500px circle at center, ${accentColor}10, transparent 70%)`, filter: 'blur(40px)' }} 
    />
    
    {/* Brillo en borde superior */}
    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-5">
        <div 
          className="w-14 h-14 rounded-[1rem] flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 glass-sm"
          style={{ boxShadow: `0 8px 24px -8px ${accentColor}25` }}
        >
          {icon}
        </div>
        <span className="text-[11px] font-medium tracking-[0.15em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>
          {label}
        </span>
      </div>
      <p className="text-[34px] font-light tracking-[-0.03em] leading-tight transition-all duration-700 group-hover:scale-105 origin-left group-hover:tracking-[-0.02em] text-adaptive-number" style={{ color: 'var(--theme-text-primary)' }}>
        {value}
      </p>
      {sublabel && <p className="text-[12px] mt-2.5 tracking-[0.03em] transition-all duration-700 group-hover:translate-x-1" style={{ color: 'var(--theme-text-tertiary)' }}>{sublabel}</p>}
    </div>
  </div>
);

const GlassPanel: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ title, subtitle, icon, action, children, className = '', delay = 0 }) => (
  <div 
    className={`group overflow-hidden transition-all duration-1000 ease-out animate-scale-in glass-md ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center justify-between px-8 py-6" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-[1rem] flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 glass-sm">
          {icon}
        </div>
        <div>
          <h3 className="text-[15px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{title}</h3>
          {subtitle && <p className="text-[11px] tracking-[0.04em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className="transition-transform duration-700 group-hover:translate-x-2">{action}</div>}
    </div>
    <div className="p-8">{children}</div>
  </div>
);

// ============================================
// DASHBOARD
// ============================================
const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  const { isAuthenticated } = useUserStore();
  const { categories, fetchAllCategories } = useCategoryStore();
  const { debts, fetchDebts } = useDebtStore();
  const { goals, fetchGoals } = useGoalStore();
  const { habits: habitData, fetchHabits } = useHabitStore();
  const { wallets, fetchWallets } = useWalletStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const dataLoaded = useRef(false);

  useEffect(() => {
    if (!dataLoaded.current && isAuthenticated) {
      dataLoaded.current = true;
      if (!isOffline() || categories.length === 0) {
        fetchAllCategories();
      }
      if (!isOffline() || debts.length === 0) {
        fetchDebts();
      }
      if (!isOffline() || goals.length === 0) {
        fetchGoals();
      }
      if (!isOffline() || (habitData?.length ?? 0) === 0) {
        fetchHabits();
      }
      if (!isOffline() || wallets.length === 0) {
        fetchWallets();
      }
      if (!isOffline() || transactions.length === 0) {
        fetchTransactions();
      }
    }
  }, [isAuthenticated]);

  useDocumentTitle(t('dashboard.title'));

  // Monthly Pulse date range — defaults to last 30 days
  const now = new Date();
  const [pulseStart, setPulseStart] = useState(toLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)));
  const [pulseEnd, setPulseEnd] = useState(toLocalDateString(now));

  const totalBalance = useTotalBalance();
  const allocatedToGoals = useGoalsAllocatedBalance();
  const { borrowed: activeDebts, net: netDebtPosition } = useDebtsBalance();
  const freeMoney = totalBalance - activeDebts - allocatedToGoals;

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  // Translation map for wallet type labels (keeps internal English labels for icon lookups)
  const walletTypeLabelMap: Record<string, string> = {
    'Cash': t('dashboard.walletTypeCash'),
    'Bank': t('dashboard.walletTypeBank'),
    'Credit': t('dashboard.walletTypeCredit'),
    'Debit': t('dashboard.walletTypeDebit'),
    'Other': t('dashboard.walletTypeOther'),
  };

  const walletDistribution = useMemo(() => {
    const dist: Record<string, { total: number; count: number; color: string; label: string }> = {
      cash: { total: 0, count: 0, color: 'var(--semantic-income)', label: 'Cash' },
      bank_account: { total: 0, count: 0, color: 'var(--semantic-info)', label: 'Bank' },
      credit_card: { total: 0, count: 0, color: 'var(--semantic-expense)', label: 'Credit' },
      debit_card: { total: 0, count: 0, color: 'var(--semantic-warning)', label: 'Debit' },
      other: { total: 0, count: 0, color: '#8B5CF6', label: 'Other' },
    };
    wallets.forEach(w => {
      if (dist[w.type]) { dist[w.type].total += w.currentBalance; dist[w.type].count++; }
      else { dist.other.total += w.currentBalance; dist.other.count++; }
    });
    return Object.values(dist).filter(d => d.total > 0 || d.count > 0);
  }, [wallets]);

  const totalWalletsBalance = wallets.reduce((s, w) => s + w.currentBalance, 0);

  const monthAbbrs = useMemo(() => t('calendar.monthAbbr').split(','), [t]);

  // Daily pulse data within selected date range
  const pulseData = useMemo(() => {
    const start = new Date(pulseStart + 'T00:00:00');
    const end = new Date(pulseEnd + 'T23:59:59');
    const days: { label: string; date: string }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push({
        label: `${cursor.getDate()} ${monthAbbrs[cursor.getMonth()]}`,
        date: toLocalDateString(cursor),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return {
      labels: days.map(d => d.label),
      dayCount: days.length,
      income: days.map(d =>
        transactions.filter(t => {
          const cat = getCategoryById(t.categoryId);
          if (cat?.type !== 'income') return false;
          // Normalize date — handle both 'YYYY-MM-DD' and ISO 'YYYY-MM-DDT...' formats
          const txDate = (t.date || '').slice(0, 10);
          return txDate === d.date;
        }).reduce((a, t) => a + t.amount, 0)
      ),
      expenses: days.map(d =>
        transactions.filter(t => {
          const cat = getCategoryById(t.categoryId);
          if (cat?.type !== 'expense') return false;
          const txDate = (t.date || '').slice(0, 10);
          return txDate === d.date;
        }).reduce((a, t) => a + t.amount, 0)
      ),
    };
  }, [transactions, pulseStart, pulseEnd, monthAbbrs]);

  const categoryExpenses = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; color: string }>();
    transactions.forEach(t => {
      const cat = getCategoryById(t.categoryId);
      if (cat?.type === 'expense') {
        const c = map.get(cat.id) || { name: cat.name, amount: 0, color: cat.color };
        c.amount += t.amount;
        map.set(cat.id, c);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 6);
  }, [transactions]);

  const recentTransactions = useMemo(() => 
    [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
  [transactions]);

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3);

  const totalIncome = transactions.filter(t => getCategoryById(t.categoryId)?.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => getCategoryById(t.categoryId)?.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const borrowedDebts = debts.filter(d => d.type === 'borrowed' && d.status === 'active');
  const lentDebts = debts.filter(d => d.type === 'lent' && d.status === 'active');
  const totalBorrowed = borrowedDebts.reduce((s, d) => s + d.remainingBalance, 0);
  const totalLent = lentDebts.reduce((s, d) => s + d.remainingBalance, 0);

  const debtEvolution = useMemo(() => {
    const now = new Date();
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: monthAbbrs[d.getMonth()], year: d.getFullYear(), date: d };
    });
    return {
      labels: last6.map(m => m.month),
      borrowed: last6.map(m => {
        const end = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0);
        return debts.filter(d => d.type === 'borrowed' && d.status === 'active' && new Date(d.startDate) <= end).reduce((s, d) => s + d.remainingBalance, 0);
      }),
      lent: last6.map(m => {
        const end = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0);
        return debts.filter(d => d.type === 'lent' && d.status === 'active' && new Date(d.startDate) <= end).reduce((s, d) => s + d.remainingBalance, 0);
      }),
    };
  }, [debts, monthAbbrs]);

  const topDebts = [...borrowedDebts, ...lentDebts].sort((a, b) => b.remainingBalance - a.remainingBalance).slice(0, 5);

  const getSemanticColor = (varName: string, fallback: string): string => {
    if (typeof document !== 'undefined') {
      const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return v || fallback;
    }
    return fallback;
  };

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Pulse line chart (daily, x,y points within selected range)
  const pulseChartData = {
    labels: pulseData.labels,
    datasets: [
      {
        label: t('dashboard.income'),
        data: pulseData.income,
        borderColor: getSemanticColor('--semantic-income', '#10B981'),
        backgroundColor: hexToRgba(getSemanticColor('--semantic-income', '#10B981'), 0.08),
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 10,
        borderWidth: 2,
      },
      {
        label: t('dashboard.expenses'),
        data: pulseData.expenses,
        borderColor: getSemanticColor('--semantic-expense', '#EF4444'),
        backgroundColor: hexToRgba(getSemanticColor('--semantic-expense', '#EF4444'), 0.08),
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 10,
        borderWidth: 2,
      },
    ],
  };

  const pieChartData = {
    labels: categoryExpenses.map(c => c.name),
    datasets: [{ data: categoryExpenses.map(c => c.amount), backgroundColor: categoryExpenses.map(c => c.color || '#8B5CF6'), borderColor: 'rgba(255,255,255,0.20)', borderWidth: 3 }],
  };

  const debtChartData = {
    labels: debtEvolution.labels,
    datasets: [
      { label: t('dashboard.chartBorrowed'), data: debtEvolution.borrowed, borderColor: getSemanticColor('--semantic-expense', '#EF4444'), backgroundColor: hexToRgba(getSemanticColor('--semantic-expense', '#EF4444'), 0.08), fill: true, tension: 0.5, pointBackgroundColor: getSemanticColor('--semantic-expense', '#EF4444'), pointBorderColor: '#FFFFFF', pointRadius: 5, pointHoverRadius: 8, borderWidth: 2.5 },
      { label: t('dashboard.chartLent'), data: debtEvolution.lent, borderColor: getSemanticColor('--semantic-income', '#10B981'), backgroundColor: hexToRgba(getSemanticColor('--semantic-income', '#10B981'), 0.08), fill: true, tension: 0.5, pointBackgroundColor: getSemanticColor('--semantic-income', '#10B981'), pointBorderColor: '#FFFFFF', pointRadius: 5, pointHoverRadius: 8, borderWidth: 2.5 },
    ],
  };

  const getChartTextColor = () => {
    if (typeof document !== 'undefined') {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--theme-background-primary').trim();
      return bg.includes('0f') || bg.includes('0a') || bg.includes('14') || bg.includes('0d') || bg.includes('07') || bg.includes('0b')
        ? { text: '#D1D5DB', grid: 'rgba(255,255,255,0.06)', tooltipBg: '#1F2937', tooltipText: '#F9FAFB', tooltipBody: '#D1D5DB' }
        : { text: '#374151', grid: 'rgba(0,0,0,0.06)', tooltipBg: '#FFFFFF', tooltipText: '#111827', tooltipBody: '#4B5563' };
    }
    return { text: '#D1D5DB', grid: 'rgba(255,255,255,0.06)', tooltipBg: '#1F2937', tooltipText: '#F9FAFB', tooltipBody: '#D1D5DB' };
  };

  const chartColors = getChartTextColor();

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1500, easing: 'easeInOutQuart' },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: chartColors.text,
          font: { size: 11, weight: 'normal' as const },
          usePointStyle: true,
          boxWidth: 8,
          padding: 18,
        },
      },
      tooltip: {
        backgroundColor: chartColors.tooltipBg,
        titleColor: chartColors.tooltipText,
        bodyColor: chartColors.tooltipBody,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 14,
        padding: 14,
      },
    },
    scales: {
      y: {
        grid: { color: chartColors.grid },
        ticks: { color: chartColors.text, callback: (v) => formatCurrency(v as number), font: { size: 10, weight: 'normal' as const } },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { color: chartColors.text, font: { size: 10, weight: 'normal' as const } },
        border: { display: false },
      },
    },
  };

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { animateScale: true, animateRotate: true, duration: 1800, easing: 'easeInOutQuart' },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: chartColors.text, font: { size: 11, weight: 'normal' as const }, boxWidth: 10, padding: 16 },
      },
      tooltip: {
        backgroundColor: chartColors.tooltipBg,
        titleColor: chartColors.tooltipText,
        bodyColor: chartColors.tooltipBody,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 14,
        padding: 14,
      },
    },
  };

  const lineOptions: ChartOptions<'line'> = {
    ...barOptions,
    animation: { duration: 1800, easing: 'easeInOutQuart' },
  } as ChartOptions<'line'>;

  const pulseOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeInOutQuart' },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: chartColors.text,
          font: { size: 11, weight: 'normal' as const },
          usePointStyle: true, boxWidth: 8, padding: 18,
        },
      },
      tooltip: {
        backgroundColor: chartColors.tooltipBg,
        titleColor: chartColors.tooltipText,
        bodyColor: chartColors.tooltipBody,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1, cornerRadius: 14, padding: 14,
      },
    },
    scales: {
      y: {
        grid: { color: chartColors.grid },
        ticks: { color: chartColors.text, callback: (v) => formatCurrency(v as number), font: { size: 10 } },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: chartColors.text,
          font: { size: 9 },
          maxTicksLimit: pulseData.dayCount > 30 ? 12 : pulseData.dayCount,
        },
        border: { display: false },
      },
    },
  } as ChartOptions<'line'>;

  return (
    <div className="relative z-10 pb-24">
      {/* Header con Quick Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12 pt-6 animate-fade-in-down">
        <div>
          <h1 className="text-[40px] font-light tracking-[-0.04em] leading-tight" style={{ color: 'var(--theme-text-primary)' }}>
            {t('dashboard.title')} <CachedBadge />
          </h1>
          <p className="text-[14px] mt-2 tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('dashboard.subtitle')}
          </p>
        </div>
      </div>

      {/* Primary Stats */}
      {isMobile ? (
        <Carousel className="mb-12">
          <StatCard label={t('dashboard.statRealBalance')} value={formatCurrency(totalBalance)} sublabel={t('dashboard.statRealBalanceDesc')} icon={<Wallet className="w-5 h-5" style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />} accentColor="var(--semantic-info)" delay={600} />
          <StatCard label={t('dashboard.statActiveDebts')} value={formatCurrency(activeDebts)} sublabel={t('dashboard.statActiveDebtsDesc')} icon={<TrendingDown className="w-5 h-5" style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />} accentColor="var(--semantic-expense)" delay={750} />
          <StatCard label={t('dashboard.statGoalReserves')} value={formatCurrency(allocatedToGoals)} sublabel={t('dashboard.statGoalReservesDesc')} icon={<Target className="w-5 h-5" style={{ color: 'var(--semantic-warning)' }} strokeWidth={1.5} />} accentColor="var(--semantic-warning)" delay={900} />
          <StatCard label={t('dashboard.statFreeToUse')} value={formatCurrency(freeMoney)} sublabel={t('dashboard.statFreeToUseDesc')} icon={<Sparkles className="w-5 h-5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />} accentColor="var(--semantic-income)" delay={1050} />
        </Carousel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard label={t('dashboard.statRealBalance')} value={formatCurrency(totalBalance)} sublabel={t('dashboard.statRealBalanceDesc')} icon={<Wallet className="w-5 h-5" style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />} accentColor="var(--semantic-info)" delay={600} />
          <StatCard label={t('dashboard.statActiveDebts')} value={formatCurrency(activeDebts)} sublabel={t('dashboard.statActiveDebtsDesc')} icon={<TrendingDown className="w-5 h-5" style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />} accentColor="var(--semantic-expense)" delay={750} />
          <StatCard label={t('dashboard.statGoalReserves')} value={formatCurrency(allocatedToGoals)} sublabel={t('dashboard.statGoalReservesDesc')} icon={<Target className="w-5 h-5" style={{ color: 'var(--semantic-warning)' }} strokeWidth={1.5} />} accentColor="var(--semantic-warning)" delay={900} />
          <StatCard label={t('dashboard.statFreeToUse')} value={formatCurrency(freeMoney)} sublabel={t('dashboard.statFreeToUseDesc')} icon={<Sparkles className="w-5 h-5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />} accentColor="var(--semantic-income)" delay={1050} />
        </div>
      )}

      {/* Quick Stats */}
      {isMobile ? (
        <Carousel className="mb-12">
          {[
            { icon: <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />, label: t('dashboard.income'), value: `+${formatCurrency(totalIncome)}`, color: 'var(--semantic-income)' },
            { icon: <ArrowDownRight className="w-4 h-4" style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />, label: t('dashboard.expenses'), value: `-${formatCurrency(totalExpenses)}`, color: 'var(--semantic-expense)' },
            { icon: <Activity className="w-4 h-4" style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />, label: t('dashboard.quickStatSavings'), value: `${savingsRate.toFixed(1)}%`, color: 'var(--semantic-info)' },
            { icon: <Calendar className="w-4 h-4" style={{ color: '#A78BFA' }} strokeWidth={1.5} />, label: t('dashboard.quickStatGoals'), value: `${activeGoals.length}`, color: '#8B5CF6' },
          ].map((stat, i) => (
            <div key={i} className="group p-5 transition-all duration-700 ease-out hover:-translate-y-2 cursor-default glass-sm">
              <div className="flex items-center gap-3 mb-3.5">
                <div className="w-10 h-10 rounded-[0.75rem] flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 glass-sm" style={{ boxShadow: `0 4px 12px -4px ${stat.color}20` }}>
                  {stat.icon}
                </div>
                <span className="text-[11px] font-medium tracking-[0.12em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>{stat.label}</span>
              </div>
              <p className="text-[26px] font-light tracking-[-0.03em] transition-all duration-700 group-hover:scale-105 origin-left" style={{ color: 'var(--theme-text-primary)' }}>{stat.value}</p>
            </div>
          ))}
        </Carousel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {[
          { icon: <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />, label: t('dashboard.income'), value: `+${formatCurrency(totalIncome)}`, color: 'var(--semantic-income)', delay: 1200 },
          { icon: <ArrowDownRight className="w-4 h-4" style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />, label: t('dashboard.expenses'), value: `-${formatCurrency(totalExpenses)}`, color: 'var(--semantic-expense)', delay: 1350 },
          { icon: <Activity className="w-4 h-4" style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />, label: t('dashboard.quickStatSavings'), value: `${savingsRate.toFixed(1)}%`, color: 'var(--semantic-info)', delay: 1500 },
          { icon: <Calendar className="w-4 h-4" style={{ color: '#A78BFA' }} strokeWidth={1.5} />, label: t('dashboard.quickStatGoals'), value: `${activeGoals.length}`, color: '#8B5CF6', delay: 1650 },
        ].map((stat, i) => (
          <div
            key={i}
            className="group p-5 transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-2 cursor-default glass-sm"
            style={{ animationDelay: `${stat.delay}ms` }}
          >
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-10 h-10 rounded-[0.75rem] flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 glass-sm" style={{ boxShadow: `0 4px 12px -4px ${stat.color}20` }}>
                {stat.icon}
              </div>
              <span className="text-[11px] font-medium tracking-[0.12em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>{stat.label}</span>
            </div>
            <p className="text-[26px] font-light tracking-[-0.03em] transition-all duration-700 group-hover:scale-105 origin-left" style={{ color: 'var(--theme-text-primary)' }}>{stat.value}</p>
          </div>
        ))}
      </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-7 mb-12">
        <div className="overflow-hidden transition-all duration-1000 ease-out animate-scale-in glass-md lg:col-span-1" style={{ animationDelay: '1800ms' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-[1rem] flex items-center justify-center transition-all duration-700 glass-sm">
                <Calendar className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[15px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{t('dashboard.panelMonthlyPulse')}</h3>
                <p className="text-[11px] tracking-[0.04em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.panelMonthlyPulseDesc', { days: pulseData.dayCount })}</p>
              </div>
            </div>
          </div>
          {/* Date range inputs — 2 columns on mobile, inline on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 px-8 py-3" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>{t('common.from') || 'From'}</span>
              <input
                type="date"
                value={pulseStart}
                onChange={(e) => setPulseStart(e.target.value)}
                className="px-3 py-2 rounded-xl text-[12px] font-medium border-none outline-none glass-sm w-full"
                style={{ color: 'var(--theme-text-primary)', background: 'var(--theme-background-glass)' }}
              />
            </div>
            <span className="text-[11px] hidden sm:block mt-4" style={{ color: 'var(--theme-text-tertiary)' }}>→</span>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>{t('common.to') || 'To'}</span>
              <input
                type="date"
                value={pulseEnd}
                onChange={(e) => setPulseEnd(e.target.value)}
                className="px-3 py-2 rounded-xl text-[12px] font-medium border-none outline-none glass-sm w-full"
                style={{ color: 'var(--theme-text-primary)', background: 'var(--theme-background-glass)' }}
              />
            </div>
          </div>
          {/* Chart */}
          <div className="p-8">
            <div className="h-80"><Line data={pulseChartData} options={pulseOptions} /></div>
          </div>
        </div>
        <GlassPanel title={t('dashboard.panelExpenseDNA')} subtitle={t('dashboard.panelExpenseDNADesc')} icon={<PieChart className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />} delay={1950}>
          {categoryExpenses.length > 0 ? (
            <div className="h-80"><Pie data={pieChartData} options={pieOptions} /></div>
          ) : (
            <div className="h-80 flex items-center justify-center"><p className="text-[14px] tracking-[0.03em] animate-pulse-subtle" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.emptyAwaitingData')}</p></div>
          )}
        </GlassPanel>
      </div>

      {/* Wallets */}
      <GlassPanel title={t('dashboard.panelWalletConstellation')} subtitle={t('dashboard.panelWalletConstellationDesc', { count: wallets.filter(w => w.isActive).length })} icon={<Layers className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />} className="mb-12" delay={2100}>
        {wallets.length > 0 ? (
          <div className="space-y-7">
            <div className="space-y-3">
              <div className="flex justify-between text-[12px] tracking-[0.03em]">
                <span style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.totalValue')}</span>
                <span className="font-medium" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalWalletsBalance)}</span>
              </div>
              <div className="h-3.5 rounded-full overflow-hidden flex" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}>
                {walletDistribution.map(w => {
                  const pct = totalWalletsBalance > 0 ? (w.total / totalWalletsBalance) * 100 : 0;
                  if (pct === 0) return null;
                  return <div key={w.label} className="h-full transition-all duration-1500 ease-out hover:brightness-125" style={{ width: `${pct}%`, backgroundColor: w.color }} />;
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {walletDistribution.map((w, i) => {
                const IconEl = getWalletIcon(w.label === 'Cash' ? 'cash' : w.label === 'Bank' ? 'bank_account' : w.label === 'Credit' ? 'credit_card' : w.label === 'Debit' ? 'debit_card' : 'other', "w-4 h-4", w.color);
                return (
                  <div key={w.label} className="group/item p-5 transition-all duration-500 hover:-translate-y-2 cursor-default animate-fade-in-up glass-sm" style={{ animationDelay: `${2200 + i * 120}ms` }}>
                    <div className="flex items-center gap-3 mb-3.5">
                      <div className="w-9 h-9 rounded-[0.75rem] flex items-center justify-center transition-all duration-500 group-hover/item:scale-110 glass-sm">{IconEl}</div>
                      <span className="text-[12px] font-medium tracking-[0.03em]" style={{ color: 'var(--theme-text-secondary)' }}>{walletTypeLabelMap[w.label]}</span>
                    </div>
                    <p className="text-[18px] font-light tracking-[-0.02em] transition-all duration-500 group-hover/item:scale-105 origin-left" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(w.total)}</p>
                    <p className="text-[11px] mt-1.5 tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)' }}>{w.count} {w.count === 1 ? t('common.walletSingular') : t('common.walletPlural')}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 animate-pulse-subtle"><p className="text-[14px] tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.emptyNoWallets')} <Link to="/wallets" style={{ color: 'var(--theme-primary)' }}>{t('dashboard.emptyNoWalletsInit')}</Link></p></div>
        )}
      </GlassPanel>

      {/* Recent & Goals */}
      <div className="grid lg:grid-cols-2 gap-7 mb-12">
        <GlassPanel title={t('dashboard.panelLiveActivity')} icon={<Clock className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />}
          action={<Link to="/transactions" className="group/link flex items-center gap-2 text-[12px] font-medium tracking-[0.04em] transition-all duration-500" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.viewAll')} <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-1.5 transition-transform duration-500" strokeWidth={1.5} /></Link>}
          delay={2400}>
          <div className="space-y-1">
            {recentTransactions.map((t, i) => {
              const cat = getCategoryById(t.categoryId);
              if (!cat) return null;
              const IconComponent = getIconComponent(cat.icon);
              return (
                <div key={t.id} className="flex items-center justify-between p-4 transition-all duration-500 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-2 animate-fade-in-up glass-sm" style={{ animationDelay: `${2500 + i * 80}ms` }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-[1rem] flex items-center justify-center transition-all duration-500 hover:scale-110" style={{ backgroundColor: `${cat.color}14` }}>
                      <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{cat.name}</p>
                      <p className="text-[11px] tracking-[0.04em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t.description || formatDate(t.date, 'short')}</p>
                    </div>
                  </div>
                  <p className="text-[15px] font-medium tracking-[0.02em]" style={{ color: cat.type === 'income' ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>{cat.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</p>
                </div>
              );
            })}
            {recentTransactions.length === 0 && <div className="text-center py-12 animate-pulse-subtle"><p className="text-[14px] tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.emptyNoActivity')}</p></div>}
          </div>
        </GlassPanel>

        <GlassPanel title={t('dashboard.panelGoalHorizon')} icon={<Target className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />}
          action={<Link to="/goals" className="group/link flex items-center gap-2 text-[12px] font-medium tracking-[0.04em] transition-all duration-500" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.viewAll')} <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-1.5 transition-transform duration-500" strokeWidth={1.5} /></Link>}
          delay={2400}>
          <div className="space-y-7">
            {activeGoals.map((goal, i) => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              return (
                <div key={goal.id} className="group/goal animate-fade-in-up" style={{ animationDelay: `${2500 + i * 120}ms` }}>
                  <div className="flex justify-between items-start mb-3">
                    <div><p className="text-[14px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{goal.name}</p><p className="text-[11px] mt-1 tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.targetLabel')}{formatDate(goal.targetDate, 'short')}</p></div>
                    <span className="text-[14px] font-medium tracking-[0.02em] transition-all duration-500 group-hover/goal:scale-110" style={{ color: 'var(--theme-text-secondary)' }}>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden transition-all duration-500 group-hover/goal:h-3.5" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}>
                    <div className="h-full rounded-full transition-all duration-1000 ease-out group-hover/goal:brightness-125" style={{ width: `${progress}%`, background: 'var(--theme-gradient-primary)', boxShadow: '0 0 20px -6px var(--theme-primary)' }} />
                  </div>
                  <div className="flex justify-between mt-3 text-[11px] tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)' }}>
                    <span>{formatCurrency(goal.currentAmount)} {t('goals.saved').toLowerCase()}</span><span>{formatCurrency(goal.targetAmount)} {t('goals.goal')}</span>
                  </div>
                </div>
              );
            })}
            {activeGoals.length === 0 && <div className="text-center py-12 animate-pulse-subtle"><p className="text-[14px] tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.defineFirstGoal')}</p></div>}
          </div>
        </GlassPanel>
      </div>

      {/* Debts */}
      <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '2600ms' }}>
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center transition-all duration-500 hover:scale-110 hover:rotate-12 glass-sm"><HandCoins className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} /></div>
            <h2 className="text-[26px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>{t('dashboard.panelDebtTopology')}</h2>
          </div>
          <Link to="/debts" className="group flex items-center gap-2 text-[13px] font-medium tracking-[0.04em] transition-all duration-500" style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.manage')} <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-500" strokeWidth={1.5} /></Link>
        </div>

        {isMobile ? (
          <Carousel className="mb-9">
            <StatCard label={t('dashboard.iOwe')} value={formatCurrency(totalBorrowed)} sublabel={t('common.activeCount', { count: borrowedDebts.length })} icon={<TrendingDown className="w-5 h-5" style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />} accentColor="var(--semantic-expense)" delay={2700} />
            <StatCard label={t('dashboard.owedToMe')} value={formatCurrency(totalLent)} sublabel={t('common.activeCount', { count: lentDebts.length })} icon={<TrendingUp className="w-5 h-5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />} accentColor="var(--semantic-income)" delay={2850} />
            <StatCard label={t('dashboard.netPosition')} value={`${netDebtPosition >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netDebtPosition))}`} sublabel={t('dashboard.netPositionDesc')} icon={<ArrowLeftRight className="w-5 h-5" style={{ color: '#A78BFA' }} strokeWidth={1.5} />} accentColor="#8B5CF6" delay={3000} />
          </Carousel>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-9">
            <StatCard label={t('dashboard.iOwe')} value={formatCurrency(totalBorrowed)} sublabel={t('common.activeCount', { count: borrowedDebts.length })} icon={<TrendingDown className="w-5 h-5" style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />} accentColor="var(--semantic-expense)" delay={2700} />
            <StatCard label={t('dashboard.owedToMe')} value={formatCurrency(totalLent)} sublabel={t('common.activeCount', { count: lentDebts.length })} icon={<TrendingUp className="w-5 h-5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />} accentColor="var(--semantic-income)" delay={2850} />
            <StatCard label={t('dashboard.netPosition')} value={`${netDebtPosition >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netDebtPosition))}`} sublabel={t('dashboard.netPositionDesc')} icon={<ArrowLeftRight className="w-5 h-5" style={{ color: '#A78BFA' }} strokeWidth={1.5} />} accentColor="#8B5CF6" delay={3000} />
          </div>
        )}

        {(totalBorrowed > 0 || totalLent > 0) && (
          <GlassPanel title={t('dashboard.panelDebtTrajectory')} subtitle={t('dashboard.panelDebtTrajectoryDesc')} icon={<Clock className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />} className="mb-9" delay={3150}>
            <div className="h-80"><Line data={debtChartData} options={lineOptions} /></div>
          </GlassPanel>
        )}

        {topDebts.length > 0 && (() => {
          const debtCards = topDebts.map((debt, i) => {
            const progress = ((debt.originalAmount - debt.remainingBalance) / debt.originalAmount) * 100;
            const isBorrowed = debt.type === 'borrowed';
            return (
              <Link key={debt.id} to="/debts" className="block p-5 transition-all duration-500 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-3 animate-fade-in-up glass-sm" style={{ animationDelay: `${3400 + i * 120}ms` }}>
                <div className="flex justify-between items-start mb-3">
                  <div><p className="text-[14px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{debt.creditorName}</p><p className="text-[11px] mt-1 tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)' }}>{isBorrowed ? t('dashboard.obligation') : t('dashboard.receivable')} · {formatCurrency(debt.monthlyPayment)}{t('dashboard.perMonth')}</p></div>
                  <p className="text-[15px] font-medium tracking-[0.02em]" style={{ color: isBorrowed ? 'var(--semantic-expense)' : 'var(--semantic-income)' }}>{formatCurrency(debt.remainingBalance)}</p>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden transition-all duration-500 group-hover:h-3" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}>
                  <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: isBorrowed ? 'var(--semantic-expense)' : 'var(--semantic-income)' }} />
                </div>
                <div className="flex justify-between mt-3 text-[11px] tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)' }}>
                  <span>{t('dashboard.percentResolved', { percent: Math.round(progress) })}</span><span>{t('dashboard.monthsLeft', { count: debt.termMonths - Math.floor((Date.now() - new Date(debt.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) })}</span>
                </div>
              </Link>
            );
          });

          return (
            <GlassPanel title={t('dashboard.panelActiveObligations')} icon={<HandCoins className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />} delay={3300}>
              {isMobile ? (
                <Carousel>
                  {debtCards}
                </Carousel>
              ) : (
                <div className="space-y-2">
                  {debtCards}
                </div>
              )}
            </GlassPanel>
          );
        })()}

        {debts.length === 0 && (
          <div className="p-16 text-center animate-pulse-subtle transition-all duration-700 glass-md">
            <div className="w-20 h-20 rounded-[1.25rem] flex items-center justify-center mx-auto mb-6 transition-all duration-500 hover:scale-110 glass-sm"><HandCoins className="w-10 h-10" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1} /></div>
            <p className="text-[16px] tracking-[0.03em] mb-2" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.emptyDebtFree')}</p>
            <p className="text-[13px] tracking-[0.04em] mb-7" style={{ color: 'var(--theme-text-tertiary)' }}>{t('dashboard.emptyBeginTopology')}</p>
            <Link to="/debts" className="group inline-flex items-center gap-2.5 px-8 py-4 text-[13px] font-medium tracking-[0.05em] transition-all duration-500 hover:-translate-y-1.5"
              style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF', boxShadow: '0 4px 24px -6px var(--theme-primary)', borderRadius: '0.75rem' }}>
              {t('dashboard.emptyMapFirstDebt')} <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-500" strokeWidth={2} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;