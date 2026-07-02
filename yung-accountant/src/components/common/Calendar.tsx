// components/common/Calendar.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const weekDaysShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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
  currentDate,
  onDateChange,
  onDayClick,
  getDayTransactions,
  getCategoryById,
  isFutureDisabled = false,
  className = '',
}) => {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isVerySmall, setIsVerySmall] = useState(false);
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  // Build today's date string from LOCAL components — toISOString()
  // would give UTC which shifts by a day in negative timezones (e.g. Colombia UTC-5).
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
    
    const maxTx = isVerySmall ? 1 : (isMobile ? 2 : 3);
    
    return { 
      dayIncome, 
      dayExpenses, 
      transactionCount: dayTransactions.length, 
      transactions: dayTransactions.slice(0, maxTx), 
      hasMore: dayTransactions.length > maxTx
    };
  }, [getDayTransactions, getCategoryById, isMobile, isVerySmall]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay();
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

  const getCellHeightClass = () => {
    if (isVerySmall) return 'min-h-[50px]';
    if (isMobile) return 'min-h-[65px]';
    return 'min-h-[90px]';
  };

  const renderDayCell = useCallback((day: any) => {
    if (day.type === 'empty') {
      return <div key={day.key} className={`bg-transparent ${getCellHeightClass()}`} />;
    }
    
    const isHovered = hoveredDay === day.dateStr;
    
    // Versión muy pequeña (<480px)
    if (isVerySmall) {
      return (
        <div
          key={day.key}
          onClick={() => !day.isFuture && onDayClick(day.dateStr)}
          className={`relative flex flex-col cursor-pointer transition-all duration-300 p-1 ${getCellHeightClass()} ${
            day.isFuture 
              ? 'opacity-30 cursor-not-allowed glass-sm' 
              : day.isToday 
                ? 'glass-md' 
                : 'glass-sm hover:bg-[var(--theme-background-glass-hover)]'
          }`}
          style={day.isToday ? { boxShadow: '0 0 16px -6px var(--theme-primary)' } : {}}
        >
          <div className="absolute top-0.5 right-1">
            <span className={`text-sm font-medium`} style={{ color: day.isToday ? 'var(--theme-primary)' : 'var(--theme-text-secondary)' }}>
              {day.day}
            </span>
          </div>
          
          {!day.isFuture && day.transactionCount > 0 && (
            <div className="mt-4 space-y-0">
              {day.dayIncome > 0 && (
                <div className="flex items-center gap-0.5">
                  <TrendingUp className="w-1.5 h-1.5" style={{ color: 'var(--semantic-income)' }} />
                  <span className="text-[7px] font-medium truncate max-w-[35px]" style={{ color: 'var(--semantic-income)' }}>
                    {formatCurrency(day.dayIncome)}
                  </span>
                </div>
              )}
              {day.dayExpenses > 0 && (
                <div className="flex items-center gap-0.5">
                  <TrendingDown className="w-1.5 h-1.5" style={{ color: 'var(--semantic-expense)' }} />
                  <span className="text-[7px] font-medium truncate max-w-[35px]" style={{ color: 'var(--semantic-expense)' }}>
                    {formatCurrency(day.dayExpenses)}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {day.transactionCount > 0 && !day.isFuture && (
            <div className="absolute bottom-0.5 right-1">
              <div className="w-3 h-3 flex items-center justify-center rounded-full glass-sm">
                <span className="text-[6px] font-medium" style={{ color: 'var(--theme-primary)' }}>{day.transactionCount}</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    // Versión móvil (481-767px)
    if (isMobile) {
      return (
        <div
          key={day.key}
          onClick={() => !day.isFuture && onDayClick(day.dateStr)}
          className={`relative flex flex-col cursor-pointer transition-all duration-300 p-1.5 ${getCellHeightClass()} ${
            day.isFuture 
              ? 'opacity-30 cursor-not-allowed glass-sm' 
              : day.isToday 
                ? 'glass-md' 
                : 'glass-sm hover:bg-[var(--theme-background-glass-hover)]'
          }`}
          style={day.isToday ? { boxShadow: '0 0 20px -8px var(--theme-primary)' } : {}}
        >
          <div className="absolute top-1 right-1.5">
            <span className={`text-base font-medium`} style={{ color: day.isToday ? 'var(--theme-primary)' : 'var(--theme-text-secondary)' }}>
              {day.day}
            </span>
          </div>
          
          {!day.isFuture && day.transactionCount > 0 && (
            <div className="mt-5 space-y-0.5">
              {day.dayIncome > 0 && (
                <div className="flex items-center gap-0.5">
                  <TrendingUp className="w-2 h-2" style={{ color: 'var(--semantic-income)' }} />
                  <span className="text-[8px] font-medium truncate max-w-[50px]" style={{ color: 'var(--semantic-income)' }}>
                    {formatCurrency(day.dayIncome)}
                  </span>
                </div>
              )}
              {day.dayExpenses > 0 && (
                <div className="flex items-center gap-0.5">
                  <TrendingDown className="w-2 h-2" style={{ color: 'var(--semantic-expense)' }} />
                  <span className="text-[8px] font-medium truncate max-w-[50px]" style={{ color: 'var(--semantic-expense)' }}>
                    {formatCurrency(day.dayExpenses)}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {day.transactionCount > 0 && !day.isFuture && (
            <div className="absolute bottom-1 right-1.5">
              <div className="w-3.5 h-3.5 flex items-center justify-center rounded-full glass-sm">
                <span className="text-[7px] font-medium" style={{ color: 'var(--theme-primary)' }}>{day.transactionCount}</span>
              </div>
            </div>
          )}
          
          {day.isFuture && (
            <div className="absolute inset-0 flex items-center justify-center">
              <CalendarIcon className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.15 }} />
            </div>
          )}
        </div>
      );
    }
    
    // Versión desktop
    return (
      <div
        key={day.key}
        onMouseEnter={() => setHoveredDay(day.dateStr)}
        onMouseLeave={() => setHoveredDay(null)}
        onClick={() => !day.isFuture && onDayClick(day.dateStr)}
        className={`group relative flex flex-col cursor-pointer transition-all duration-500 ease-out p-2 ${getCellHeightClass()} overflow-hidden ${
          day.isFuture 
            ? 'opacity-30 cursor-not-allowed glass-sm' 
            : day.isToday 
              ? 'glass-md' 
              : isHovered 
                ? 'glass-aero scale-[1.02] z-10' 
                : 'glass-sm hover:bg-[var(--theme-background-glass-hover)]'
        }`}
        style={day.isToday ? { boxShadow: '0 0 24px -8px var(--theme-primary)' } : {}}
      >
        <div className="absolute top-2 right-2">
          <span className={`text-xl font-medium transition-all duration-300`} style={{ color: day.isToday ? 'var(--theme-primary)' : isHovered ? 'var(--theme-text-primary)' : 'var(--theme-text-secondary)' }}>
            {day.day}
          </span>
        </div>
        
        <div className="mt-6 space-y-0.5">
          {day.dayIncome > 0 && !day.isFuture && (
            <div className="flex items-center gap-1 transition-all duration-300 group-hover:scale-105">
              <TrendingUp className="w-2.5 h-2.5" style={{ color: 'var(--semantic-income)' }} />
              <span className="text-[10px] font-medium truncate max-w-[80px]" style={{ color: 'var(--semantic-income)' }}>
                {formatCurrency(day.dayIncome)}
              </span>
            </div>
          )}
          
          {day.dayExpenses > 0 && !day.isFuture && (
            <div className="flex items-center gap-1 transition-all duration-300 group-hover:scale-105">
              <TrendingDown className="w-2.5 h-2.5" style={{ color: 'var(--semantic-expense)' }} />
              <span className="text-[10px] font-medium truncate max-w-[80px]" style={{ color: 'var(--semantic-expense)' }}>
                {formatCurrency(day.dayExpenses)}
              </span>
            </div>
          )}
        </div>

        {day.transactionCount > 0 && !day.isFuture && (
          <div className="absolute bottom-2 right-2">
            <div className="w-5 h-5 flex items-center justify-center rounded-full glass-sm transition-all duration-300 group-hover:scale-110">
              <span className="text-[9px] font-medium" style={{ color: 'var(--theme-primary)' }}>{day.transactionCount}</span>
            </div>
          </div>
        )}

        {day.isFuture && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full flex items-center justify-center glass-sm">
              <CalendarIcon className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.15 }} />
            </div>
          </div>
        )}

        {isHovered && !day.isFuture && (
          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ border: '1px solid var(--theme-border-medium)' }} />
        )}
      </div>
    );
  }, [hoveredDay, onDayClick, isMobile, isVerySmall]);

  const currentWeekDays = isVerySmall ? weekDaysShort : (isMobile ? weekDaysShort : weekDays);

  return (
    <div className={`rounded-[2rem] overflow-hidden flex flex-col w-full glass-md ${className}`}>
      {/* Navegación */}
      <div className={`flex items-center justify-between flex-shrink-0 ${isVerySmall ? 'p-2' : (isMobile ? 'p-3' : 'p-4')}`}
        style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
        <div className="flex items-center gap-1">
          <button 
            onClick={handlePrevMonth} 
            className={`${isVerySmall ? 'p-1' : (isMobile ? 'p-1.5' : 'p-2')} rounded-2xl transition-all duration-300 hover:scale-110 glass-sm`}
          >
            <ChevronLeft className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')}`} style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
          <span className={`${isVerySmall ? 'text-[11px]' : (isMobile ? 'text-sm' : 'text-base')} font-medium px-2`} style={{ color: 'var(--theme-text-primary)' }}>
            {monthNames[currentMonth]} <span style={{ color: 'var(--theme-text-tertiary)' }}>{currentYear}</span>
          </span>
          <button 
            onClick={handleNextMonth} 
            className={`${isVerySmall ? 'p-1' : (isMobile ? 'p-1.5' : 'p-2')} rounded-2xl transition-all duration-300 hover:scale-110 glass-sm`}
          >
            <ChevronRight className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')}`} style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>
        <button 
          onClick={handleToday} 
          className={`${isVerySmall ? 'px-2 py-1 text-[9px]' : (isMobile ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs')} rounded-2xl font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm`}
          style={{ color: 'var(--theme-text-secondary)' }}
        >
          Today
        </button>
      </div>

      {/* Días de la semana */}
      <div className={`grid grid-cols-7 flex-shrink-0 ${isVerySmall ? 'py-1' : (isMobile ? 'py-1.5' : 'py-2')} px-1`}
        style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
        {currentWeekDays.map(day => (
          <div key={day} className={`text-center font-medium tracking-[0.08em] uppercase ${isVerySmall ? 'text-[9px]' : (isMobile ? 'text-[10px]' : 'text-xs')}`}
            style={{ color: 'var(--theme-text-tertiary)' }}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendario Grid - SIN scroll horizontal */}
      <div className="w-full overflow-x-hidden">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 w-full" style={{ borderBottom: weekIndex < weeks.length - 1 ? '1px solid var(--theme-border-dark)' : 'none' }}>
            {week.map((day) => renderDayCell(day))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;