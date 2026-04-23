// components/modals/DebtDetailModal.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { X, Calendar, TrendingUp, TrendingDown, Clock, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';
import CompleteDebtConfirmModal from './CompleteDebtConfirmModal';
import ConfettiEffect from '../common/ConfettiEffect';
import ToastNotification from '../common/ToastNotification';
import NumberInput from '../common/NumberInput';
import { Wallet as WalletIcon, Building2, CreditCard, DollarSign, Package } from 'lucide-react';

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
  const { debts, wallets, addDebtPayment, deleteTransaction, transactions } = useStore();
  
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showDeletePaymentConfirm, setShowDeletePaymentConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const debt = debts.find(d => d.id === debtId);
  const wallet = debt ? wallets.find(w => w.id === debt.walletId) : null;
  const availableBalance = wallet?.currentBalance || 0;

  // Usar realAmountToPay para cálculos (si no existe usar originalAmount para debts antiguos)
  const totalToPay = debt?.realAmountToPay || debt?.originalAmount || 0;
  const totalPaymentsMade = debt?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remainingToPay = totalToPay - totalPaymentsMade;
  const progress = (totalPaymentsMade / totalToPay) * 100;
  
  const getWalletIcon = (wallet: any) => {
    const iconMap: Record<string, React.ReactNode> = {
      cash: <DollarSign className="w-4 h-4" style={{ color: wallet.color }} />,
      bank_account: <Building2 className="w-4 h-4" style={{ color: wallet.color }} />,
      credit_card: <CreditCard className="w-4 h-4" style={{ color: wallet.color }} />,
      debit_card: <CreditCard className="w-4 h-4" style={{ color: wallet.color }} />,
      other: <Package className="w-4 h-4" style={{ color: wallet.color }} />,
    };
    return iconMap[wallet.type] || <WalletIcon className="w-4 h-4" style={{ color: wallet.color }} />;
  };


  // Validar balance en tiempo real
  useEffect(() => {
    if (paymentAmount <= 0) {
      setBalanceError(null);
      return;
    }
    
    if (debt && paymentAmount > remainingToPay) {
      setBalanceError(`Cannot exceed remaining balance. Max: ${formatCurrency(remainingToPay)}`);
      return;
    }
    
    // SOLO validar balance si es un préstamo que DEBO (borrowed) - dinero que sale de mi wallet
    if (debt?.type === 'borrowed' && paymentAmount > availableBalance) {
      setBalanceError(`Insufficient balance. Available: ${formatCurrency(availableBalance)}`);
    } else {
      setBalanceError(null);
    }
  }, [paymentAmount, debt, remainingToPay, availableBalance]);

  useEffect(() => {
    if (!isOpen) {
      setShowPaymentForm(false);
      setPaymentAmount(0);
      setPaymentNote('');
      setBalanceError(null);
      setPaymentToDelete(null);
    }
  }, [isOpen]);

  if (!isOpen || !debt) return null;

  const handleMakePayment = () => {
    if (paymentAmount <= 0) {
      setToastMessage('Please enter a valid amount');
      setToastType('error');
      setShowToast(true);
      return;
    }
    if (paymentAmount > remainingToPay) {
      setToastMessage('Payment cannot exceed remaining balance');
      setToastType('error');
      setShowToast(true);
      return;
    }
    
    // SOLO validar balance si es borrowed (dinero que sale de mi wallet)
    if (debt.type === 'borrowed' && paymentAmount > availableBalance) {
      setToastMessage(`Insufficient balance. Available: ${formatCurrency(availableBalance)}`);
      setToastType('error');
      setShowToast(true);
      return;
    }

    const isFullyPaid = remainingToPay - paymentAmount <= 0;
    
    if (isFullyPaid) {
      setShowCompleteConfirm(true);
    } else {
      executePayment();
    }
  };

  const executePayment = () => {
    const isFullyPaid = remainingToPay - paymentAmount <= 0;
    const newRemainingBalance = remainingToPay - paymentAmount;
    
    addDebtPayment(debt.id, {
      amount: paymentAmount,
      date: new Date().toISOString().split('T')[0],
      interestAmount: 0,
      principalAmount: paymentAmount,
      remainingBalance: newRemainingBalance,
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

  // Eliminar un pago específico
  const handleDeletePaymentClick = (payment: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaymentToDelete(payment);
    setShowDeletePaymentConfirm(true);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete && debt) {
      // Buscar la transacción asociada a este pago
      const relatedTransaction = transactions.find(t => 
        t.tags.includes('debt-payment') && 
        t.tags.includes(debt.id) &&
        t.amount === paymentToDelete.amount &&
        t.date === paymentToDelete.date
      );
      
      // Eliminar la transacción (esto actualizará el balance automáticamente)
      if (relatedTransaction) {
        deleteTransaction(relatedTransaction.id);
      }
      
      setToastMessage(`Payment of ${formatCurrency(paymentToDelete.amount)} removed`);
      setToastType('success');
      setShowToast(true);
      setPaymentToDelete(null);
    }
    setShowDeletePaymentConfirm(false);
  };

  const payments = debt.payments || [];
  const sortedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <ConfettiEffect active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
          {/* Header - Sticky */}
          <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <div>
                <h3 className="text-lg font-light text-white">{debt.creditorName}</h3>
                <p className="text-xs text-white/40 mt-0.5 font-light">
                  {debt.type === 'borrowed' ? 'Debt I Owe' : 'Debt Owed to Me'}
                </p>
              </div>
              <div className="flex gap-2">
                {debt.status !== 'paid' && (
                  <button 
                    onClick={onEdit} 
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                <button 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-white/60 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={onClose} 
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">

              {/* Amount Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                  <p className="text-[10px] text-white/40 font-light mb-1">Total to Pay</p>
                  <p className="text-xl font-light text-[#6366F1]">{formatCurrency(totalToPay)}</p>
                  {debt.realAmountToPay && debt.originalAmount !== debt.realAmountToPay && (
                    <p className="text-[9px] text-white/30 line-through mt-1">
                      Original: {formatCurrency(debt.originalAmount)}
                    </p>
                  )}
                </div>
                <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                  <p className="text-[10px] text-white/40 font-light mb-1">Remaining Balance</p>
                  <p className={`text-xl font-light ${debt.type === 'borrowed' ? 'text-red-500' : 'text-green-500'}`}>
                    {formatCurrency(remainingToPay)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/40 font-light">Paid</span>
                  <span className="text-white/60 font-light">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-white/30 font-light mt-2">
                  <span>Paid: {formatCurrency(totalPaymentsMade)}</span>
                  <span>Remaining: {formatCurrency(remainingToPay)}</span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${wallet?.color}20` }}>
                    {wallet && getWalletIcon(wallet)}
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40 font-light">Wallet</p>
                    <p className="text-sm font-light text-white/80">{wallet?.name}</p>
                    <p className={`text-[9px] font-light ${availableBalance >= remainingToPay ? 'text-green-500/60' : 'text-red-500/60'}`}>
                      Available: {formatCurrency(availableBalance)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <TrendingUp className="w-4 h-4 text-yellow-500/60" />
                  <div>
                    <p className="text-[9px] text-white/40 font-light">Interest Rate</p>
                    <p className="text-sm font-light text-white/80">{debt.interestRate}% ({debt.interestType})</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <Calendar className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-[9px] text-white/40 font-light">Start Date</p>
                    <p className="text-sm font-light text-white/80">{formatDate(debt.startDate, 'long')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <Clock className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-[9px] text-white/40 font-light">Term</p>
                    <p className="text-sm font-light text-white/80">{debt.termMonths} months</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white/[0.02] rounded-lg border border-white/5 col-span-2">
                  <TrendingDown className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-[9px] text-white/40 font-light">Monthly Payment</p>
                    <p className="text-sm font-light text-white/80">{formatCurrency(debt.monthlyPayment)}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {debt.notes && (
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <p className="text-[9px] text-white/40 font-light mb-1">Notes</p>
                  <p className="text-sm font-light text-white/60">{debt.notes}</p>
                </div>
              )}

              {/* Payment History */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-light text-white/60 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Payment History
                    <span className="text-[10px] text-white/30 font-light">({sortedPayments.length} payments)</span>
                  </h4>
                  {debt.status === 'active' && (
                    <button
                      onClick={() => setShowPaymentForm(!showPaymentForm)}
                      className="text-xs text-[#6366F1] hover:text-[#818cf8] transition-colors flex items-center gap-1 font-light"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Record Payment
                    </button>
                  )}
                </div>

                {showPaymentForm && (
                  <div className="mb-4 p-4 bg-white/[0.02] rounded-lg border border-white/10 space-y-4">
                    <NumberInput
                      label="Payment Amount"
                      value={paymentAmount}
                      onChange={setPaymentAmount}
                      placeholder="0"
                      min={1}
                      max={debt.type === 'borrowed' ? Math.min(remainingToPay, availableBalance) : remainingToPay}
                      required
                    />
                    {balanceError && (
                      <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <p className="text-xs text-red-500/80 font-light">{balanceError}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5 font-light">Note (optional)</label>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="Add a note about this payment"
                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowPaymentForm(false)} 
                        className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleMakePayment} 
                        disabled={!!balanceError || paymentAmount <= 0}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 ${
                          balanceError || paymentAmount <= 0
                            ? 'bg-white/10 text-white/30 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#6366F1] to-[#EC4899]'
                        }`}
                      >
                        Confirm Payment
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {sortedPayments.map(payment => (
                    <div 
                      key={payment.id} 
                      className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/[0.04] transition-colors border-b border-white/5 group"
                    >
                      <div>
                        <p className="text-sm font-light text-white/80">{formatCurrency(payment.amount)}</p>
                        <p className="text-[10px] text-white/40 font-light">{formatDate(payment.date, 'long')}</p>
                        {payment.notes && <p className="text-[9px] text-white/30 font-light mt-0.5">{payment.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-white/40 font-light">Remaining: {formatCurrency(payment.remainingBalance)}</p>
                        <button
                          onClick={(e) => handleDeletePaymentClick(payment, e)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {sortedPayments.length === 0 && (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-sm text-white/40 font-light">No payments recorded yet</p>
                      <p className="text-[10px] text-white/20 font-light mt-1">Record your first payment</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Sticky */}
          <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
            {/* Footer vacío porque no hay acciones adicionales */}
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal para toda la deuda */}
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

      {/* Confirm Delete Payment Modal */}
      <ConfirmModal
        isOpen={showDeletePaymentConfirm}
        onClose={() => setShowDeletePaymentConfirm(false)}
        onConfirm={confirmDeletePayment}
        title="Delete Payment"
        message={`Are you sure you want to delete the payment of ${formatCurrency(paymentToDelete?.amount || 0)}? This will restore this amount to the remaining balance and remove the associated transaction.`}
        confirmText="Delete Payment"
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
        remainingAmount={remainingToPay}
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