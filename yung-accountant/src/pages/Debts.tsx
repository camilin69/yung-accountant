// pages/Debts.tsx

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { HandCoins, Plus, TrendingDown, Calendar, DollarSign, Percent } from 'lucide-react';

const Debts: React.FC = () => {
  const { debts, addDebt, updateDebt, deleteDebt } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    creditor: '',
    originalAmount: '',
    interestRate: '',
    termMonths: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const activeDebts = debts.filter(d => d.status === 'active');
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.remainingBalance, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.creditor || !formData.originalAmount) return;

    const originalAmount = parseFloat(formData.originalAmount);
    const interestRate = parseFloat(formData.interestRate) || 0;
    const termMonths = parseInt(formData.termMonths) || 12;
    
    // Calculate monthly payment (simple interest formula)
    const monthlyRate = interestRate / 100;
    let monthlyPayment = 0;
    if (monthlyRate > 0) {
      monthlyPayment = (originalAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                       (Math.pow(1 + monthlyRate, termMonths) - 1);
    } else {
      monthlyPayment = originalAmount / termMonths;
    }

    addDebt({
      creditor: formData.creditor,
      originalAmount,
      remainingBalance: originalAmount,
      interestRate,
      termMonths,
      monthlyPayment,
      startDate: formData.startDate,
      status: 'active',
    });

    setShowModal(false);
    setFormData({ creditor: '', originalAmount: '', interestRate: '', termMonths: '', startDate: new Date().toISOString().split('T')[0] });
  };

  const handleMakePayment = (id: string) => {
    const amount = prompt('Payment amount:');
    if (amount && !isNaN(parseFloat(amount))) {
      const debt = debts.find(d => d.id === id);
      if (debt) {
        const newBalance = debt.remainingBalance - parseFloat(amount);
        if (newBalance <= 0) {
          updateDebt(id, { remainingBalance: 0, status: 'paid' });
        } else {
          updateDebt(id, { remainingBalance: newBalance });
        }
      }
    }
  };

  const handleDeleteDebt = (id: string) => {
    if (confirm('Delete this debt?')) {
      deleteDebt(id);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          <HandCoins className="inline mr-2 mb-1 w-7 h-7" />
          Debts & Credits
        </h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add Debt
        </button>
      </div>

      {/* Total Debt Card */}
      <div className="card text-center mb-8">
        <TrendingDown className="w-8 h-8 text-danger mx-auto mb-2" />
        <div className="text-3xl font-bold text-danger">{formatCurrency(totalDebt)}</div>
        <div className="text-sm text-gray-500">Total Outstanding Debt</div>
      </div>

      {/* Debts List */}
      {activeDebts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Debts</h2>
          {activeDebts.map(debt => {
            const paidPercent = ((debt.originalAmount - debt.remainingBalance) / debt.originalAmount) * 100;
            const monthsSinceStart = Math.max(0, Math.floor((new Date().getTime() - new Date(debt.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
            const monthsLeft = Math.max(0, debt.termMonths - monthsSinceStart);
            
            return (
              <div key={debt.id} className="card border-l-4 border-l-danger">
                <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{debt.creditor}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Started: {formatDate(debt.startDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        Rate: {debt.interestRate}%
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    debt.status === 'active' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'
                  }`}>
                    {debt.status === 'active' ? 'Active' : 'Paid'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500">Remaining Balance</div>
                    <div className="text-lg font-semibold text-danger">{formatCurrency(debt.remainingBalance)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Monthly Payment</div>
                    <div className="text-lg font-semibold">{formatCurrency(debt.monthlyPayment)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Term</div>
                    <div className="text-lg font-semibold">{debt.termMonths} months</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Time Left</div>
                    <div className="text-lg font-semibold">{monthsLeft} months</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{Math.round(paidPercent)}% paid</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-danger rounded-full transition-all duration-500" style={{ width: `${paidPercent}%` }} />
                  </div>
                </div>

                {debt.status === 'active' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleMakePayment(debt.id)}
                      className="flex-1 py-2 text-sm bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                    >
                      Make Payment
                    </button>
                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="py-2 px-4 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {debts.length === 0 && (
        <div className="card text-center py-12">
          <HandCoins className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-500">No debts recorded. Keep it that way! 💪</p>
        </div>
      )}

      {/* Add Debt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl max-w-md w-[90%] p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Add New Debt</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Creditor *</label>
                <input
                  type="text"
                  value={formData.creditor}
                  onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
                  className="input"
                  placeholder="Bank, person, entity..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Original Amount *</label>
                <input
                  type="number"
                  value={formData.originalAmount}
                  onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                  className="input"
                  placeholder="7750000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  className="input"
                  placeholder="1.87"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Term (months)</label>
                <input
                  type="number"
                  value={formData.termMonths}
                  onChange={(e) => setFormData({ ...formData, termMonths: e.target.value })}
                  className="input"
                  placeholder="12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Add Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Debts;