// components/modals/DebtDetailModal.tsx - agregar validación de balance

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { X, Calendar, Wallet, TrendingUp, TrendingDown, Clock, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';
import CompleteDebtConfirmModal from './CompleteDebtConfirmModal';
import ConfettiEffect from '../common/ConfettiEffect';
import ToastNotification from '../common/ToastNotification';
import NumberInput from '../common/NumberInput';

interface DebtDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtId: string | null;
  onEdit: () => void;
  onDelete: () => void;
}

const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
  isOpen,
  onClose,
  debtId,
  onEdit,
  onDelete,
}) => {
  const { debts, wallets, addDebtPayment } = useStore();
  
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const debt = debts.find(d => d.id === debtId);
  const wallet = debt ? wallets.find(w => w.id === debt.walletId) : null;
  const availableBalance = wallet?.currentBalance || 0;

  // Validar balance en tiempo real
  useEffect(() => {
    if (paymentAmount <= 0) {
      setBalanceError(null);
      return;
    }
    
    if (debt && paymentAmount > debt.remainingBalance) {
      setBalanceError(`Cannot exceed remaining balance. Max: ${formatCurrency(debt.remainingBalance)}`);
    } else if (paymentAmount > availableBalance) {
      setBalanceError(`Insufficient balance. Available: ${formatCurrency(availableBalance)}`);
    } else {
      setBalanceError(null);
    }
  }, [paymentAmount, debt, availableBalance]);

  useEffect(() => {
    if (!isOpen) {
      setShowPaymentForm(false);
      setPaymentAmount(0);
      setPaymentNote('');
      setBalanceError(null);
    }
  }, [isOpen]);

  if (!isOpen || !debt) return null;

  const progress = ((debt.originalAmount - debt.remainingBalance) / debt.originalAmount) * 100;
  const paidAmount = debt.originalAmount - debt.remainingBalance;
  const willComplete = paymentAmount >= debt.remainingBalance;

  const handleMakePayment = () => {
    if (paymentAmount <= 0) {
      setToastMessage('Please enter a valid amount');
      setToastType('error');
      setShowToast(true);
      return;
    }
    if (paymentAmount > debt.remainingBalance) {
      setToastMessage('Payment cannot exceed remaining balance');
      setToastType('error');
      setShowToast(true);
      return;
    }
    if (paymentAmount > availableBalance) {
      setToastMessage(`Insufficient balance. Available: ${formatCurrency(availableBalance)}`);
      setToastType('error');
      setShowToast(true);
      return;
    }

    const isFullyPaid = debt.remainingBalance - paymentAmount <= 0;
    
    if (isFullyPaid && willComplete) {
      setShowCompleteConfirm(true);
    } else {
      executePayment();
    }
  };

  const executePayment = () => {
    const isFullyPaid = debt.remainingBalance - paymentAmount <= 0;
    
    addDebtPayment(debt.id, {
      amount: paymentAmount,
      date: new Date().toISOString().split('T')[0],
      interestAmount: 0,
      principalAmount: paymentAmount,
      remainingBalance: debt.remainingBalance - paymentAmount,
      notes: paymentNote,
    });

    setToastMessage(`Payment of ${formatCurrency(paymentAmount)} recorded`);
    setToastType('success');
    setShowToast(true);
    setPaymentAmount(0);
    setPaymentNote('');
    setShowPaymentForm(false);
    
    if (isFullyPaid) {
      setShowConfetti(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleConfirmComplete = () => {
    executePayment();
    setShowCompleteConfirm(false);
  };

  const payments = debt.payments || [];
  const sortedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Mostrar advertencia si es un préstamo (lent) y no hay suficiente balance
  const isLent = debt.type === 'lent';
  const showBalanceWarning = isLent && availableBalance < debt.remainingBalance && debt.status === 'active';

  return (
    <>
      <ConfettiEffect active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-white/10">
            <div>
              <h3 className="text-lg font-light text-white">{debt.creditorName}</h3>
              <p className="text-xs text-white/40 mt-0.5 font-light">
                {debt.type === 'borrowed' ? 'Debt I Owe' : 'Debt Owed to Me'}
              </p>
            </div>
            <div className="flex gap-2">
              {debt.status !== 'paid' && (
                <button onClick={onEdit} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors">
                <Trash2 className="w-4 h-4 text-white/60 hover:text-red-500" />
              </button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>

          <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            {/* Balance Warning para Lent */}
            {showBalanceWarning && (
              <div className="mb-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <p className="text-xs text-yellow-500/80">
                    You don't have enough balance to cover this loan. Available: {formatCurrency(availableBalance)}
                  </p>
                </div>
              </div>
            )}

            {/* Amount Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/[0.03] rounded-lg p-3">
                <p className="text-[10px] text-white/40">Original Amount</p>
                <p className="text-lg font-light text-white">{formatCurrency(debt.originalAmount)}</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3">
                <p className="text-[10px] text-white/40">Remaining Balance</p>
                <p className={`text-lg font-light ${debt.type === 'borrowed' ? 'text-red-500' : 'text-green-500'}`}>
                  {formatCurrency(debt.remainingBalance)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-white/40">Paid</span>
                <span className="text-white/60">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/30 mt-2">
                <span>Paid: {formatCurrency(paidAmount)}</span>
                <span>Remaining: {formatCurrency(debt.remainingBalance)}</span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                <Wallet className="w-3.5 h-3.5 text-white/30" />
                <div>
                  <p className="text-[9px] text-white/40">Wallet</p>
                  <p className="text-xs text-white/80">{wallet?.icon} {wallet?.name}</p>
                  <p className={`text-[9px] ${availableBalance >= debt.remainingBalance ? 'text-green-500/60' : 'text-red-500/60'}`}>
                    Available: {formatCurrency(availableBalance)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                <TrendingUp className="w-3.5 h-3.5 text-yellow-500/60" />
                <div>
                  <p className="text-[9px] text-white/40">Interest Rate</p>
                  <p className="text-xs text-white/80">{debt.interestRate}% ({debt.interestType})</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-white/30" />
                <div>
                  <p className="text-[9px] text-white/40">Start Date</p>
                  <p className="text-xs text-white/80">{formatDate(debt.startDate, 'long')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                <Clock className="w-3.5 h-3.5 text-white/30" />
                <div>
                  <p className="text-[9px] text-white/40">Term</p>
                  <p className="text-xs text-white/80">{debt.termMonths} months</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                <TrendingDown className="w-3.5 h-3.5 text-white/30" />
                <div>
                  <p className="text-[9px] text-white/40">Monthly Payment</p>
                  <p className="text-xs text-white/80">{formatCurrency(debt.monthlyPayment)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {debt.notes && (
              <div className="mb-6 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                <p className="text-[9px] text-white/40 mb-1">Notes</p>
                <p className="text-sm text-white/60">{debt.notes}</p>
              </div>
            )}

            {/* Payment History */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-light text-white/60 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Payment History
                </h4>
                {debt.status === 'active' && (
                  <button
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="text-xs text-[#6366F1] hover:text-[#818cf8] transition-colors flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" />
                    Record Payment
                  </button>
                )}
              </div>

              {showPaymentForm && (
                <div className="mb-4 p-3 bg-white/[0.02] rounded-lg border border-white/5 space-y-3">
                  <NumberInput
                    label="Payment Amount"
                    value={paymentAmount}
                    onChange={setPaymentAmount}
                    placeholder="0"
                    min={1}
                    max={Math.min(debt.remainingBalance, availableBalance)}
                    required
                  />
                  {balanceError && (
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <p className="text-xs text-red-500/80">{balanceError}</p>
                    </div>
                  )}
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowPaymentForm(false)} className="flex-1 py-2 bg-white/5 rounded-lg text-white/60 text-sm font-light hover:bg-white/10">
                      Cancel
                    </button>
                    <button 
                      onClick={handleMakePayment} 
                      disabled={!!balanceError || paymentAmount <= 0}
                      className={`flex-1 py-2 rounded-lg text-white text-sm font-light transition-all duration-300 ${
                        balanceError || paymentAmount <= 0
                          ? 'bg-white/10 text-white/30 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#6366F1] to-[#EC4899] hover:scale-[1.02]'
                      }`}
                    >
                      Confirm Payment
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sortedPayments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <p className="text-sm font-light text-white/80">{formatCurrency(payment.amount)}</p>
                      <p className="text-[10px] text-white/40">{formatDate(payment.date, 'long')}</p>
                      {payment.notes && <p className="text-[9px] text-white/30">{payment.notes}</p>}
                    </div>
                    <p className="text-xs text-white/40">Remaining: {formatCurrency(payment.remainingBalance)}</p>
                  </div>
                ))}
                {sortedPayments.length === 0 && (
                  <div className="text-center py-6 text-white/40 text-sm font-light">
                    No payments recorded yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
        title="Delete Debt"
        message="Are you sure you want to delete this debt? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      {/* Complete Debt Confirm Modal */}
      <CompleteDebtConfirmModal
        isOpen={showCompleteConfirm}
        onClose={() => {
          setShowCompleteConfirm(false);
          setPaymentAmount(0);
        }}
        onConfirm={handleConfirmComplete}
        debtName={debt.creditorName}
        remainingAmount={debt.remainingBalance}
        type={debt.type}
      />

      {/* Toast Notification */}
      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </>
  );
};

export default DebtDetailModal;