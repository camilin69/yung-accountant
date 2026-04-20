// pages/Dashboard.tsx

import React from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Target, 
  Calendar, 
  Flame,
  Sparkles,
  ArrowRight,
  Clock,
  Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { transactions, categories, goals } = useStore();

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const totalIncome = transactions
    .filter(t => {
      const cat = getCategoryById(t.categoryId);
      return cat?.type === 'income';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => {
      const cat = getCategoryById(t.categoryId);
      return cat?.type === 'expense';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3);

  // Category totals for preview
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const categoryTotals = expenseCategories.map(cat => ({
    ...cat,
    total: transactions
      .filter(t => t.categoryId === cat.id)
      .reduce((sum, t) => sum + t.amount, 0)
  })).filter(c => c.total > 0).slice(0, 4);

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#6366F1]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Wallet className="w-5 h-5 text-[#6366F1]/80" />
            </div>
            <Sparkles className="w-3.5 h-3.5 text-white/20" />
          </div>
          <p className="text-2xl font-light text-white">{formatCurrency(balance)}</p>
          <p className="text-[11px] text-white/40 mt-1 font-light">Current Balance</p>
        </div>
        
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-5 h-5 text-green-500/80" />
            </div>
            <span className="text-[10px] text-white/30">This month</span>
          </div>
          <p className="text-2xl font-light text-green-500">+{formatCurrency(totalIncome)}</p>
          <p className="text-[11px] text-white/40 mt-1 font-light">Total Income</p>
        </div>
        
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingDown className="w-5 h-5 text-red-500/80" />
            </div>
            <span className="text-[10px] text-white/30">This month</span>
          </div>
          <p className="text-2xl font-light text-red-500">-{formatCurrency(totalExpenses)}</p>
          <p className="text-[11px] text-white/40 mt-1 font-light">Total Expenses</p>
        </div>
        
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Flame className="w-5 h-5 text-yellow-500/80" />
            </div>
            <span className="text-[10px] text-white/30">Target 20%</span>
          </div>
          <p className="text-2xl font-light text-yellow-500">{Math.round(savingsRate)}%</p>
          <p className="text-[11px] text-white/40 mt-1 font-light">Savings Rate</p>
        </div>
      </div>

      {/* Savings Progress Bar */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 mb-8">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-yellow-500/80" />
            <span className="text-sm font-light text-white">Savings Progress</span>
          </div>
          <span className="text-xs text-white/40">Target: 20% of income</span>
        </div>
        <div className="relative">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(savingsRate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-white/30">0%</span>
            <span className="text-[10px] text-white/30">100%</span>
          </div>
        </div>
        {savingsRate >= 20 ? (
          <p className="mt-3 text-green-500/80 text-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Congratulations! You've reached your savings goal!
          </p>
        ) : (
          <p className="mt-3 text-yellow-500/80 text-xs flex items-center gap-1">
            <Flame className="w-3 h-3" /> You're {Math.round(20 - savingsRate)}% away from your savings goal. Keep going!
          </p>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6366F1]/80" />
                <h2 className="text-sm font-light text-white">Recent Transactions</h2>
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
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all duration-300 group-hover:scale-110"
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
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.03] flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm font-light">No transactions yet</p>
                  <Link to="/calendar" className="inline-block mt-3 text-xs text-[#6366F1]/80 hover:text-[#6366F1] transition-colors">
                    Add your first transaction →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categories Summary */}
        <div>
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 p-5 border-b border-white/10">
              <Tag className="w-4 h-4 text-[#6366F1]/80" />
              <h2 className="text-sm font-light text-white">Top Categories</h2>
            </div>
            
            <div className="p-4 space-y-3">
              {categoryTotals.map(cat => (
                <div key={cat.id} className="flex justify-between items-center group">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-sm font-light text-white/80">{cat.name}</span>
                  </div>
                  <span className="text-sm font-light text-red-500/80">-{formatCurrency(cat.total)}</span>
                </div>
              ))}
              
              {categoryTotals.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-white/40 text-sm font-light">No expense data yet</p>
                </div>
              )}
              
              <div className="pt-3 mt-2 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-light text-white/60">Total Expenses</span>
                  <span className="text-base font-light text-red-500">{formatCurrency(totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#6366F1]/80" />
              <h2 className="text-sm font-light text-white">Active Goals</h2>
            </div>
            <Link to="/goals" className="text-[11px] text-white/40 hover:text-white transition-colors flex items-center gap-1 group">
              View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {activeGoals.map(goal => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const remaining = goal.targetAmount - goal.currentAmount;
              const priorityColor = goal.priority === 'high' ? 'text-red-500/80' : 
                                   goal.priority === 'medium' ? 'text-yellow-500/80' : 
                                   'text-green-500/80';
              const priorityBg = goal.priority === 'high' ? 'bg-red-500/10' : 
                                 goal.priority === 'medium' ? 'bg-yellow-500/10' : 
                                 'bg-green-500/10';
              
              return (
                <div key={goal.id} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-light text-white">{goal.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityBg} ${priorityColor}`}>
                      {goal.priority}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-white/40">Saved: {formatCurrency(goal.currentAmount)}</span>
                    <span className="text-white/40">Target: {formatCurrency(goal.targetAmount)}</span>
                  </div>
                  
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[10px] text-white/40 mb-3">
                    <span>{Math.round(progress)}% complete</span>
                    <span>{formatCurrency(remaining)} left</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-[10px] text-white/30">
                    <Calendar className="w-3 h-3" />
                    Deadline: {formatDate(goal.targetDate, 'long')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State for Goals */}
      {activeGoals.length === 0 && goals.length === 0 && (
        <div className="mt-8 bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
          <Target className="w-12 h-12 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 text-sm font-light">No active goals yet</p>
          <Link to="/goals" className="inline-block mt-3 text-xs text-[#6366F1]/80 hover:text-[#6366F1] transition-colors">
            Create your first goal →
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;