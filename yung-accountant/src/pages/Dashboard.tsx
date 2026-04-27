// pages/Dashboard.tsx

import React, { useMemo } from 'react';
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
import { Activity, ArrowLeftRight, ArrowRight, BarChart3, Calendar, Clock, HandCoins, PieChart, Plus, Sparkles, Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

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
      cash: { total: 0, count: 0, icon: '💵', color: '#10B981', label: 'Cash' },
      bank_account: { total: 0, count: 0, icon: '🏦', color: '#6366F1', label: 'Bank Account' },
      credit_card: { total: 0, count: 0, icon: '💳', color: '#EF4444', label: 'Credit Card' },
      debit_card: { total: 0, count: 0, icon: '💳', color: '#F59E0B', label: 'Debit Card' },
      other: { total: 0, count: 0, icon: '📦', color: '#8B5CF6', label: 'Other' },
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

  // Datos para gráficas
  const barChartData = {
    labels: monthlyData.labels,
    datasets: [
      {
        label: 'Income',
        data: monthlyData.income,
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: '#10B981',
        borderWidth: 1,
        borderRadius: 8,
      },
      {
        label: 'Expenses',
        data: monthlyData.expenses,
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: '#EF4444',
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const pieChartData = {
    labels: categoryExpenses.map(c => c.name),
    datasets: [
      {
        data: categoryExpenses.map(c => c.amount),
        backgroundColor: categoryExpenses.map(c => c.color || '#6366F1'),
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
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#fff',
        pointRadius: 3,
      },
      {
        label: 'Owed to Me',
        data: debtEvolution.lent,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#fff',
        pointRadius: 3,
      },
    ],
  };

  const debtChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#9CA3AF', font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
        },
      },
    },
    scales: {
      y: {
        grid: { color: '#374151' },
        ticks: { color: '#9CA3AF', callback: (value: any) => formatCurrency(value) },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9CA3AF' },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#9CA3AF', font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
        },
      },
    },
    scales: {
      y: {
        grid: { color: '#374151' },
        ticks: { color: '#9CA3AF', callback: (value: any) => formatCurrency(value) },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9CA3AF' },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: '#9CA3AF', font: { size: 10 } },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.label}: ${formatCurrency(context.raw)}`,
        },
      },
    },
  };

  const totalIncome = transactions.filter(t => getCategoryById(t.categoryId)?.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => getCategoryById(t.categoryId)?.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-white/40 mt-0.5 font-light">Welcome back! Here's your financial overview</p>
        </div>
        <Link
          to="/calendar"
          className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          Add Transaction
        </Link>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Balance Real */}
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-5 border border-gray-800 hover:border-[#6366F1]/30 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Wallet className="w-5 h-5 text-[#6366F1]" />
              </div>
              <span className="text-xs text-white/40">💰 REAL BALANCE</span>
            </div>
          </div>
          <p className="text-2xl font-light text-[#6366F1]">{formatCurrency(totalBalance)}</p>
          <p className="text-[9px] text-white/30 mt-2">Money in wallets</p>
        </div>

        {/* Deudas Activas */}
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-5 border border-gray-800 hover:border-red-500/30 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-xs text-white/40">📋 ACTIVE DEBTS</span>
            </div>
          </div>
          <p className="text-2xl font-light text-red-500">{formatCurrency(activeDebts)}</p>
          <p className="text-[9px] text-white/30 mt-2">Money owed (borrowed)</p>
        </div>

        {/* Reservado para Goals */}
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-5 border border-gray-800 hover:border-yellow-500/30 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Target className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-xs text-white/40">🎯 RESERVED FOR GOALS</span>
            </div>
          </div>
          <p className="text-2xl font-light text-yellow-500">{formatCurrency(allocatedToGoals)}</p>
          <p className="text-[9px] text-white/30 mt-2">Savings promise (virtual)</p>
        </div>

        {/* Dinero Libre */}
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-5 border border-gray-800 hover:border-green-500/30 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-xs text-white/40">✨ FREE MONEY</span>
            </div>
          </div>
          <p className="text-2xl font-light text-green-500">{formatCurrency(freeMoney)}</p>
          <p className="text-[9px] text-white/30 mt-2">After debts & goals</p>
        </div>
      </div>

      {/* Explicación de métricas */}
      <div className="mb-6 p-3 bg-white/[0.02] rounded-lg border border-white/5 text-center">
        <p className="text-[10px] text-white/30">
          💡 <span className="text-white/40">How it works:</span> Goals are savings promises that don't move real money. 
          "Free Money" shows what you can actually spend after considering debts and your savings promises.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-white/40">TOTAL INCOME</span>
          </div>
          <p className="text-xl font-light text-green-500">+{formatCurrency(totalIncome)}</p>
          <p className="text-[9px] text-white/30 mt-1">All time</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs text-white/40">TOTAL EXPENSES</span>
          </div>
          <p className="text-xl font-light text-red-500">-{formatCurrency(totalExpenses)}</p>
          <p className="text-[9px] text-white/30 mt-1">All time</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#6366F1]" />
            <span className="text-xs text-white/40">SAVINGS RATE</span>
          </div>
          <p className="text-xl font-light text-[#6366F1]">{savingsRate.toFixed(1)}%</p>
          <p className="text-[9px] text-white/30 mt-1">of total income</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-white/40">ACTIVE GOALS</span>
          </div>
          <p className="text-xl font-light text-orange-500">{activeGoals.length}</p>
          <p className="text-[9px] text-white/30 mt-1">In progress</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Income vs Expenses */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#6366F1]" />
              <h3 className="text-sm font-light text-white/60">Monthly Trends</h3>
            </div>
            <span className="text-[9px] text-white/30">Last 6 months</span>
          </div>
          <div className="h-64">
            <Bar data={barChartData} options={barOptions} />
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#6366F1]" />
              <h3 className="text-sm font-light text-white/60">Expenses by Category</h3>
            </div>
            <span className="text-[9px] text-white/30">Top 5</span>
          </div>
          {categoryExpenses.length > 0 ? (
            <div className="h-64">
              <Pie data={pieChartData} options={pieOptions} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-white/40 text-sm font-light">
              No expense data yet
            </div>
          )}
        </div>
      </div>

      {/* Wallets Distribution */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#6366F1]" />
            <h3 className="text-sm font-light text-white/60">Money Distribution by Wallet</h3>
          </div>
          <span className="text-[9px] text-white/30">{wallets.filter(w => w.isActive).length} active wallets</span>
        </div>
        
        {wallets.length > 0 ? (
          <div className="space-y-4">
            {/* Progress bar general */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Total across all wallets</span>
                <span className="text-white/60">{formatCurrency(totalWalletsBalance)}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                {walletDistribution.map((wallet) => {
                  const percentage = totalWalletsBalance > 0 ? (wallet.total / totalWalletsBalance) * 100 : 0;
                  if (percentage === 0) return null;
                  return (
                    <div
                      key={wallet.label}
                      className="h-full"
                      style={{ width: `${percentage}%`, backgroundColor: wallet.color }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Grid de wallets */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {walletDistribution.map(wallet => (
                <div
                  key={wallet.label}
                  className="bg-white/[0.02] rounded-lg p-3 border border-white/5 hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{wallet.icon}</span>
                    <span className="text-xs font-light text-white/60">{wallet.label}</span>
                  </div>
                  <p className="text-sm font-light text-white">{formatCurrency(wallet.total)}</p>
                  <p className="text-[9px] text-white/30 mt-1">{wallet.count} wallet(s)</p>
                </div>
              ))}
            </div>

            {/* Lista detallada de wallets */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-[10px] text-white/40 mb-2">Detailed breakdown</p>
              <div className="space-y-2">
                {wallets.filter(w => w.isActive).map(wallet => {
                  const typeInfo = walletDistribution.find(d => {
                    if (wallet.type === 'cash') return d.label === 'Cash';
                    if (wallet.type === 'bank_account') return d.label === 'Bank Account';
                    if (wallet.type === 'credit_card') return d.label === 'Credit Card';
                    if (wallet.type === 'debit_card') return d.label === 'Debit Card';
                    return d.label === 'Other';
                  });
                  return (
                    <div key={wallet.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{wallet.icon}</span>
                        <div>
                          <p className="text-xs font-light text-white/80">{wallet.name}</p>
                          {wallet.lastFourDigits && (
                            <p className="text-[9px] text-white/30">****{wallet.lastFourDigits}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-light text-white">{formatCurrency(wallet.currentBalance)}</p>
                        <p className="text-[9px] text-white/30">
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
          <div className="text-center py-8 text-white/40 text-sm font-light">
            No wallets configured yet. Go to <Link to="/wallets" className="text-[#6366F1] hover:underline">Wallets</Link> to add one.
          </div>
        )}
      </div>

      {/* Recent Transactions & Active Goals */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#6366F1]" />
              <h3 className="text-sm font-light text-white/60">Recent Transactions</h3>
            </div>
            <Link to="/transactions" className="text-[11px] text-white/40 hover:text-white transition-colors flex items-center gap-1 group">
              View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentTransactions.map(t => {
              const cat = getCategoryById(t.categoryId);
              if (!cat) return null;
              return (
                <div key={t.id} className="flex items-center justify-between p-4 transition-all duration-300 hover:bg-white/5 group">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <p className="text-sm font-light text-white">{cat.name}</p>
                      <p className="text-[10px] text-white/40">{t.description || formatDate(t.date)}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-light ${cat.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {cat.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                </div>
              );
            })}
            {recentTransactions.length === 0 && (
              <div className="text-center py-8 text-white/40 text-sm font-light">
                No transactions yet
              </div>
            )}
          </div>
        </div>

        {/* Active Goals */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#6366F1]" />
              <h3 className="text-sm font-light text-white/60">Active Goals</h3>
            </div>
            <Link to="/goals" className="text-[11px] text-white/40 hover:text-white transition-colors flex items-center gap-1 group">
              View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {activeGoals.map(goal => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <div key={goal.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-light text-white">{goal.name}</p>
                      <p className="text-[10px] text-white/40">Deadline: {formatDate(goal.targetDate, 'short')}</p>
                    </div>
                    <p className="text-xs font-light text-white/60">{Math.round(progress)}%</p>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-white/40">
                    <span>Saved: {formatCurrency(goal.currentAmount)}</span>
                    <span>Target: {formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>
              );
            })}
            {activeGoals.length === 0 && (
              <div className="text-center py-8 text-white/40 text-sm font-light">
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
            <HandCoins className="w-5 h-5 text-[#EF4444]" />
            <h2 className="text-lg font-light text-white">Debts Overview</h2>
          </div>
          <Link to="/debts" className="text-[11px] text-white/40 hover:text-white transition-colors flex items-center gap-1 group">
            Manage Debts <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Debt Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <span className="text-xs text-white/40">I OWE</span>
            </div>
            <p className="text-2xl font-light text-red-500">{formatCurrency(totalBorrowed)}</p>
            <p className="text-[10px] text-white/30 mt-1">{borrowedDebts.length} active debts</p>
          </div>
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-xs text-white/40">OWED TO ME</span>
            </div>
            <p className="text-2xl font-light text-green-500">{formatCurrency(totalLent)}</p>
            <p className="text-[10px] text-white/30 mt-1">{lentDebts.length} active debts</p>
          </div>
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <ArrowLeftRight className="w-5 h-5 text-[#6366F1]" />
              <span className="text-xs text-white/40">NET POSITION</span>
            </div>
            <p className={`text-2xl font-light ${netDebtPosition >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {netDebtPosition >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netDebtPosition))}
            </p>
            <p className="text-[10px] text-white/30 mt-1">What I'm owed - What I owe</p>
          </div>
        </div>

        {/* Debt Evolution Chart */}
        {(totalBorrowed > 0 || totalLent > 0) && (
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#6366F1]" />
              <h3 className="text-sm font-light text-white/60">Debt Evolution</h3>
              <span className="text-[9px] text-white/30">Last 6 months</span>
            </div>
            <div className="h-64">
              <Line data={debtChartData} options={debtChartOptions} />
            </div>
          </div>
        )}

        {/* Top Debts List */}
        {topDebts.length > 0 && (
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-light text-white/60">Active Debts</h3>
            </div>
            <div className="divide-y divide-white/5">
              {topDebts.map(debt => {
                const progress = ((debt.originalAmount - debt.remainingBalance) / debt.originalAmount) * 100;
                const isBorrowed = debt.type === 'borrowed';
                return (
                  <Link key={debt.id} to="/debts" className="block p-4 hover:bg-white/5 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-light text-white">{debt.creditorName}</p>
                        <p className="text-[10px] text-white/40">
                          {isBorrowed ? 'I Owe' : 'Owed to Me'} • {formatCurrency(debt.monthlyPayment)}/month
                        </p>
                      </div>
                      <p className={`text-sm font-light ${isBorrowed ? 'text-red-500' : 'text-green-500'}`}>
                        {formatCurrency(debt.remainingBalance)}
                      </p>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isBorrowed ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-white/30">
                      <span>{Math.round(progress)}% paid</span>
                      <span>{debt.termMonths - Math.floor((new Date().getTime() - new Date(debt.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months left</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            {debts.length > 5 && (
              <div className="p-3 text-center border-t border-white/10">
                <Link to="/debts" className="text-[10px] text-[#6366F1] hover:underline">View all {debts.length} debts →</Link>
              </div>
            )}
          </div>
        )}

        {debts.length === 0 && (
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
            <HandCoins className="w-12 h-12 mx-auto mb-3 text-white/20" />
            <p className="text-white/40 text-sm font-light">No debts recorded</p>
            <Link to="/debts" className="inline-block mt-3 text-xs text-[#6366F1] hover:underline">Add your first debt →</Link>
          </div>
        )}
      </div>

      {/* Income by Category */}
      {categoryIncome.length > 0 && (
        <div className="mt-6 bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-light text-white/60">Income by Category</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categoryIncome.map(cat => (
              <div key={cat.name} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm font-light text-white/80">{cat.name}</span>
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