// /src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useRef } from 'react';
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
import { formatCurrency, formatDate } from '../utils/formatters';
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
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  Activity, 
  ArrowLeftRight, 
  BarChart3, 
  Calendar, 
  Clock, 
  HandCoins, 
  PieChart, 
  Plus, 
  Sparkles, 
  Target, 
  TrendingDown, 
  TrendingUp, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Zap,
  ChevronRight,
  WalletCards,
  PiggyBank,
  CreditCard,
  ListChecks,
  Users
} from 'lucide-react';
import { getIconComponent, getWalletIcon } from '../utils/iconHelpers';
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
    className="group relative rounded-[2.5rem] p-7 transition-all duration-1000 ease-out animate-fade-in-up hover:-translate-y-4 cursor-default overflow-hidden glass-aero"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Glow radial en hover */}
    <div className="absolute -inset-2 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none"
      style={{ background: `radial-gradient(600px circle at center, ${accentColor}12, transparent 70%)`, filter: 'blur(40px)' }} 
    />
    
    {/* Brillo en borde superior */}
    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-5">
        <div 
          className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 group-hover:scale-115 group-hover:rotate-12 glass-sm"
          style={{ boxShadow: `0 8px 24px -8px ${accentColor}30` }}
        >
          {icon}
        </div>
        <span className="text-[11px] font-medium tracking-[0.15em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>
          {label}
        </span>
      </div>
      <p className="text-[34px] font-light tracking-[-0.03em] leading-tight transition-all duration-700 group-hover:scale-105 origin-left group-hover:tracking-[-0.02em]" style={{ color: 'var(--theme-text-primary)' }}>
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
    className={`group rounded-[2.5rem] overflow-hidden transition-all duration-1000 ease-out animate-scale-in glass-aero ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center justify-between px-8 py-6" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-[1.25rem] flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 glass-sm">
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

const QuickAction: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  delay?: number;
}> = ({ to, icon, label, color, delay = 0 }) => (
  <Link
    to={to}
    className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all duration-700 hover:-translate-y-1 animate-fade-in-up glass-sm"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div 
      className="w-8 h-8 rounded-[0.75rem] flex items-center justify-center transition-all duration-700 group-hover:scale-115 group-hover:rotate-12"
      style={{ backgroundColor: `${color}14`, boxShadow: `0 4px 12px -4px ${color}20` }}
    >
      {icon}
    </div>
    <span className="text-[11px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-secondary)' }}>
      {label}
    </span>
    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-1 group-hover:ml-0 transition-all duration-700" style={{ color }} strokeWidth={2.5} />
  </Link>
);

// ============================================
// DASHBOARD
// ============================================
const Dashboard: React.FC = () => {
  const { isAuthenticated } = useUserStore();
  const { categories, fetchAllCategories } = useCategoryStore();
  const { debts, fetchDebts } = useDebtStore();
  const { goals, fetchGoals } = useGoalStore();
  const { fetchHabits } = useHabitStore();
  const { wallets, fetchWallets } = useWalletStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  
  const dataLoaded = useRef(false);

  useEffect(() => {
    if (!dataLoaded.current && isAuthenticated) {
      dataLoaded.current = true;
      fetchAllCategories();
      fetchDebts();
      fetchGoals();
      fetchHabits();
      fetchWallets();
      fetchTransactions();
    }
  }, [isAuthenticated]);

  const totalBalance = useTotalBalance();
  const allocatedToGoals = useGoalsAllocatedBalance();
  const { borrowed: activeDebts, net: netDebtPosition } = useDebtsBalance();
  const freeMoney = totalBalance - activeDebts - allocatedToGoals;

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const walletDistribution = useMemo(() => {
    const dist: Record<string, { total: number; count: number; color: string; label: string }> = {
      cash: { total: 0, count: 0, color: '#10B981', label: 'Cash' },
      bank_account: { total: 0, count: 0, color: '#3B82F6', label: 'Bank' },
      credit_card: { total: 0, count: 0, color: '#EF4444', label: 'Credit' },
      debit_card: { total: 0, count: 0, color: '#F59E0B', label: 'Debit' },
      other: { total: 0, count: 0, color: '#8B5CF6', label: 'Other' },
    };
    wallets.forEach(w => {
      if (dist[w.type]) { dist[w.type].total += w.currentBalance; dist[w.type].count++; }
      else { dist.other.total += w.currentBalance; dist.other.count++; }
    });
    return Object.values(dist).filter(d => d.total > 0 || d.count > 0);
  }, [wallets]);

  const totalWalletsBalance = wallets.reduce((s, w) => s + w.currentBalance, 0);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: months[d.getMonth()], year: d.getFullYear(), date: d };
    });
    return {
      labels: last6.map(m => m.month),
      income: last6.map(m => {
        const s = new Date(m.date.getFullYear(), m.date.getMonth(), 1).toISOString().split('T')[0];
        const e = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0).toISOString().split('T')[0];
        return transactions.filter(t => getCategoryById(t.categoryId)?.type === 'income' && t.date >= s && t.date <= e).reduce((a, t) => a + t.amount, 0);
      }),
      expenses: last6.map(m => {
        const s = new Date(m.date.getFullYear(), m.date.getMonth(), 1).toISOString().split('T')[0];
        const e = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0).toISOString().split('T')[0];
        return transactions.filter(t => getCategoryById(t.categoryId)?.type === 'expense' && t.date >= s && t.date <= e).reduce((a, t) => a + t.amount, 0);
      }),
    };
  }, [transactions]);

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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: months[d.getMonth()], year: d.getFullYear(), date: d };
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
  }, [debts]);

  const topDebts = [...borrowedDebts, ...lentDebts].sort((a, b) => b.remainingBalance - a.remainingBalance).slice(0, 5);

  const barChartData = {
    labels: monthlyData.labels,
    datasets: [
      { label: 'Income', data: monthlyData.income, backgroundColor: 'rgba(16, 185, 129, 0.20)', borderColor: '#10B981', borderWidth: 2, borderRadius: 10, barPercentage: 0.6, categoryPercentage: 0.8 },
      { label: 'Expenses', data: monthlyData.expenses, backgroundColor: 'rgba(239, 68, 68, 0.20)', borderColor: '#EF4444', borderWidth: 2, borderRadius: 10, barPercentage: 0.6, categoryPercentage: 0.8 },
    ],
  };

  const pieChartData = {
    labels: categoryExpenses.map(c => c.name),
    datasets: [{ data: categoryExpenses.map(c => c.amount), backgroundColor: categoryExpenses.map(c => c.color || '#8B5CF6'), borderColor: 'rgba(255,255,255,0.20)', borderWidth: 3 }],
  };

  const debtChartData = {
    labels: debtEvolution.labels,
    datasets: [
      { label: 'Borrowed', data: debtEvolution.borrowed, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.5, pointBackgroundColor: '#EF4444', pointBorderColor: '#FFFFFF', pointRadius: 5, pointHoverRadius: 8, borderWidth: 2.5 },
      { label: 'Lent', data: debtEvolution.lent, borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.5, pointBackgroundColor: '#10B981', pointBorderColor: '#FFFFFF', pointRadius: 5, pointHoverRadius: 8, borderWidth: 2.5 },
    ],
  };

  // Opciones de chart con contraste adaptativo
  const isDarkMode = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const getChartTextColor = () => {
    // Detectamos si estamos en modo oscuro basándonos en la variable CSS del tema
    if (typeof document !== 'undefined') {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--theme-background-primary').trim();
      // Si el fondo es oscuro (baja luminosidad), usamos colores claros
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

  return (
    <div className="relative z-10 pb-24">
      {/* Header con Quick Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12 pt-6 animate-fade-in-down">
        <div>
          <h1 className="text-[40px] font-light tracking-[-0.04em] leading-tight" style={{ color: 'var(--theme-text-primary)' }}>
            Dashboard
          </h1>
          <p className="text-[14px] mt-2 tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>
            Financial command center
          </p>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2.5">
          <QuickAction to="/wallets" icon={<WalletCards className="w-4 h-4" style={{ color: '#3B82F6' }} strokeWidth={1.5} />} label="Wallet" color="#3B82F6" delay={0} />
          <QuickAction to="/goals" icon={<Target className="w-4 h-4" style={{ color: '#F59E0B' }} strokeWidth={1.5} />} label="Goal" color="#F59E0B" delay={100} />
          <QuickAction to="/debts" icon={<CreditCard className="w-4 h-4" style={{ color: '#EF4444' }} strokeWidth={1.5} />} label="Debt" color="#EF4444" delay={200} />
          <QuickAction to="/habits" icon={<ListChecks className="w-4 h-4" style={{ color: '#8B5CF6' }} strokeWidth={1.5} />} label="Habit" color="#8B5CF6" delay={300} />
          <QuickAction to="/community" icon={<Users className="w-4 h-4" style={{ color: '#06B6D4' }} strokeWidth={1.5} />} label="Community" color="#06B6D4" delay={400} />
          <Link
            to="/calendar"
            className="group relative flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-700 hover:-translate-y-1 animate-fade-in-up"
            style={{ 
              backgroundColor: 'var(--theme-primary)', 
              color: '#FFFFFF',
              boxShadow: '0 4px 20px -6px var(--theme-primary)',
              animationDelay: '500ms'
            }}
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-700" strokeWidth={2.5} />
            <span className="text-[11px] font-medium tracking-[0.06em] uppercase">Transaction</span>
            <Zap className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -ml-1 group-hover:ml-0 transition-all duration-700" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard label="Real Balance" value={formatCurrency(totalBalance)} sublabel="Total across wallets" icon={<Wallet className="w-5 h-5" style={{ color: '#60A5FA' }} strokeWidth={1.5} />} accentColor="#3B82F6" delay={600} />
        <StatCard label="Active Debts" value={formatCurrency(activeDebts)} sublabel="Currently owed" icon={<TrendingDown className="w-5 h-5" style={{ color: '#F87171' }} strokeWidth={1.5} />} accentColor="#EF4444" delay={750} />
        <StatCard label="Goal Reserves" value={formatCurrency(allocatedToGoals)} sublabel="Virtual savings" icon={<Target className="w-5 h-5" style={{ color: '#FBBF24' }} strokeWidth={1.5} />} accentColor="#F59E0B" delay={900} />
        <StatCard label="Free to Use" value={formatCurrency(freeMoney)} sublabel="Ready to deploy" icon={<Sparkles className="w-5 h-5" style={{ color: '#34D399' }} strokeWidth={1.5} />} accentColor="#10B981" delay={1050} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {[
          { icon: <ArrowUpRight className="w-4 h-4" style={{ color: '#34D399' }} strokeWidth={1.5} />, label: 'Income', value: `+${formatCurrency(totalIncome)}`, color: '#10B981', delay: 1200 },
          { icon: <ArrowDownRight className="w-4 h-4" style={{ color: '#F87171' }} strokeWidth={1.5} />, label: 'Expenses', value: `-${formatCurrency(totalExpenses)}`, color: '#EF4444', delay: 1350 },
          { icon: <Activity className="w-4 h-4" style={{ color: '#60A5FA' }} strokeWidth={1.5} />, label: 'Savings', value: `${savingsRate.toFixed(1)}%`, color: '#3B82F6', delay: 1500 },
          { icon: <Calendar className="w-4 h-4" style={{ color: '#A78BFA' }} strokeWidth={1.5} />, label: 'Goals', value: `${activeGoals.length}`, color: '#8B5CF6', delay: 1650 },
        ].map((stat, i) => (
          <div 
            key={i}
            className="group rounded-[1.75rem] p-5 transition-all duration-1000 ease-out animate-fade-in-up hover:-translate-y-2 cursor-default glass-aero"
            style={{ animationDelay: `${stat.delay}ms` }}
          >
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-all duration-700 group-hover:scale-115 group-hover:rotate-12 glass-sm" style={{ boxShadow: `0 4px 12px -4px ${stat.color}20` }}>
                {stat.icon}
              </div>
              <span className="text-[11px] font-medium tracking-[0.12em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>{stat.label}</span>
            </div>
            <p className="text-[26px] font-light tracking-[-0.03em] transition-all duration-700 group-hover:scale-105 origin-left" style={{ color: 'var(--theme-text-primary)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-7 mb-12">
        <GlassPanel title="Monthly Pulse" subtitle="Income vs Expenses" icon={<BarChart3 className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />} delay={1800}>
          <div className="h-80"><Bar data={barChartData} options={barOptions} /></div>
        </GlassPanel>
        <GlassPanel title="Expense DNA" subtitle="Category breakdown" icon={<PieChart className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />} delay={1950}>
          {categoryExpenses.length > 0 ? (
            <div className="h-80"><Pie data={pieChartData} options={pieOptions} /></div>
          ) : (
            <div className="h-80 flex items-center justify-center"><p className="text-[14px] tracking-[0.03em] animate-pulse-subtle" style={{ color: 'var(--theme-text-tertiary)' }}>Awaiting data...</p></div>
          )}
        </GlassPanel>
      </div>

      {/* Wallets */}
      <GlassPanel title="Wallet Constellation" subtitle={`${wallets.filter(w => w.isActive).length} active`} icon={<Layers className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />} className="mb-12" delay={2100}>
        {wallets.length > 0 ? (
          <div className="space-y-7">
            <div className="space-y-3">
              <div className="flex justify-between text-[12px] tracking-[0.03em]">
                <span style={{ color: 'var(--theme-text-tertiary)' }}>Total Value</span>
                <span className="font-medium" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalWalletsBalance)}</span>
              </div>
              <div className="h-3.5 rounded-full overflow-hidden flex glass-sm">
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
                  <div key={w.label} className="group/item rounded-[1.5rem] p-5 transition-all duration-700 hover:-translate-y-2 cursor-default animate-fade-in-up glass-sm" style={{ animationDelay: `${2200 + i * 120}ms` }}>
                    <div className="flex items-center gap-3 mb-3.5">
                      <div className="w-9 h-9 rounded-[0.85rem] flex items-center justify-center transition-all duration-700 group-hover/item:scale-115 glass-sm">{IconEl}</div>
                      <span className="text-[12px] font-medium tracking-[0.03em]" style={{ color: 'var(--theme-text-secondary)' }}>{w.label}</span>
                    </div>
                    <p className="text-[18px] font-light tracking-[-0.02em] transition-all duration-700 group-hover/item:scale-105 origin-left" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(w.total)}</p>
                    <p className="text-[11px] mt-1.5 tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)' }}>{w.count} wallet(s)</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 animate-pulse-subtle"><p className="text-[14px] tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>No wallets found. <Link to="/wallets" style={{ color: 'var(--theme-primary)' }}>Initialize →</Link></p></div>
        )}
      </GlassPanel>

      {/* Recent & Goals */}
      <div className="grid lg:grid-cols-2 gap-7 mb-12">
        <GlassPanel title="Live Activity" icon={<Clock className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />}
          action={<Link to="/transactions" className="group/link flex items-center gap-2 text-[12px] font-medium tracking-[0.04em] transition-all duration-500" style={{ color: 'var(--theme-text-tertiary)' }}>All <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-1.5 transition-transform duration-500" strokeWidth={1.5} /></Link>}
          delay={2400}>
          <div className="space-y-1">
            {recentTransactions.map((t, i) => {
              const cat = getCategoryById(t.categoryId);
              if (!cat) return null;
              const IconComponent = getIconComponent(cat.icon);
              return (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-[1.25rem] transition-all duration-700 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-2 animate-fade-in-up glass-sm" style={{ animationDelay: `${2500 + i * 80}ms` }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-[1.15rem] flex items-center justify-center transition-all duration-700 hover:scale-115" style={{ backgroundColor: `${cat.color}14` }}>
                      <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{cat.name}</p>
                      <p className="text-[11px] tracking-[0.04em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t.description || formatDate(t.date, 'short')}</p>
                    </div>
                  </div>
                  <p className="text-[15px] font-medium tracking-[0.02em]" style={{ color: cat.type === 'income' ? '#10B981' : '#EF4444' }}>{cat.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</p>
                </div>
              );
            })}
            {recentTransactions.length === 0 && <div className="text-center py-12 animate-pulse-subtle"><p className="text-[14px] tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>No activity detected yet</p></div>}
          </div>
        </GlassPanel>

        <GlassPanel title="Goal Horizon" icon={<Target className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />}
          action={<Link to="/goals" className="group/link flex items-center gap-2 text-[12px] font-medium tracking-[0.04em] transition-all duration-500" style={{ color: 'var(--theme-text-tertiary)' }}>All <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-1.5 transition-transform duration-500" strokeWidth={1.5} /></Link>}
          delay={2400}>
          <div className="space-y-7">
            {activeGoals.map((goal, i) => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              return (
                <div key={goal.id} className="group/goal animate-fade-in-up" style={{ animationDelay: `${2500 + i * 120}ms` }}>
                  <div className="flex justify-between items-start mb-3">
                    <div><p className="text-[14px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{goal.name}</p><p className="text-[11px] mt-1 tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)' }}>Target: {formatDate(goal.targetDate, 'short')}</p></div>
                    <span className="text-[14px] font-medium tracking-[0.02em] transition-all duration-700 group-hover/goal:scale-115" style={{ color: 'var(--theme-text-secondary)' }}>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden transition-all duration-700 group-hover/goal:h-3.5 glass-sm">
                    <div className="h-full rounded-full transition-all duration-1500 ease-out group-hover/goal:brightness-125" style={{ width: `${progress}%`, background: 'var(--theme-gradient-primary)', boxShadow: '0 0 20px -6px var(--theme-primary)' }} />
                  </div>
                  <div className="flex justify-between mt-3 text-[11px] tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)' }}>
                    <span>{formatCurrency(goal.currentAmount)} saved</span><span>{formatCurrency(goal.targetAmount)} goal</span>
                  </div>
                </div>
              );
            })}
            {activeGoals.length === 0 && <div className="text-center py-12 animate-pulse-subtle"><p className="text-[14px] tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>Define your first goal</p></div>}
          </div>
        </GlassPanel>
      </div>

      {/* Debts */}
      <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '2600ms' }}>
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1.35rem] flex items-center justify-center transition-all duration-700 hover:scale-110 hover:rotate-12 glass-sm"><HandCoins className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} /></div>
            <h2 className="text-[26px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>Debt Topology</h2>
          </div>
          <Link to="/debts" className="group flex items-center gap-2 text-[13px] font-medium tracking-[0.04em] transition-all duration-500" style={{ color: 'var(--theme-text-tertiary)' }}>Manage <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-500" strokeWidth={1.5} /></Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-9">
          <StatCard label="I Owe" value={formatCurrency(totalBorrowed)} sublabel={`${borrowedDebts.length} active`} icon={<TrendingDown className="w-5 h-5" style={{ color: '#F87171' }} strokeWidth={1.5} />} accentColor="#EF4444" delay={2700} />
          <StatCard label="Owed to Me" value={formatCurrency(totalLent)} sublabel={`${lentDebts.length} active`} icon={<TrendingUp className="w-5 h-5" style={{ color: '#34D399' }} strokeWidth={1.5} />} accentColor="#10B981" delay={2850} />
          <StatCard label="Net Position" value={`${netDebtPosition >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netDebtPosition))}`} sublabel="Balance of debts" icon={<ArrowLeftRight className="w-5 h-5" style={{ color: '#A78BFA' }} strokeWidth={1.5} />} accentColor="#8B5CF6" delay={3000} />
        </div>

        {(totalBorrowed > 0 || totalLent > 0) && (
          <GlassPanel title="Debt Trajectory" subtitle="6-month projection" icon={<Clock className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />} className="mb-9" delay={3150}>
            <div className="h-80"><Line data={debtChartData} options={lineOptions} /></div>
          </GlassPanel>
        )}

        {topDebts.length > 0 && (
          <GlassPanel title="Active Obligations" icon={<HandCoins className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />} delay={3300}>
            <div className="space-y-2">
              {topDebts.map((debt, i) => {
                const progress = ((debt.originalAmount - debt.remainingBalance) / debt.originalAmount) * 100;
                const isBorrowed = debt.type === 'borrowed';
                return (
                  <Link key={debt.id} to="/debts" className="block p-5 rounded-[1.5rem] transition-all duration-700 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-3 animate-fade-in-up glass-sm" style={{ animationDelay: `${3400 + i * 120}ms` }}>
                    <div className="flex justify-between items-start mb-3">
                      <div><p className="text-[14px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{debt.creditorName}</p><p className="text-[11px] mt-1 tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)' }}>{isBorrowed ? 'Obligation' : 'Receivable'} · {formatCurrency(debt.monthlyPayment)}/mo</p></div>
                      <p className="text-[15px] font-medium tracking-[0.02em]" style={{ color: isBorrowed ? '#EF4444' : '#10B981' }}>{formatCurrency(debt.remainingBalance)}</p>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden transition-all duration-700 group-hover:h-3 glass-sm">
                      <div className="h-full rounded-full transition-all duration-1500 ease-out" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: isBorrowed ? '#EF4444' : '#10B981' }} />
                    </div>
                    <div className="flex justify-between mt-3 text-[11px] tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)' }}>
                      <span>{Math.round(progress)}% resolved</span><span>{debt.termMonths - Math.floor((Date.now() - new Date(debt.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months left</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </GlassPanel>
        )}

        {debts.length === 0 && (
          <div className="rounded-[2.5rem] p-16 text-center animate-pulse-subtle transition-all duration-1000 glass-aero">
            <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transition-all duration-700 hover:scale-110 glass-sm"><HandCoins className="w-10 h-10" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1} /></div>
            <p className="text-[16px] tracking-[0.03em] mb-2" style={{ color: 'var(--theme-text-tertiary)' }}>Debt-free zone</p>
            <p className="text-[13px] tracking-[0.04em] mb-7" style={{ color: 'var(--theme-text-tertiary)' }}>Begin your financial topology</p>
            <Link to="/debts" className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-[13px] font-medium tracking-[0.05em] transition-all duration-700 hover:-translate-y-1.5"
              style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF', boxShadow: '0 4px 24px -6px var(--theme-primary)' }}>
              Map your first debt <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-500" strokeWidth={2} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;