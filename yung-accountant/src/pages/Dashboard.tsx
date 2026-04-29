// pages/Dashboard.tsx
import React, { useMemo } from 'react';
import { useThemeStyles } from '../hooks/useTheme';
import { ThemeCard } from '../components/common/ThemeCard';
import { GradientText } from '../components/common/GradientText';
import { 
  useTransactionStore, 
  useCategoryStore, 
  useGoalStore, 
  useWalletStore, 
  useDebtStore,
  useTotalBalance,
  useGoalsAllocatedBalance,
  useDebtsBalance
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
  ArrowRight, 
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
  Wallet
} from 'lucide-react';
import { getIconComponent, getWalletIcon } from '../utils/iconHelpers';

// Registrar componentes de Chart.js
ChartJS.register(
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
);

const Dashboard: React.FC = () => {
  const { getChartColors, getStatCardClass } = useThemeStyles();
  
  // Obtener datos de cada store específico
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useCategoryStore((state) => state.categories);
  const goals = useGoalStore((state) => state.goals);
  const wallets = useWalletStore((state) => state.wallets);
  const debts = useDebtStore((state) => state.debts);
  
  // Selectores
  const totalBalance = useTotalBalance();
  const allocatedToGoals = useGoalsAllocatedBalance();
  const { borrowed: activeDebts, lent: _activeLent, net: netDebtPosition } = useDebtsBalance();

  // Calcular balances adicionales
  const realAvailableAfterDebts = totalBalance - activeDebts;
  const freeMoney = realAvailableAfterDebts - allocatedToGoals;

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const walletDistribution = useMemo(() => {
    const distribution: { [key: string]: { total: number; count: number; icon: React.ReactNode; color: string; label: string } } = {
      cash: { total: 0, count: 0, icon: '💵', color: 'var(--theme-primary)', label: 'Cash' },
      bank_account: { total: 0, count: 0, icon: '🏦', color: 'var(--theme-primary-light)', label: 'Bank Account' },
      credit_card: { total: 0, count: 0, icon: '💳', color: '#EF4444', label: 'Credit Card' },
      debit_card: { total: 0, count: 0, icon: '💳', color: '#F59E0B', label: 'Debit Card' },
      other: { total: 0, count: 0, icon: '📦', color: 'var(--theme-accent)', label: 'Other' },
    };

    wallets.forEach(wallet => {
      if (distribution[wallet.type]) {
        distribution[wallet.type].total += wallet.currentBalance;
        distribution[wallet.type].count++;
      } else {
        distribution.other.total += wallet.currentBalance;
        distribution.other.count++;
      }
    });

    return Object.values(distribution).filter(d => d.total > 0 || d.count > 0);
  }, [wallets]);

  const totalWalletsBalance = wallets.reduce((sum, w) => sum + w.currentBalance, 0);

  // Calcular ingresos y gastos por mes (últimos 6 meses)
  const monthlyData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentDate = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      const year = date.getFullYear();
      last6Months.push({ month: monthName, year, index: date.getMonth(), date });
    }
    
    const monthlyIncome = last6Months.map(m => {
      const startDate = new Date(m.date.getFullYear(), m.date.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0).toISOString().split('T')[0];
      return transactions
        .filter(t => {
          const cat = getCategoryById(t.categoryId);
          return cat?.type === 'income' && t.date >= startDate && t.date <= endDate;
        })
        .reduce((sum, t) => sum + t.amount, 0);
    });
    
    const monthlyExpenses = last6Months.map(m => {
      const startDate = new Date(m.date.getFullYear(), m.date.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0).toISOString().split('T')[0];
      return transactions
        .filter(t => {
          const cat = getCategoryById(t.categoryId);
          return cat?.type === 'expense' && t.date >= startDate && t.date <= endDate;
        })
        .reduce((sum, t) => sum + t.amount, 0);
    });
    
    return {
      labels: last6Months.map(m => `${m.month} ${m.year}`),
      income: monthlyIncome,
      expenses: monthlyExpenses,
    };
  }, [transactions]);

  // Calcular gastos por categoría (top 5)
  const categoryExpenses = useMemo(() => {
    const expenseMap = new Map<string, { name: string; amount: number; icon: string; color: string }>();
    
    transactions.forEach(t => {
      const cat = getCategoryById(t.categoryId);
      if (cat?.type === 'expense') {
        const current = expenseMap.get(cat.id) || { name: cat.name, amount: 0, icon: cat.icon, color: cat.color };
        current.amount += t.amount;
        expenseMap.set(cat.id, current);
      }
    });
    
    return Array.from(expenseMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  // Calcular ingresos por categoría (top 3)
  const categoryIncome = useMemo(() => {
    const incomeMap = new Map<string, { name: string; amount: number; icon: string; color: string }>();
    
    transactions.forEach(t => {
      const cat = getCategoryById(t.categoryId);
      if (cat?.type === 'income') {
        const current = incomeMap.get(cat.id) || { name: cat.name, amount: 0, icon: cat.icon, color: cat.color };
        current.amount += t.amount;
        incomeMap.set(cat.id, current);
      }
    });
    
    return Array.from(incomeMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [transactions]);

  // Transacciones recientes
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Metas activas (top 3)
  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3);

  // Obtener colores del tema para gráficas
  const chartColors = getChartColors();

  // Datos para gráficas con colores del tema
  const barChartData = {
    labels: monthlyData.labels,
    datasets: [
      {
        label: 'Income',
        data: monthlyData.income,
        backgroundColor: chartColors.income.backgroundColor,
        borderColor: chartColors.income.borderColor,
        borderWidth: 1.5,
        borderRadius: 8,
        barPercentage: 0.65,
        categoryPercentage: 0.8,
      },
      {
        label: 'Expenses',
        data: monthlyData.expenses,
        backgroundColor: chartColors.expense.backgroundColor,
        borderColor: chartColors.expense.borderColor,
        borderWidth: 1.5,
        borderRadius: 8,
        barPercentage: 0.65,
        categoryPercentage: 0.8,
      },
    ],
  };

  const pieChartData = {
    labels: categoryExpenses.map(c => c.name),
    datasets: [
      {
        data: categoryExpenses.map(c => c.amount),
        backgroundColor: categoryExpenses.map(c => c.color || 'var(--theme-primary)'),
        borderWidth: 0,
      },
    ],
  };

  const borrowedDebts = debts.filter(d => d.type === 'borrowed' && d.status === 'active');
  const lentDebts = debts.filter(d => d.type === 'lent' && d.status === 'active');
  const totalBorrowed = borrowedDebts.reduce((sum, d) => sum + d.remainingBalance, 0);
  const totalLent = lentDebts.reduce((sum, d) => sum + d.remainingBalance, 0);

  const debtEvolution = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentDate = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      last6Months.push({ month: months[date.getMonth()], year: date.getFullYear(), date });
    }
    
    const borrowedEvolution = last6Months.map(m => {
      const monthEnd = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0);
      return debts
        .filter(d => d.type === 'borrowed' && d.status === 'active' && new Date(d.startDate) <= monthEnd)
        .reduce((sum, d) => sum + d.remainingBalance, 0);
    });
    
    const lentEvolution = last6Months.map(m => {
      const monthEnd = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0);
      return debts
        .filter(d => d.type === 'lent' && d.status === 'active' && new Date(d.startDate) <= monthEnd)
        .reduce((sum, d) => sum + d.remainingBalance, 0);
    });
    
    return {
      labels: last6Months.map(m => `${m.month} ${m.year}`),
      borrowed: borrowedEvolution,
      lent: lentEvolution,
    };
  }, [debts]);

  // Top 5 deudas activas
  const topDebts = [...borrowedDebts, ...lentDebts]
    .sort((a, b) => b.remainingBalance - a.remainingBalance)
    .slice(0, 5);

  // Gráfico de evolución de deudas
  const debtChartData = {
    labels: debtEvolution.labels,
    datasets: [
      {
        label: 'I Owe',
        data: debtEvolution.borrowed,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Owed to Me',
        data: debtEvolution.lent,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { 
          color: 'var(--theme-text-secondary)',
          font: {
            size: 11,
            weight: 'normal' as const,
          },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: 'var(--theme-background-secondary)',
        titleColor: 'var(--theme-text-primary)',
        bodyColor: 'var(--theme-text-secondary)',
        borderColor: 'var(--theme-border-light)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
        },
      },
    },
    scales: {
      y: {
        grid: { color: 'var(--theme-border-dark)', drawBorder: false },
        ticks: { 
          color: 'var(--theme-text-tertiary)',
          callback: (value: any) => formatCurrency(value),
          font: {
            size: 10,
            weight: 'normal' as const,
          },
        },
      },
      x: {
        grid: { display: false },
        ticks: { 
          color: 'var(--theme-text-tertiary)',
          font: {
            size: 10,
            weight: 'normal' as const,
          },
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { 
          color: 'var(--theme-text-secondary)',
          font: {
            size: 10,
            weight: 'normal' as const,
          },
          boxWidth: 10,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: 'var(--theme-background-secondary)',
        titleColor: 'var(--theme-text-primary)',
        bodyColor: 'var(--theme-text-secondary)',
        borderColor: 'var(--theme-border-light)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => `${context.label}: ${formatCurrency(context.raw)}`,
        },
      },
    },
  };

  const debtChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { 
          color: 'var(--theme-text-secondary)',
          font: {
            size: 11,
            weight: 'normal' as const,
          },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: 'var(--theme-background-secondary)',
        titleColor: 'var(--theme-text-primary)',
        bodyColor: 'var(--theme-text-secondary)',
        borderColor: 'var(--theme-border-light)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
        },
      },
    },
    scales: {
      y: {
        grid: { color: 'var(--theme-border-dark)', drawBorder: false },
        ticks: { 
          color: 'var(--theme-text-tertiary)',
          callback: (value: any) => formatCurrency(value),
          font: {
            size: 10,
            weight: 'normal' as const,
          },
        },
      },
      x: {
        grid: { display: false },
        ticks: { 
          color: 'var(--theme-text-tertiary)',
          font: {
            size: 10,
            weight: 'normal' as const,
          },
        },
      },
    },
  };

  const totalIncome = transactions.filter(t => getCategoryById(t.categoryId)?.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => getCategoryById(t.categoryId)?.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <GradientText as="h1" className="text-2xl sm:text-3xl font-light tracking-tight">
            Dashboard
          </GradientText>
          <p className="text-xs text-[var(--theme-text-tertiary)] mt-1 font-light">
            Welcome back! Here's your financial overview
          </p>
        </div>
        <Link
          to="/calendar"
          className="group relative px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300 text-[var(--theme-text-primary)] text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg border border-[var(--theme-border-light)]"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          Add Transaction
        </Link>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Balance Real */}
        <ThemeCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Wallet className="w-5 h-5 text-[var(--theme-primary)]" />
              </div>
              <span className="text-xs text-[var(--theme-text-tertiary)] font-light">REAL BALANCE</span>
            </div>
          </div>
          <p className="text-2xl font-light text-[var(--theme-primary)]">
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-2 font-light">
            Money in wallets
          </p>
        </ThemeCard>

        {/* Deudas Activas */}
        <ThemeCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-xs text-[var(--theme-text-tertiary)] font-light">ACTIVE DEBTS</span>
            </div>
          </div>
          <p className="text-2xl font-light text-red-500">{formatCurrency(activeDebts)}</p>
          <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-2 font-light">
            Money owed (borrowed)
          </p>
        </ThemeCard>

        {/* Reservado para Goals */}
        <div className={getStatCardClass()}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Target className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-xs text-[var(--theme-text-tertiary)] font-light">RESERVED FOR GOALS</span>
            </div>
          </div>
          <p className="text-2xl font-light text-yellow-500">{formatCurrency(allocatedToGoals)}</p>
          <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-2 font-light">Savings promise (virtual)</p>
        </div>

        {/* Dinero Libre */}
        <div className={getStatCardClass()}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-xs text-[var(--theme-text-tertiary)] font-light">FREE MONEY</span>
            </div>
          </div>
          <p className="text-2xl font-light text-green-500">{formatCurrency(freeMoney)}</p>
          <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-2 font-light">After debts & goals</p>
        </div>
      </div>

      {/* Explicación de métricas */}
      <div className="mb-6 p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)] text-center">
        <p className="text-[10px] text-[var(--theme-text-tertiary)] font-light">
          💡 <span className="text-[var(--theme-text-secondary)]">How it works:</span> Goals are savings promises that don't move real money. 
          "Free Money" shows what you can actually spend after considering debts and your savings promises.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-[10px] text-[var(--theme-text-tertiary)] font-light">TOTAL INCOME</span>
          </div>
          <p className="text-lg sm:text-xl font-light text-green-500">+{formatCurrency(totalIncome)}</p>
          <p className="text-[8px] text-[var(--theme-text-tertiary)] mt-1 font-light">All time</p>
        </div>
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-[10px] text-[var(--theme-text-tertiary)] font-light">TOTAL EXPENSES</span>
          </div>
          <p className="text-lg sm:text-xl font-light text-red-500">-{formatCurrency(totalExpenses)}</p>
          <p className="text-[8px] text-[var(--theme-text-tertiary)] mt-1 font-light">All time</p>
        </div>
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[var(--theme-primary)]" />
            <span className="text-[10px] text-[var(--theme-text-tertiary)] font-light">SAVINGS RATE</span>
          </div>
          <p className="text-lg sm:text-xl font-light text-[var(--theme-primary)]">{savingsRate.toFixed(1)}%</p>
          <p className="text-[8px] text-[var(--theme-text-tertiary)] mt-1 font-light">of total income</p>
        </div>
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] text-[var(--theme-text-tertiary)] font-light">ACTIVE GOALS</span>
          </div>
          <p className="text-lg sm:text-xl font-light text-orange-500">{activeGoals.length}</p>
          <p className="text-[8px] text-[var(--theme-text-tertiary)] mt-1 font-light">In progress</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Income vs Expenses */}
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--theme-primary)]" />
              <h3 className="text-sm font-light text-[var(--theme-text-secondary)]">Monthly Trends</h3>
            </div>
            <span className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Last 6 months</span>
          </div>
          <div className="h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[var(--theme-primary)]" />
              <h3 className="text-sm font-light text-[var(--theme-text-secondary)]">Expenses by Category</h3>
            </div>
            <span className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Top 5</span>
          </div>
          {categoryExpenses.length > 0 ? (
            <div className="h-64">
              <Pie data={pieChartData} options={pieOptions} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-[var(--theme-text-tertiary)] text-sm font-light">
              No expense data yet
            </div>
          )}
        </div>
      </div>

      {/* Wallets Distribution */}
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4 sm:p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[var(--theme-primary)]" />
            <h3 className="text-sm font-light text-[var(--theme-text-secondary)]">Money Distribution by Wallet</h3>
          </div>
          <span className="text-[9px] text-[var(--theme-text-tertiary)] font-light">{wallets.filter(w => w.isActive).length} active wallets</span>
        </div>
        
        {wallets.length > 0 ? (
          <div className="space-y-4">
            {/* Progress bar general */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--theme-text-tertiary)] font-light">Total across all wallets</span>
                <span className="text-[var(--theme-text-secondary)] font-light">{formatCurrency(totalWalletsBalance)}</span>
              </div>
              <div className="h-2 bg-[var(--theme-border-dark)] rounded-full overflow-hidden flex">
                {walletDistribution.map((wallet) => {
                  const percentage = totalWalletsBalance > 0 ? (wallet.total / totalWalletsBalance) * 100 : 0;
                  if (percentage === 0) return null;
                  return (
                    <div
                      key={wallet.label}
                      className="h-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: wallet.color }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Grid de wallets - Usando Lucide icons en lugar de emojis */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {walletDistribution.map(wallet => {
                // Obtener el componente de icono según el tipo de wallet
                const WalletIcon = getWalletIcon(
                  wallet.icon === 'Cash' ? 'cash' : 
                  wallet.icon === 'Bank Account' ? 'bank_account' :
                  wallet.icon === 'Credit Card' ? 'credit_card' :
                  wallet.icon === 'Debit Card' ? 'debit_card' : 'other',
                  "w-4 h-4",
                  wallet.color
                );
                
                return (
                  <div
                    key={wallet.label}
                    className="bg-[var(--theme-background-glass-hover)] rounded-lg p-3 border border-[var(--theme-border-dark)] hover:border-[var(--theme-border-light)] transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-[var(--theme-primary)]/10 group-hover:scale-110 transition-transform">
                        {WalletIcon}
                      </div>
                      <span className="text-xs font-light text-[var(--theme-text-secondary)]">{wallet.label}</span>
                    </div>
                    <p className="text-sm font-light text-[var(--theme-text-primary)]">{formatCurrency(wallet.total)}</p>
                    <p className="text-[9px] text-[var(--theme-text-tertiary)] mt-1 font-light">{wallet.count} wallet(s)</p>
                  </div>
                );
              })}
            </div>

            {/* Lista detallada de wallets - Usando Lucide icons */}
            <div className="mt-4 pt-4 border-t border-[var(--theme-border-light)]">
              <p className="text-[10px] text-[var(--theme-text-tertiary)] mb-2 font-light">Detailed breakdown</p>
              <div className="space-y-2">
                {wallets.filter(w => w.isActive).map(wallet => {
                  const typeInfo = walletDistribution.find(d => {
                    if (wallet.type === 'cash') return d.label === 'Cash';
                    if (wallet.type === 'bank_account') return d.label === 'Bank Account';
                    if (wallet.type === 'credit_card') return d.label === 'Credit Card';
                    if (wallet.type === 'debit_card') return d.label === 'Debit Card';
                    return d.label === 'Other';
                  });
                  
                  // Obtener el icono correcto según el tipo
                  const WalletIcon = getWalletIcon(
                    wallet.type,
                    "w-4 h-4",
                    wallet.color
                  );
                  
                  return (
                    <div key={wallet.id} className="flex items-center justify-between py-2 group">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--theme-background-glass)] group-hover:bg-[var(--theme-primary)]/10 transition-all">
                          {WalletIcon}
                        </div>
                        <div>
                          <p className="text-xs font-light text-[var(--theme-text-primary)]">{wallet.name}</p>
                          {wallet.lastFourDigits && (
                            <p className="text-[9px] text-[var(--theme-text-tertiary)]">****{wallet.lastFourDigits}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-light text-[var(--theme-text-primary)]">{formatCurrency(wallet.currentBalance)}</p>
                        <p className="text-[9px] text-[var(--theme-text-tertiary)]">
                          {typeInfo && totalWalletsBalance > 0 
                            ? `${((wallet.currentBalance / totalWalletsBalance) * 100).toFixed(1)}% of total`
                            : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--theme-text-tertiary)] text-sm font-light">
            No wallets configured yet. Go to <Link to="/wallets" className="text-[var(--theme-primary)] hover:underline">Wallets</Link> to add one.
          </div>
        )}
      </div>

      {/* Recent Transactions & Active Goals */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Transactions */}
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[var(--theme-border-light)]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--theme-primary)]" />
              <h3 className="text-sm font-light text-[var(--theme-text-secondary)]">Recent Transactions</h3>
            </div>
            <Link to="/transactions" className="text-[10px] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors flex items-center gap-1 group">
              View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--theme-border-dark)]">
            {recentTransactions.map(t => {
              const cat = getCategoryById(t.categoryId);
              if (!cat) return null;
              
              // Obtener el componente del icono de la categoría
              const IconComponent = getIconComponent(cat.icon);
              
              return (
                <div key={t.id} className="flex items-center justify-between p-3 sm:p-4 transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] group">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-light text-[var(--theme-text-primary)]">{cat.name}</p>
                      <p className="text-[10px] text-[var(--theme-text-tertiary)]">{t.description || formatDate(t.date, 'short')}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-light ${cat.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {cat.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                </div>
              );
            })}
            {recentTransactions.length === 0 && (
              <div className="text-center py-8 text-[var(--theme-text-tertiary)] text-sm font-light">
                No transactions yet
              </div>
            )}
          </div>
        </div>

        {/* Active Goals */}
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[var(--theme-border-light)]">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--theme-primary)]" />
              <h3 className="text-sm font-light text-[var(--theme-text-secondary)]">Active Goals</h3>
            </div>
            <Link to="/goals" className="text-[10px] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors flex items-center gap-1 group">
              View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--theme-border-dark)]">
            {activeGoals.map(goal => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <div key={goal.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-light text-[var(--theme-text-primary)]">{goal.name}</p>
                      <p className="text-[10px] text-[var(--theme-text-tertiary)]">Deadline: {formatDate(goal.targetDate, 'short')}</p>
                    </div>
                    <p className="text-xs font-light text-[var(--theme-text-secondary)]">{Math.round(progress)}%</p>
                  </div>
                  <div className="h-1.5 bg-[var(--theme-border-dark)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-light)] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-[var(--theme-text-tertiary)] font-light">
                    <span>Saved: {formatCurrency(goal.currentAmount)}</span>
                    <span>Target: {formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>
              );
            })}
            {activeGoals.length === 0 && (
              <div className="text-center py-8 text-[var(--theme-text-tertiary)] text-sm font-light">
                No active goals
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debts Section */}
      <div className="mb-8 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-light text-[var(--theme-text-primary)]">Debts Overview</h2>
          </div>
          <Link to="/debts" className="text-[10px] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors flex items-center gap-1 group">
            Manage Debts <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Debt Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className={getStatCardClass()}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <span className="text-xs text-[var(--theme-text-tertiary)] font-light">I OWE</span>
            </div>
            <p className="text-2xl font-light text-red-500">{formatCurrency(totalBorrowed)}</p>
            <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-1 font-light">{borrowedDebts.length} active debts</p>
          </div>
          <div className={getStatCardClass()}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-xs text-[var(--theme-text-tertiary)] font-light">OWED TO ME</span>
            </div>
            <p className="text-2xl font-light text-green-500">{formatCurrency(totalLent)}</p>
            <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-1 font-light">{lentDebts.length} active debts</p>
          </div>
          <div className={getStatCardClass()}>
            <div className="flex items-center gap-2 mb-2">
              <ArrowLeftRight className="w-5 h-5 text-[var(--theme-primary)]" />
              <span className="text-xs text-[var(--theme-text-tertiary)] font-light">NET POSITION</span>
            </div>
            <p className={`text-2xl font-light ${netDebtPosition >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {netDebtPosition >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netDebtPosition))}
            </p>
            <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-1 font-light">What I'm owed - What I owe</p>
          </div>
        </div>

        {/* Debt Evolution Chart */}
        {(totalBorrowed > 0 || totalLent > 0) && (
          <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4 sm:p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[var(--theme-primary)]" />
              <h3 className="text-sm font-light text-[var(--theme-text-secondary)]">Debt Evolution</h3>
              <span className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Last 6 months</span>
            </div>
            <div className="h-64">
              <Line data={debtChartData} options={debtChartOptions} />
            </div>
          </div>
        )}

        {/* Top Debts List */}
        {topDebts.length > 0 && (
          <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[var(--theme-border-light)]">
              <h3 className="text-sm font-light text-[var(--theme-text-secondary)]">Active Debts</h3>
            </div>
            <div className="divide-y divide-[var(--theme-border-dark)]">
              {topDebts.map(debt => {
                const progress = ((debt.originalAmount - debt.remainingBalance) / debt.originalAmount) * 100;
                const isBorrowed = debt.type === 'borrowed';
                return (
                  <Link key={debt.id} to="/debts" className="block p-4 hover:bg-[var(--theme-background-glass-hover)] transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-light text-[var(--theme-text-primary)]">{debt.creditorName}</p>
                        <p className="text-[10px] text-[var(--theme-text-tertiary)] font-light">
                          {isBorrowed ? 'I Owe' : 'Owed to Me'} • {formatCurrency(debt.monthlyPayment)}/month
                        </p>
                      </div>
                      <p className={`text-sm font-light ${isBorrowed ? 'text-red-500' : 'text-green-500'}`}>
                        {formatCurrency(debt.remainingBalance)}
                      </p>
                    </div>
                    <div className="h-1.5 bg-[var(--theme-border-dark)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isBorrowed ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-[var(--theme-text-tertiary)] font-light">
                      <span>{Math.round(progress)}% paid</span>
                      <span>{debt.termMonths - Math.floor((new Date().getTime() - new Date(debt.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months left</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            {debts.length > 5 && (
              <div className="p-3 text-center border-t border-[var(--theme-border-light)]">
                <Link to="/debts" className="text-[10px] text-[var(--theme-primary)] hover:underline">View all {debts.length} debts →</Link>
              </div>
            )}
          </div>
        )}

        {debts.length === 0 && (
          <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-8 text-center">
            <HandCoins className="w-12 h-12 mx-auto mb-3 text-[var(--theme-text-tertiary)]" />
            <p className="text-[var(--theme-text-tertiary)] text-sm font-light">No debts recorded</p>
            <Link to="/debts" className="inline-block mt-3 text-xs text-[var(--theme-primary)] hover:underline">Add your first debt →</Link>
          </div>
        )}
      </div>

      {/* Income by Category */}
      {categoryIncome.length > 0 && (
        <div className="mt-6 bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-light text-[var(--theme-text-secondary)]">Income by Category</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryIncome.map(cat => (
              <div key={cat.name} className="flex items-center justify-between p-3 bg-[var(--theme-background-glass-hover)] rounded-lg border border-[var(--theme-border-dark)] hover:border-[var(--theme-border-light)] transition-all duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm font-light text-[var(--theme-text-primary)]">{cat.name}</span>
                </div>
                <span className="text-sm font-light text-green-500">+{formatCurrency(cat.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;