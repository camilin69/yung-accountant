// pages/Dashboard.tsx

import React from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Wallet, TrendingUp, ArrowUp, ArrowDown, Plus, Target, Calendar, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { transactions, goals } = useStore();

  const totalIncome = transactions
    .filter(t => t.isIncome)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => !t.isIncome)
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3);

  // Category totals for pie chart preview
  const categoryTotals = {
    Food: transactions.filter(t => !t.isIncome && t.category === 'Food').reduce((s, t) => s + t.amount, 0),
    Transport: transactions.filter(t => !t.isIncome && t.category === 'Transport').reduce((s, t) => s + t.amount, 0),
    Weed: transactions.filter(t => !t.isIncome && t.category === 'Weed').reduce((s, t) => s + t.amount, 0),
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#6C63FF] to-[#FF6584] bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's your financial overview</p>
        </div>
        <Link to="/calendar" className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add Transaction
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="card !p-5">
          <div className="flex items-center justify-between mb-3">
            <Wallet className="w-8 h-8 text-[#6C63FF]" />
            <span className="text-xs text-gray-500">Current</span>
          </div>
          <div className="text-2xl font-bold text-[#6C63FF]">{formatCurrency(balance)}</div>
          <div className="text-sm text-gray-500 mt-1">Available balance</div>
        </div>
        
        <div className="card !p-5">
          <div className="flex items-center justify-between mb-3">
            <ArrowUp className="w-8 h-8 text-green-500" />
            <span className="text-xs text-gray-500">This month</span>
          </div>
          <div className="text-2xl font-bold text-green-500">{formatCurrency(totalIncome)}</div>
          <div className="text-sm text-gray-500 mt-1">Total income</div>
        </div>
        
        <div className="card !p-5">
          <div className="flex items-center justify-between mb-3">
            <ArrowDown className="w-8 h-8 text-red-500" />
            <span className="text-xs text-gray-500">This month</span>
          </div>
          <div className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</div>
          <div className="text-sm text-gray-500 mt-1">Total expenses</div>
        </div>
        
        <div className="card !p-5">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-yellow-500" />
            <span className="text-xs text-gray-500">Savings rate</span>
          </div>
          <div className="text-2xl font-bold text-yellow-500">{Math.round(savingsRate)}%</div>
          <div className="text-sm text-gray-500 mt-1">of income saved</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Recent Transactions */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#6C63FF]" />
                Recent Transactions
              </h2>
              <Link to="/transactions" className="text-sm text-[#6C63FF] hover:underline">
                View All →
              </Link>
            </div>
            
            <div className="space-y-2">
              {recentTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      t.isIncome ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {t.isIncome ? '💰' : t.category === 'Weed' ? '🌿' : t.category === 'Food' ? '🍔' : '💸'}
                    </div>
                    <div>
                      <div className="font-medium">{t.category}</div>
                      <div className="text-xs text-gray-500">{t.description || formatDate(t.date)}</div>
                    </div>
                  </div>
                  <div className={`font-semibold ${t.isIncome ? 'text-green-500' : 'text-red-500'}`}>
                    {t.isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
              
              {recentTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No transactions yet. Add your first one!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Categories Summary */}
        <div>
          <div className="card">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-[#6C63FF]" />
              Categories
            </h2>
            
            <div className="space-y-3">
              {Object.entries(categoryTotals).map(([cat, amount]) => (
                <div key={cat} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {cat === 'Food' ? '🍔' : cat === 'Transport' ? '🚗' : '🌿'}
                    </span>
                    <span>{cat}</span>
                  </div>
                  <span className="text-red-500">-{formatCurrency(amount)}</span>
                </div>
              ))}
              
              <div className="pt-3 mt-3 border-t border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Expenses</span>
                  <span className="font-bold text-red-500">{formatCurrency(totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Progress */}
      <div className="card mt-8">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#6C63FF]" />
            Savings Progress
          </h2>
          <span className="text-sm text-gray-500">Target: 20% of income</span>
        </div>
        
        <div className="relative">
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(savingsRate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-sm">0%</span>
            <span className="text-sm font-medium text-[#6C63FF]">{Math.round(savingsRate)}%</span>
            <span className="text-sm">100%</span>
          </div>
        </div>
        
        {savingsRate >= 20 ? (
          <p className="mt-4 text-green-500 text-sm flex items-center gap-2">
            🎉 Congratulations! You've reached your savings goal!
          </p>
        ) : (
          <p className="mt-4 text-yellow-500 text-sm">
            💪 You're {Math.round(20 - savingsRate)}% away from your savings goal. Keep going!
          </p>
        )}
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-[#6C63FF]" />
              Active Goals
            </h2>
            <Link to="/goals" className="text-sm text-[#6C63FF] hover:underline">
              View All →
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-5">
            {activeGoals.map(goal => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const remaining = goal.targetAmount - goal.currentAmount;
              const priorityColor = goal.priority === 'high' ? 'text-red-500 bg-red-500/10' : 
                                   goal.priority === 'medium' ? 'text-yellow-500 bg-yellow-500/10' : 
                                   'text-green-500 bg-green-500/10';
              
              return (
                <div key={goal.id} className="card !p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">{goal.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityColor}`}>
                      {goal.priority}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm mb-2">
                    <span>Saved: {formatCurrency(goal.currentAmount)}</span>
                    <span>Target: {formatCurrency(goal.targetAmount)}</span>
                  </div>
                  
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584] rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 mb-3">
                    <span>{Math.round(progress)}% complete</span>
                    <span>{formatCurrency(remaining)} left</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Deadline: {formatDate(goal.targetDate, 'long')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;