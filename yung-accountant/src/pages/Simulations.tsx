// pages/Simulations.tsx

import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatters';
import { TrendingUp, PiggyBank, HandCoins, BarChart3, Calculator } from 'lucide-react';

type SimulationType = 'savings' | 'debt' | 'investment';

const Simulations: React.FC = () => {
  const [activeType, setActiveType] = useState<SimulationType>('savings');
  const [result, setResult] = useState<{ months: number; total: number; interest: number } | null>(null);

  // Savings simulation state
  const [monthlySavings, setMonthlySavings] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [interestRate, setInterestRate] = useState('5');

  // Debt simulation state
  const [debtAmount, setDebtAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [debtRate, setDebtRate] = useState('1.87');

  const runSavingsSimulation = () => {
    const monthly = parseFloat(monthlySavings);
    const target = parseFloat(targetAmount);
    const rate = parseFloat(interestRate) / 100 / 12;

    if (isNaN(monthly) || isNaN(target) || monthly <= 0) {
      alert('Please enter valid numbers');
      return;
    }

    let months = 0;
    let balance = 0;

    while (balance < target && months < 600) {
      balance = (balance + monthly) * (1 + rate);
      months++;
    }

    const totalSaved = monthly * months;
    const interestEarned = totalSaved - target;

    setResult({
      months,
      total: totalSaved,
      interest: interestEarned,
    });
  };

  const runDebtSimulation = () => {
    const debt = parseFloat(debtAmount);
    const payment = parseFloat(monthlyPayment);
    const rate = parseFloat(debtRate) / 100;

    if (isNaN(debt) || isNaN(payment) || payment <= 0 || payment >= debt) {
      alert('Please enter valid numbers. Payment must be less than debt amount.');
      return;
    }

    let balance = debt;
    let months = 0;

    while (balance > 0 && months < 600) {
      const interest = balance * rate;
      balance = balance + interest - payment;
      months++;
      if (balance < 0) balance = 0;
    }

    const totalPaid = payment * months;
    const totalInterest = totalPaid - debt;

    setResult({
      months,
      total: totalPaid,
      interest: totalInterest,
    });
  };

  const runInvestmentSimulation = () => {
    // Simple investment simulation (compound interest)
    const monthly = parseFloat(monthlySavings) || 100000;
    const rate = parseFloat(interestRate) / 100 / 12;
    const years = 5;
    const monthsTotal = years * 12;

    let balance = 0;
    for (let i = 0; i < monthsTotal; i++) {
      balance = (balance + monthly) * (1 + rate);
    }

    const totalInvested = monthly * monthsTotal;
    const interestEarned = balance - totalInvested;

    setResult({
      months: monthsTotal,
      total: balance,
      interest: interestEarned,
    });
  };

  const handleRunSimulation = () => {
    if (activeType === 'savings') runSavingsSimulation();
    else if (activeType === 'debt') runDebtSimulation();
    else runInvestmentSimulation();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          <Calculator className="inline mr-2 mb-1 w-7 h-7" />
          Financial Simulator
        </h1>
      </div>

      <div className="card">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-3">
          <button
            onClick={() => setActiveType('savings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeType === 'savings'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-primary hover:bg-primary/10'
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            Savings Goal
          </button>
          <button
            onClick={() => setActiveType('debt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeType === 'debt'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-primary hover:bg-primary/10'
            }`}
          >
            <HandCoins className="w-4 h-4" />
            Debt Payoff
          </button>
          <button
            onClick={() => setActiveType('investment')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeType === 'investment'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-primary hover:bg-primary/10'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Investment
          </button>
        </div>

        {/* Savings Form */}
        {activeType === 'savings' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Savings Amount</label>
              <input
                type="number"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(e.target.value)}
                className="input"
                placeholder="100000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Amount</label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="input"
                placeholder="8000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Annual Interest Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="input"
                placeholder="5"
              />
            </div>
          </div>
        )}

        {/* Debt Form */}
        {activeType === 'debt' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Debt Amount</label>
              <input
                type="number"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
                className="input"
                placeholder="7750000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Payment</label>
              <input
                type="number"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                className="input"
                placeholder="200000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Interest Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={debtRate}
                onChange={(e) => setDebtRate(e.target.value)}
                className="input"
                placeholder="1.87"
              />
            </div>
          </div>
        )}

        {/* Investment Form */}
        {activeType === 'investment' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Investment</label>
              <input
                type="number"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(e.target.value)}
                className="input"
                placeholder="100000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Annual Return Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="input"
                placeholder="8"
              />
            </div>
            <div className="text-sm text-gray-500">
              <span>Time horizon: 5 years (fixed)</span>
            </div>
          </div>
        )}

        <button onClick={handleRunSimulation} className="btn btn-primary w-full mt-6">
          <BarChart3 className="w-4 h-4" /> Calculate
        </button>

        {/* Results */}
        {result && (
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-semibold mb-3">Results</h3>
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-primary">{result.months} months</div>
              <p className="text-sm text-gray-500">
                ({Math.floor(result.months / 12)} years and {result.months % 12} months)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500">Total {activeType === 'debt' ? 'Paid' : 'Saved'}</div>
                <div className="text-lg font-semibold text-primary">{formatCurrency(result.total)}</div>
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500">{activeType === 'debt' ? 'Interest Paid' : 'Interest Earned'}</div>
                <div className={`text-lg font-semibold ${result.interest > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {formatCurrency(Math.abs(result.interest))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="card mt-6 bg-gradient-to-r from-primary/10 to-secondary/10">
        <h3 className="font-semibold mb-2">💡 Financial Tip</h3>
        <p className="text-sm text-gray-300">
          {activeType === 'savings' && "Start small! Saving 50k a week is 2.6M a year. Time is your best friend."}
          {activeType === 'debt' && "Pay more than the minimum whenever possible. Even 10% extra can save months of payments."}
          {activeType === 'investment' && "The earlier you start investing, the more compound interest works for you. A 20-year-old investing 100k monthly could have over 100M by retirement."}
        </p>
      </div>
    </div>
  );
};

export default Simulations;