// pages/Debts/DebtDetailModal.tsx
import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate, getLocalDateString } from '../../utils/formatters';
import { X, Calendar, TrendingUp, TrendingDown, Clock, PlusCircle, Trash2, AlertCircle, ArrowLeft, Edit2 } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';
import CompleteDebtConfirmModal from '../../components/modals/CompleteDebtConfirmModal';
import ConfettiEffect from '../../components/common/ConfettiEffect';
import ToastNotification from '../../components/common/ToastNotification';
import Tooltip from '../../components/common/Tooltip';
import NumberInput from '../../components/common/NumberInput';
import { Wallet as WalletIcon, Building2, CreditCard, DollarSign, Package } from 'lucide-react';
import { useDebtStore, useTransactionStore, useWalletStore } from '../../store';
import { useTranslation } from '../../i18n';

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
  const { t } = useTranslation();
  const { debts } = useDebtStore();
  const { wallets } = useWalletStore();
  const { deleteTransaction, transactions } = useTransactionStore();
  const { addDebtPayment, deletePayment } = useDebtStore();

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

  const totalToPay = debt?.realAmountToPay || debt?.originalAmount || 0;
  const totalPaymentsMade = debt?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
  const remainingToPay = totalToPay - totalPaymentsMade;
  const progress = totalToPay > 0 ? (totalPaymentsMade / totalToPay) * 100 : 0;

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

  useEffect(() => {
    if (paymentAmount <= 0) {
      setBalanceError(null);
      return;
    }

    if (debt && paymentAmount > remainingToPay) {
      setBalanceError(`${t('goals.cannotExceedTarget', { max: formatCurrency(remainingToPay) })}`);
      return;
    }

    if (debt?.type === 'borrowed' && paymentAmount > availableBalance) {
      setBalanceError(`${t('goals.insufficientBalance', { balance: formatCurrency(availableBalance) })}`);
    } else {
      setBalanceError(null);
    }
  }, [paymentAmount, debt, remainingToPay, availableBalance, t]);

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
      setToastMessage(t('goals.amountGreaterThanZero'));
      setToastType('error');
      setShowToast(true);
      return;
    }
    if (paymentAmount > remainingToPay) {
      setToastMessage(t('goals.cannotExceedTarget', { max: formatCurrency(remainingToPay) }));
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (debt.type === 'borrowed' && paymentAmount > availableBalance) {
      setToastMessage(`${t('goals.insufficientBalance', { balance: formatCurrency(availableBalance) })}`);
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
      date: getLocalDateString(),
      interestAmount: 0,
      principalAmount: paymentAmount,
      remainingBalance: newRemainingBalance,
      notes: paymentNote,
    });

    const { fetchWallets } = useWalletStore.getState();
    const { fetchTransactions } = useTransactionStore.getState();
    const { fetchDebts } = useDebtStore.getState();
    fetchWallets(true);
    fetchTransactions(true);
    fetchDebts(true);

    setToastMessage(t('debts.paymentAdded'));
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

  const handleDeletePaymentClick = (payment: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaymentToDelete(payment);
    setShowDeletePaymentConfirm(true);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete && debt) {
      const relatedTransaction = transactions.find(t =>
        t.tags?.includes('debt-payment') &&
        t.tags?.includes(debt.id) &&
        t.amount === paymentToDelete.amount &&
        t.date === paymentToDelete.date
      );
      deletePayment(paymentToDelete.id);
      if (relatedTransaction) {
        deleteTransaction(relatedTransaction.id);
      }

      const { fetchWallets } = useWalletStore.getState();
      const { fetchTransactions } = useTransactionStore.getState();
      const { fetchDebts } = useDebtStore.getState();
      fetchWallets(true);
      fetchTransactions(true);
      fetchDebts(true);

      setToastMessage(t('debts.paymentDeleted'));
      setToastType('success');
      setShowToast(true);
      setPaymentToDelete(null);
    }
    setShowDeletePaymentConfirm(false);
  };

  const payments = debt.payments || [];
  const sortedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isBorrowed = debt.type === 'borrowed';
  const remainingColor = isBorrowed ? 'var(--semantic-expense)' : 'var(--semantic-income)';

  const detailCards = [
    {
      icon: wallet && getWalletIcon(wallet),
      label: t('debts.wallet'),
      value: wallet?.name || t('common.unknown'),
      sub: `${t('goals.availableBalance')}: ${formatCurrency(availableBalance)}`,
      subColor: availableBalance >= remainingToPay ? 'var(--semantic-income)' : 'var(--semantic-expense)',
    },
    {
      icon: <TrendingUp className="w-4 h-4" style={{ color: '#F59E0B', opacity: 0.7 }} strokeWidth={1.5} />,
      label: t('debts.interestRate'),
      value: `${debt.interestRate}% (${debt.interestType})`,
    },
    {
      icon: <Calendar className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />,
      label: t('debts.startDate'),
      value: formatDate(debt.startDate, 'long'),
    },
    {
      icon: <Clock className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />,
      label: t('debts.termMonths'),
      value: t('debts.months', { count: debt.termMonths }),
    },
    {
      icon: <TrendingDown className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />,
      label: t('debts.monthlyPayment'),
      value: formatCurrency(debt.monthlyPayment),
      fullWidth: true,
    },
  ];

  return (
    <>
      <ConfettiEffect active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-2xl flex flex-col max-h-[85vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
          {/* Header */}
          <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
            <div className="flex items-center gap-3">
              <Tooltip content={t('common.close')} position="bottom">
                <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                  <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
                </button>
              </Tooltip>
              <div>
                <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{debt.creditorName}</h3>
                <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {isBorrowed ? t('debts.borrowed') : t('debts.lent')}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {debt.status !== 'paid' && (
                <Tooltip content={t('debts.editDebt')} position="bottom">
                  <button onClick={onEdit} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                    <Edit2 className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                  </button>
                </Tooltip>
              )}
              <Tooltip content={t('debts.deleteDebt')} position="bottom">
                <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                  <Trash2 className="w-4 h-4" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
                </button>
              </Tooltip>
              <Tooltip content={t('common.close')} position="bottom">
                <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                  <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto modal-scroll">
            <div className="p-5 space-y-5">
              {/* Amount Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[1.25rem] p-4 glass-sm">
                  <p className="text-[10px] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('debts.realAmountToPay')}</p>
                  <p className="text-xl font-light tracking-[-0.02em]" style={{ color: 'var(--theme-primary)' }}>{formatCurrency(totalToPay)}</p>
                  {debt.realAmountToPay && debt.originalAmount !== debt.realAmountToPay && (
                    <p className="text-[9px] font-medium line-through mt-1" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>
                      {t('debts.originalAmount')}: {formatCurrency(debt.originalAmount)}
                    </p>
                  )}
                </div>
                <div className="rounded-[1.25rem] p-4 glass-sm">
                  <p className="text-[10px] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('debts.remainingBalance')}</p>
                  <p className="text-xl font-light tracking-[-0.02em]" style={{ color: remainingColor }}>
                    {formatCurrency(remainingToPay)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{t('debts.paid')}</span>
                  <span className="font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      background: 'var(--theme-gradient-primary)',
                      boxShadow: '0 0 16px -4px var(--theme-primary)'
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-medium mt-2" style={{ color: 'var(--theme-text-tertiary)' }}>
                  <span>{t('debts.paid')}: {formatCurrency(totalPaymentsMade)}</span>
                  <span>{t('debts.remainingBalance')}: {formatCurrency(remainingToPay)}</span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                {detailCards.map((card, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-4 rounded-[1.25rem] transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] glass-sm ${card.fullWidth ? 'col-span-2' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-[0.85rem] flex items-center justify-center glass-sm flex-shrink-0">
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>{card.label}</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--theme-text-primary)' }}>{card.value}</p>
                      {card.sub && (
                        <p className="text-[10px] font-medium mt-0.5" style={{ color: card.subColor || 'var(--theme-text-tertiary)', opacity: 0.7 }}>
                          {card.sub}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {debt.notes && (
                <div className="p-4 rounded-[1.25rem] glass-sm">
                  <p className="text-[10px] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.notes')}</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}>{debt.notes}</p>
                </div>
              )}

              {/* Payment History */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium tracking-[0.02em] flex items-center gap-2" style={{ color: 'var(--theme-text-secondary)' }}>
                    <Clock className="w-4 h-4" strokeWidth={1.5} />
                    {t('debts.payments')}
                    <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
                      ({sortedPayments.length} {t('debts.payments').toLowerCase()})
                    </span>
                  </h4>
                  {debt.status === 'active' && (
                    <button
                      onClick={() => setShowPaymentForm(!showPaymentForm)}
                      className="px-4 py-2 rounded-2xl text-xs font-medium transition-all duration-500 hover:-translate-y-0.5 flex items-center gap-1.5 glass-sm"
                      style={{ color: 'var(--theme-primary)' }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" strokeWidth={2} />
                      {t('debts.addPayment')}
                    </button>
                  )}
                </div>

                {showPaymentForm && (
                  <div className="mb-4 p-4 rounded-[1.5rem] glass-sm space-y-4">
                    <NumberInput
                      label={t('debts.paymentAmount')}
                      value={paymentAmount}
                      onChange={setPaymentAmount}
                      placeholder="0"
                      min={1}
                      max={debt.type === 'borrowed' ? Math.min(remainingToPay, availableBalance) : remainingToPay}
                      required
                    />
                    {balanceError && (
                      <div className="flex items-center gap-2.5 p-3 rounded-[1rem]" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
                        <p className="text-xs font-medium" style={{ color: '#EF4444', opacity: 0.85 }}>{balanceError}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.note')} ({t('common.optional')})</label>
                      <input
                        maxLength={100}
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder={t('debts.paymentNotePlaceholder')}
                        className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                        style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowPaymentForm(false)}
                        className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
                        style={{ color: 'var(--theme-text-tertiary)' }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleMakePayment}
                        disabled={!!balanceError || paymentAmount <= 0}
                        className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed hover:-translate-y-1"
                        style={{
                          backgroundColor: !balanceError && paymentAmount > 0 ? 'var(--theme-primary)' : 'var(--theme-background-glass-hover)',
                          boxShadow: !balanceError && paymentAmount > 0 ? 'var(--shadow-button)' : 'none'
                        }}
                      >
                        {t('common.confirm')}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1 max-h-64 overflow-y-auto pr-1 modal-scroll">
                  {sortedPayments.map(payment => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-3 px-3 rounded-[1rem] transition-all duration-300 group hover:bg-[var(--theme-background-glass-hover)] glass-sm"
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(payment.amount)}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>{formatDate(payment.date, 'long')}</p>
                        {payment.notes && <p className="text-[9px] mt-0.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>{payment.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{t('debts.remainingBalance')}: {formatCurrency(payment.remainingBalance)}</p>
                        <Tooltip content={t('debts.deletePayment')} position="bottom">
                          <button
                            onClick={(e) => handleDeletePaymentClick(payment, e)}
                           
                            className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 glass-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                  {sortedPayments.length === 0 && (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-[1.25rem] flex items-center justify-center glass-sm">
                        <Clock className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{t('goals.noTransactions')}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{t('debts.createFirst')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { onDelete(); setShowDeleteConfirm(false); }}
        title={t('debts.deleteDebt')}
        message={t('debts.confirmDelete')}
        confirmText={t('common.delete')}
        type="danger"
      />

      <ConfirmModal
        isOpen={showDeletePaymentConfirm}
        onClose={() => setShowDeletePaymentConfirm(false)}
        onConfirm={confirmDeletePayment}
        title={t('debts.deletePayment')}
        message={`${t('debts.confirmDeletePayment')} ${formatCurrency(paymentToDelete?.amount || 0)}?`}
        confirmText={t('debts.deletePayment')}
        type="danger"
      />

      <CompleteDebtConfirmModal
        isOpen={showCompleteConfirm}
        onClose={() => { setShowCompleteConfirm(false); setPaymentAmount(0); }}
        onConfirm={handleConfirmComplete}
        debtName={debt.creditorName}
        remainingAmount={remainingToPay}
        type={debt.type}
      />

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
