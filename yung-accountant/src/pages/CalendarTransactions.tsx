// pages/CalendarTransactions.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ArrowRight, Calendar as CalendarIcon, Edit2, Plus, RefreshCw, Trash2, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import Calendar from '../components/common/Calendar';
import TransactionModal from '../components/modals/TransactionModal';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';
import { useNavigate } from 'react-router-dom';
import { getIconComponent } from '../utils/iconHelpers';

const CalendarTransactions: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, categories, deleteTransaction, setTransactions } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [isMobile, setIsMobile] = useState(false);
  const [isVerySmall, setIsVerySmall] = useState(false);

  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsVerySmall(width < 480);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const getCategoryById = (id: string) => categories.find(c => c.id === id);
  const getDayTransactions = (date: string) => transactions.filter(t => t.date === date);

  const getMonthIncome = () => {
    const startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
    return transactions
      .filter(t => {
        const cat = getCategoryById(t.categoryId);
        return cat?.type === 'income' && t.date >= startDate && t.date <= endDate;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getMonthExpenses = () => {
    const startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
    return transactions
      .filter(t => {
        const cat = getCategoryById(t.categoryId);
        return cat?.type === 'expense' && t.date >= startDate && t.date <= endDate;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const currentBalance = getMonthIncome() - getMonthExpenses();

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowDayModal(true);
  };

  const handleEditTransaction = (transaction: any) => {
    const isDebtTransaction = transaction.tags && (transaction.tags.includes('debt') || transaction.tags.includes('debt-payment'));
    
    if (isDebtTransaction) {
      setToastMessage('Debt transactions cannot be edited. Please manage them from the Debts module.');
      setToastType('warning');
      setShowToast(true);
      return;
    }
    
    setEditingTransaction(transaction);
    setShowDayModal(false);
    setShowTransactionModal(true);
  };

  const handleDeleteTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    
    if (transaction && transaction.tags && (transaction.tags.includes('debt') || transaction.tags.includes('debt-payment'))) {
      setToastMessage('Debt transactions must be managed from the Debts module');
      setToastType('warning');
      setShowToast(true);
      return;
    }
    
    deleteTransaction(id);
    setToastMessage('Transaction deleted successfully');
    setToastType('success');
    setShowToast(true);
  };

  const handleResetAllTransactions = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setTransactions([]);
    setToastMessage('All transactions have been reset');
    setToastType('success');
    setShowToast(true);
    setShowResetConfirm(false);
  };

  const selectedDateTransactions = selectedDate
    ? transactions.filter(t => t.date === selectedDate)
    : [];

  // Estilos responsivos
  const getCardPadding = () => {
    if (isVerySmall) return 'p-2';
    if (isMobile) return 'p-2.5';
    return 'p-3';
  };

  const getHeaderPadding = () => {
    if (isVerySmall) return 'p-3 pb-2 pt-3';
    if (isMobile) return 'p-4 pb-2 pt-4';
    return 'p-6 pb-3 pt-5';
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex flex-col">
      {/* Header - padding responsivo */}
      <div className={`flex-shrink-0 ${getHeaderPadding()}`}>
        <div className={`flex ${isVerySmall ? 'flex-col items-start gap-2' : 'justify-between items-center'} mb-3`}>
          <div>
            <h1 className={`${isVerySmall ? 'text-xl' : (isMobile ? 'text-2xl' : 'text-3xl')} font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight`}>
              Calendar
            </h1>
            <p className={`${isVerySmall ? 'text-[10px]' : 'text-xs'} text-white/40 mt-0.5 font-light`}>
              Track your daily finances
            </p>
          </div>
          <div className={`flex gap-2 ${isVerySmall ? 'w-full' : ''}`}>
            <button
              onClick={handleResetAllTransactions}
              className={`group relative ${isVerySmall ? 'px-3 py-1.5 text-[11px]' : (isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm')} bg-white/5 hover:bg-red-500/20 transition-all duration-300 text-white font-light flex items-center gap-1.5 overflow-hidden rounded-lg flex-1 justify-center`}
            >
              <RefreshCw className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} group-hover:rotate-180 transition-transform duration-500`} />
              <span className={isVerySmall ? 'hidden' : 'inline'}>Reset</span>
            </button>
            <button
              onClick={() => {
                setSelectedDate(null);
                setEditingTransaction(null);
                setShowTransactionModal(true);
              }}
              className={`group relative ${isVerySmall ? 'px-3 py-1.5 text-[11px]' : (isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm')} bg-white/5 hover:bg-white/10 transition-all duration-300 text-white font-light flex items-center gap-1.5 overflow-hidden rounded-lg flex-1 justify-center`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Plus className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} group-hover:rotate-90 transition-transform duration-300`} />
              <span className={isVerySmall ? 'hidden' : 'inline'}>Add</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className={`grid grid-cols-4 gap-2 mb-4`}>
          <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl ${getCardPadding()}`}>
            <Wallet className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-white/60 mb-1`} />
            <p className={`${isVerySmall ? 'text-sm' : (isMobile ? 'text-base' : 'text-lg')} font-light text-white`}>{formatCurrency(currentBalance)}</p>
            <p className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} text-white/40 mt-0.5 font-light`}>Net Balance</p>
          </div>
          <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl ${getCardPadding()}`}>
            <TrendingUp className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-green-500/80 mb-1`} />
            <p className={`${isVerySmall ? 'text-sm' : (isMobile ? 'text-base' : 'text-lg')} font-light text-green-500`}>+{formatCurrency(getMonthIncome())}</p>
            <p className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} text-white/40 mt-0.5 font-light`}>Income</p>
          </div>
          <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl ${getCardPadding()}`}>
            <TrendingDown className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-red-500/80 mb-1`} />
            <p className={`${isVerySmall ? 'text-sm' : (isMobile ? 'text-base' : 'text-lg')} font-light text-red-500`}>-{formatCurrency(getMonthExpenses())}</p>
            <p className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} text-white/40 mt-0.5 font-light`}>Expenses</p>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="flex-1 px-4 pb-6">
        <Calendar
          transactions={transactions}
          categories={categories}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onDayClick={handleDayClick}
          getDayTransactions={getDayTransactions}
          getCategoryById={getCategoryById}
          isFutureDisabled={true}
          showBalance={true}
          className="w-full"
        />
      </div>

      {/* Modal del día - CON ICONOS DE LUCIDE */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2">
          <div className={`bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full ${isVerySmall ? 'max-w-[95%]' : 'max-w-md'} flex flex-col ${isVerySmall ? 'max-h-[90vh]' : 'max-h-[85vh]'}`}>
            <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
              <div className="flex justify-between items-center p-3 border-b border-white/10">
                <div>
                  <h3 className={`${isVerySmall ? 'text-sm' : 'text-base'} font-light text-white`}>{formatDate(selectedDate, 'long')}</h3>
                  <p className={`${isVerySmall ? 'text-[8px]' : 'text-[10px]'} text-white/40 mt-0.5 font-light`}>Daily transactions</p>
                </div>
                <button onClick={() => setShowDayModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {selectedDateTransactions.map(t => {
                  const cat = getCategoryById(t.categoryId);
                  if (!cat) return null;
                  const isDebtTransaction = t.tags && (t.tags.includes('debt') || t.tags.includes('debt-payment'));
                  const IconComponent = getIconComponent(cat.icon);
                  
                  return (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/5 group">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`${isVerySmall ? 'w-6 h-6' : 'w-7 h-7'} rounded-lg flex items-center justify-center text-sm transition-all duration-300 group-hover:scale-110 flex-shrink-0`}
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          <IconComponent className={`${isVerySmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} style={{ color: cat.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`${isVerySmall ? 'text-xs' : 'text-sm'} font-light text-white truncate`}>{cat.name}</p>
                          <p className={`${isVerySmall ? 'text-[8px]' : 'text-[10px]'} text-white/40 truncate`}>{t.description || '-'}</p>
                          {isDebtTransaction && (
                            <span className="text-[7px] px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-500/80 mt-0.5 inline-block">
                              Debt
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <p className={`${isVerySmall ? 'text-xs' : 'text-sm'} font-light ${cat.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                          {cat.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </p>
                        {!isDebtTransaction ? (
                          <>
                            <button
                              onClick={() => handleEditTransaction(t)}
                              className="p-1 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="p-1 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-500" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setShowDayModal(false);
                              navigate('/debts');
                            }}
                            className="p-1 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Manage in Debts module"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-amber-500 hover:text-amber-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {selectedDateTransactions.length === 0 && (
                  <div className="text-center py-6">
                    <div className={`${isVerySmall ? 'w-8 h-8' : 'w-10 h-10'} mx-auto mb-2 bg-white/[0.03] flex items-center justify-center rounded-lg`}>
                      <CalendarIcon className={`${isVerySmall ? 'w-4 h-4' : 'w-5 h-5'} text-white/20`} />
                    </div>
                    <p className="text-white/40 text-xs font-light">No transactions for this day</p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
              <div className="p-3 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowDayModal(false);
                    setEditingTransaction(null);
                    setShowTransactionModal(true);
                  }}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center justify-center gap-2 group rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
                  Add Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
          setSelectedDate(null);
        }}
        onSave={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
          setSelectedDate(null);
        }}
        editingTransaction={editingTransaction}
        defaultDate={selectedDate || undefined}
      />

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmReset}
        title="Reset All Transactions"
        message="Are you sure you want to reset ALL transactions? This action cannot be undone and all your financial data will be lost."
        confirmText="Reset All"
        cancelText="Cancel"
        type="danger"
      />

      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default CalendarTransactions;