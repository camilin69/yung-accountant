// components/common/Calendar.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useStore } from '../../store/useStore';

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

interface CalendarProps {
  transactions: any[];
  categories: any[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDayClick: (dateStr: string) => void;
  getDayTransactions: (dateStr: string) => any[];
  getCategoryById: (id: string) => any;
  isFutureDisabled?: boolean;
  showBalance?: boolean;
  className?: string;
}

const Calendar: React.FC<CalendarProps> = ({
  transactions,
  categories,
  currentDate,
  onDateChange,
  onDayClick,
  getDayTransactions,
  getCategoryById,
  isFutureDisabled = false,
  showBalance = true,
  className = '',
}) => {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const todayStr = new Date().toISOString().split('T')[0];

  const getDayTransactionsData = useCallback((dateStr: string) => {
    const dayTransactions = getDayTransactions(dateStr);
    const dayIncome = dayTransactions.filter((t: any) => {
      const cat = getCategoryById(t.categoryId);
      return cat?.type === 'income';
    }).reduce((sum: number, t: any) => sum + t.amount, 0);
    const dayExpenses = dayTransactions.filter((t: any) => {
      const cat = getCategoryById(t.categoryId);
      return cat?.type === 'expense';
    }).reduce((sum: number, t: any) => sum + t.amount, 0);
    
    return { dayIncome, dayExpenses, transactionCount: dayTransactions.length, transactions: dayTransactions.slice(0, 3), hasMore: dayTransactions.length > 3 };
  }, [getDayTransactions, getCategoryById]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    let startDayOfWeek = firstDay.getDay();
    const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const days = [];
    
    for (let i = 0; i < startOffset; i++) {
      days.push({ type: 'empty', key: `empty-${i}` });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      const { dayIncome, dayExpenses, transactionCount, transactions: dayTxns, hasMore } = getDayTransactionsData(dateStr);
      
      days.push({
        type: 'day',
        key: dateStr,
        day,
        dateStr,
        isToday,
        isFuture: isFutureDisabled && isFuture,
        dayIncome,
        dayExpenses,
        transactionCount,
        transactions: dayTxns,
        hasMore,
      });
    }
    
    return days;
  }, [currentYear, currentMonth, getDayTransactionsData, todayStr, isFutureDisabled]);

  const weeksCount = Math.ceil(calendarDays.length / 7);
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < weeksCount; i++) {
      result.push(calendarDays.slice(i * 7, (i + 1) * 7));
    }
    return result;
  }, [calendarDays, weeksCount]);

  const handlePrevMonth = () => onDateChange(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => onDateChange(new Date(currentYear, currentMonth + 1, 1));
  const handleToday = () => onDateChange(new Date());

  const renderDayCell = useCallback((day: any) => {
    if (day.type === 'empty') {
      return <div key={day.key} className="bg-white/[0.02]" />;
    }
    
    const isHovered = hoveredDay === day.dateStr;
    
    return (
      <div
        key={day.key}
        onMouseEnter={() => setHoveredDay(day.dateStr)}
        onMouseLeave={() => setHoveredDay(null)}
        onClick={() => !day.isFuture && onDayClick(day.dateStr)}
        className={`
          group relative flex flex-col cursor-pointer
          transition-all duration-300 ease-out
          backdrop-blur-sm p-2
          ${day.isFuture 
            ? 'bg-white/[0.01] opacity-40 cursor-not-allowed' 
            : day.isToday 
              ? 'bg-[#6366F1]/10 border-l border-t border-[#6366F1]/30' 
              : isHovered 
                ? 'bg-white/10 scale-[1.02] shadow-2xl' 
                : 'bg-white/[0.03] hover:bg-white/10'
          }
          ${isHovered && !day.isFuture ? 'z-10' : 'z-0'}
        `}
      >
        {isHovered && !day.isFuture && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        )}
        
        {/* Day number - top right */}
        <div className="absolute top-2 right-2">
          <span className={`
            text-xs font-medium transition-all duration-300
            ${day.isFuture ? 'text-white/100' : day.isToday ? 'text-[#6366F1]' : isHovered ? 'text-white' : 'text-white/50'}
          `}>
            {day.day}
          </span>
        </div>
        
        {/* Income indicator */}
        {day.dayIncome > 0 && !day.isFuture && (
          <div className="flex items-center gap-0.5 mt-1 transition-all duration-300 group-hover:scale-105">
            <TrendingUp className="w-2.5 h-2.5 text-green-500" />
            <span className="text-[9px] text-green-500 font-medium">{formatCurrency(day.dayIncome)}</span>
          </div>
        )}
        
        {/* Expense indicator */}
        {day.dayExpenses > 0 && !day.isFuture && (
          <div className="flex items-center gap-0.5 mt-0.5 transition-all duration-300 group-hover:scale-105">
            <TrendingDown className="w-2.5 h-2.5 text-red-500" />
            <span className="text-[9px] text-red-500 font-medium">{formatCurrency(day.dayExpenses)}</span>
          </div>
        )}

        {/* Transaction count badge */}
        {day.transactionCount > 0 && !day.isFuture && (
          <div className="absolute bottom-2 right-2">
            <div className="w-5 h-5 bg-[#6366F1]/20 flex items-center justify-center backdrop-blur-sm">
              <span className="text-[9px] text-[#6366F1] font-medium">{day.transactionCount}</span>
            </div>
          </div>
        )}

        {/* Future indicator */}
        {day.isFuture && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
              <CalendarIcon className="w-3 h-3 text-white/20" />
            </div>
          </div>
        )}

        {isHovered && !day.isFuture && (
          <div className="absolute inset-0 border border-white/10 pointer-events-none animate-pulse" />
        )}
      </div>
    );
  }, [hoveredDay, onDayClick]);

  return (
    <div className={`bg-white/[0.02] backdrop-blur-sm border border-white/10 overflow-hidden flex flex-col ${className}`}>
      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-1">
          <button onClick={handlePrevMonth} className="p-1.5 bg-white/[0.03] hover:bg-white/10 transition-all duration-300 hover:scale-105 rounded-lg">
            <ChevronLeft className="w-4 h-4 text-white/60" />
          </button>
          <span className="text-sm font-light text-white px-3">
            {monthNames[currentMonth]} <span className="text-white/40">{currentYear}</span>
          </span>
          <button onClick={handleNextMonth} className="p-1.5 bg-white/[0.03] hover:bg-white/10 transition-all duration-300 hover:scale-105 rounded-lg">
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <button onClick={handleToday} className="px-3 py-1 text-xs bg-white/[0.03] hover:bg-white/10 transition-all duration-300 font-light rounded-lg">
          Today
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 border-b border-white/10 flex-shrink-0">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-[10px] font-light text-white/40 tracking-wider">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar cells */}
      <div className="flex-1 flex flex-col min-h-0">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 flex-1">
            {week.map((day) => renderDayCell(day))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;