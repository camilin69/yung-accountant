// pages/CalendarTransactions.tsx

import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus,
  Wallet,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  X
} from 'lucide-react';
import TransactionModal from '../components/modals/TransactionModal';

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const CalendarTransactions: React.FC = () => {
  const { transactions, addTransaction, deleteTransaction } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const calculateBalance = (date: string) => {
    let balance = 0;
    transactions.forEach(t => {
      if (t.date <= date) {
        balance += t.isIncome ? t.amount : -t.amount;
      }
    });
    return balance;
  };

  const getMonthIncome = useMemo(() => {
    const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    return transactions
      .filter(t => t.isIncome && t.date >= startDate && t.date <= endDate)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, currentYear, currentMonth]);

  const getMonthExpenses = useMemo(() => {
    const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    return transactions
      .filter(t => !t.isIncome && t.date >= startDate && t.date <= endDate)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, currentYear, currentMonth]);

  const currentBalance = calculateBalance(new Date().toISOString().split('T')[0]);
  const projectedBalance = calculateBalance(
    new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
  );

  const renderCalendar = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    let startDayOfWeek = firstDay.getDay();
    const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const cells = [];

    // Previous month days
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`empty-${i}`} className="bg-gray-900/50 rounded-lg p-2 min-h-[100px] opacity-30" />);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      const dayIncome = dayTransactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0);
      const dayExpenses = dayTransactions.filter(t => !t.isIncome).reduce((sum, t) => sum + t.amount, 0);
      const dayBalance = calculateBalance(dateStr);

      cells.push(
        <div
          key={dateStr}
          onClick={() => {
            setSelectedDate(dateStr);
            setModalDate(dateStr);
            setShowModal(true);
          }}
          className={`bg-gray-800 rounded-lg p-2 min-h-[100px] cursor-pointer transition-all duration-300 hover:bg-primary/10 hover:scale-[1.02] ${
            isToday ? 'border-2 border-primary bg-primary/5' : ''
          }`}
        >
          <div className="font-semibold text-sm mb-1">{day}</div>
          {dayIncome > 0 && (
            <div className="text-[10px] text-green-500">+{formatCurrency(dayIncome)}</div>
          )}
          {dayExpenses > 0 && (
            <div className="text-[10px] text-red-500">-{formatCurrency(dayExpenses)}</div>
          )}
          <div className="text-[11px] text-gray-400 mt-1 font-medium">{formatCurrency(dayBalance)}</div>
          {dayTransactions.length > 0 && (
            <div className="text-[9px] text-primary mt-1">{dayTransactions.length} txns</div>
          )}
        </div>
      );
    }

    // Fill remaining cells to make 42 (6 weeks)
    const remaining = 42 - cells.length;
    for (let i = 0; i < remaining; i++) {
      cells.push(<div key={`empty-end-${i}`} className="bg-gray-900/50 rounded-lg p-2 min-h-[100px] opacity-30" />);
    }

    return cells;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleAddTransaction = (transactionData: any) => {
    addTransaction(transactionData);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Delete this transaction?')) {
      deleteTransaction(id);
    }
  };

  const selectedDateTransactions = selectedDate
    ? transactions.filter(t => t.date === selectedDate)
    : [];

  const selectedDateIncome = selectedDateTransactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0);
  const selectedDateExpenses = selectedDateTransactions.filter(t => !t.isIncome).reduce((sum, t) => sum + t.amount, 0);
  const selectedDateBalance = selectedDate ? calculateBalance(selectedDate) : 0;

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          <CalendarIcon className="inline mr-2 mb-1 w-7 h-7" />
          Calendar Transactions
        </h1>
        <div className="flex items-center gap-3">
          <button onClick={handlePrevMonth} className="btn btn-outline btn-sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xl font-semibold min-w-[200px] text-center">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button onClick={handleNextMonth} className="btn btn-outline btn-sm">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={handleToday} className="btn btn-outline btn-sm">
            <CalendarIcon className="w-4 h-4" /> Hoy
          </button>
          <button onClick={() => {
            setModalDate(null);
            setShowModal(true);
          }} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <Wallet className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-primary">{formatCurrency(currentBalance)}</div>
          <div className="text-sm text-gray-500">Current Balance</div>
        </div>
        <div className="card text-center">
          <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-primary">{formatCurrency(projectedBalance)}</div>
          <div className="text-sm text-gray-500">Projected (EOM)</div>
        </div>
        <div className="card text-center">
          <ArrowUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-500">{formatCurrency(getMonthIncome)}</div>
          <div className="text-sm text-gray-500">Month Income</div>
        </div>
        <div className="card text-center">
          <ArrowDown className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-500">{formatCurrency(getMonthExpenses)}</div>
          <div className="text-sm text-gray-500">Month Expenses</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-primary py-2 text-sm">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {renderCalendar()}
        </div>
      </div>

      {/* Daily Detail Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-card rounded-xl max-w-2xl w-[90%] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold">
                {modalDate ? formatDate(modalDate, 'long') : 'Add Transaction'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-danger transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {modalDate && selectedDateTransactions && (
                <>
                  <div className="space-y-3 mb-6">
                    {selectedDateTransactions.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                            t.isIncome ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            {t.isIncome ? '💰' : '💸'}
                          </div>
                          <div>
                            <div className="font-medium">{t.category}</div>
                            <div className="text-xs text-gray-500">{t.description || '-'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`font-semibold ${t.isIncome ? 'text-green-500' : 'text-red-500'}`}>
                            {t.isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                          </div>
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="text-gray-500 hover:text-danger transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {selectedDateTransactions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">No transactions for this day</div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Income</div>
                      <div className="text-green-500 font-semibold">+{formatCurrency(selectedDateIncome)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Expenses</div>
                      <div className="text-red-500 font-semibold">-{formatCurrency(selectedDateExpenses)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Balance</div>
                      <div className="text-primary font-semibold">{formatCurrency(selectedDateBalance)}</div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setTimeout(() => {
                          setModalDate(modalDate);
                          setShowModal(true);
                        }, 100);
                      }}
                      className="btn btn-primary"
                    >
                      <Plus className="w-4 h-4" /> Add Transaction
                    </button>
                  </div>
                </>
              )}
              {!modalDate && (
                <TransactionModal
                  onClose={() => setShowModal(false)}
                  onSave={handleAddTransaction}
                  defaultDate={new Date().toISOString().split('T')[0]}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTransactions;