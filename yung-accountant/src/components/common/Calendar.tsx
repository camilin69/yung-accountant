// components/common/Calendar.tsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const weekDaysShort = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

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
  const todayStr = new Date().toISOString().split('T')[0];

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

  const getDayTransactionsData = useCallback((dateStr: string) => {
    const dayTransactions = getDayTransactions(dateStr);
    const dayIncome = dayTransactions.filter((t: any) => {
      const cat = getCategoryById(t.categoryId);
      return cat?.type === 'income';
    }).reduce((sum: number, t: any) => sum + t.amount, 0);
    const dayExpenses = dayTransactions.filter((t: any) => {
      const cat = getCategoryById(t.categoryId);
      return cat?.type === 'expense';
    })?.reduce((sum: number, t: any) => sum + t.amount, 0);
    
    return { 
      dayIncome, 
      dayExpenses, 
      transactionCount: dayTransactions.length, 
      transactions: dayTransactions.slice(0, isVerySmall ? 1 : (isMobile ? 2 : 3)), 
      hasMore: dayTransactions.length > (isVerySmall ? 1 : (isMobile ? 2 : 3))
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

  // Altura base para las celdas según el dispositivo
  const getCellHeightClass = () => {
    if (isVerySmall) return 'min-h-[50px]';
    if (isMobile) return 'min-h-[65px]';
    return 'min-h-[90px]';
  };

  const renderDayCell = useCallback((day: any) => {
    if (day.type === 'empty') {
      return <div key={day.key} className={`bg-white/[0.02] ${getCellHeightClass()}`} />;
    }
    
    const isHovered = hoveredDay === day.dateStr;
    
    // Versión muy pequeña (<480px)
    if (isVerySmall) {
      return (
        <div
          key={day.key}
          onClick={() => !day.isFuture && onDayClick(day.dateStr)}
          className={`
            relative flex flex-col cursor-pointer
            transition-all duration-200
            p-1 ${getCellHeightClass()}
            ${day.isFuture 
              ? 'bg-white/[0.01] opacity-40 cursor-not-allowed' 
              : day.isToday 
                ? 'bg-[#6366F1]/10 border-l border-t border-[#6366F1]/30' 
                : 'bg-white/[0.03] active:bg-white/10'
            }
          `}
        >
          <div className="absolute top-0.5 right-1">
            <span className={`
              text-sm font-medium
              ${day.isFuture ? 'text-white/100' : day.isToday ? 'text-[#6366F1]' : 'text-white/80'}
            `}>
              {day.day}
            </span>
          </div>
          
          {!day.isFuture && day.transactionCount > 0 && (
            <div className="mt-4 space-y-0">
              {day.dayIncome > 0 && (
                <div className="flex items-center gap-0.5">
                  <TrendingUp className="w-1.5 h-1.5 text-green-700" />
                  <span className="text-[7px] text-green-700 font-medium truncate max-w-[35px]">
                    {formatCurrency(day.dayIncome)}
                  </span>
                </div>
              )}
              {day.dayExpenses > 0 && (
                <div className="flex items-center gap-0.5">
                  <TrendingDown className="w-1.5 h-1.5 text-red-700" />
                  <span className="text-[7px] text-red-700 font-medium truncate max-w-[35px]">
                    {formatCurrency(day.dayExpenses)}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {day.transactionCount > 0 && !day.isFuture && (
            <div className="absolute bottom-0.5 right-1">
              <div className="w-3 h-3 bg-[#6366F1]/20 flex items-center justify-center rounded">
                <span className="text-[6px] text-[#6366F1] font-medium">{day.transactionCount}</span>
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
          className={`
            relative flex flex-col cursor-pointer
            transition-all duration-200
            p-1.5 ${getCellHeightClass()}
            ${day.isFuture 
              ? 'bg-white/[0.01] opacity-40 cursor-not-allowed' 
              : day.isToday 
                ? 'bg-[#6366F1]/10 border-l border-t border-[#6366F1]/30' 
                : 'bg-white/[0.03] active:bg-white/10'
            }
          `}
        >
          <div className="absolute top-1 right-1.5">
            <span className={`
              text-base font-medium
              ${day.isFuture ? 'text-white/100' : day.isToday ? 'text-[#6366F1]' : 'text-white/80'}
            `}>
              {day.day}
            </span>
          </div>
          
          {!day.isFuture && day.transactionCount > 0 && (
            <div className="mt-5 space-y-0.5">
              {day.dayIncome > 0 && (
                <div className="flex items-center gap-0.5">
                  <TrendingUp className="w-2 h-2 text-green-700" />
                  <span className="text-[8px] text-green-700 font-medium truncate max-w-[50px]">
                    {formatCurrency(day.dayIncome)}
                  </span>
                </div>
              )}
              {day.dayExpenses > 0 && (
                <div className="flex items-center gap-0.5">
                  <TrendingDown className="w-2 h-2 text-red-700" />
                  <span className="text-[8px] text-red-700 font-medium truncate max-w-[50px]">
                    {formatCurrency(day.dayExpenses)}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {day.transactionCount > 0 && !day.isFuture && (
            <div className="absolute bottom-1 right-1.5">
              <div className="w-3.5 h-3.5 bg-[#6366F1]/20 flex items-center justify-center rounded">
                <span className="text-[7px] text-[#6366F1] font-medium">{day.transactionCount}</span>
              </div>
            </div>
          )}
          
          {day.isFuture && (
            <div className="absolute inset-0 flex items-center justify-center">
              <CalendarIcon className="w-3 h-3 text-white/20" />
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
        className={`
          group relative flex flex-col cursor-pointer
          transition-all duration-300 ease-out
          backdrop-blur-sm p-2 ${getCellHeightClass()}
          ${day.isFuture 
            ? 'bg-white/[0.01] opacity-40 cursor-not-allowed' 
            : day.isToday 
              ? 'bg-[#6366F1]/10 border-l border-t border-[#6366F1]/30' 
              : isHovered 
                ? 'bg-white/10 scale-[1.01] shadow-xl z-10' 
                : 'bg-white/[0.03] hover:bg-white/10'
          }
        `}
      >
        <div className="absolute top-2 right-2">
          <span className={`
            text-xl font-medium transition-all duration-300
            ${day.isFuture ? 'text-white/100' : day.isToday ? 'text-[#6366F1]' : isHovered ? 'text-white' : 'text-white/80'}
          `}>
            {day.day}
          </span>
        </div>
        
        {day.dayIncome > 0 && !day.isFuture && (
          <div className="flex items-center gap-0.5 mt-1 transition-all duration-300 group-hover:scale-105">
            <TrendingUp className="w-2.5 h-2.5 text-green-700" />
            <span className="text-xs text-green-700 font-medium">{formatCurrency(day.dayIncome)}</span>
          </div>
        )}
        
        {day.dayExpenses > 0 && !day.isFuture && (
          <div className="flex items-center gap-0.5 mt-0.5 transition-all duration-300 group-hover:scale-105">
            <TrendingDown className="w-2.5 h-2.5 text-red-700" />
            <span className="text-xs text-red-700 font-medium">{formatCurrency(day.dayExpenses)}</span>
          </div>
        )}

        {day.transactionCount > 0 && !day.isFuture && (
          <div className="absolute bottom-2 right-2">
            <div className="w-5 h-5 bg-[#6366F1]/20 flex items-center justify-center rounded">
              <span className="text-[9px] text-[#6366F1] font-medium">{day.transactionCount}</span>
            </div>
          </div>
        )}

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
  }, [hoveredDay, onDayClick, isMobile, isVerySmall]);

  const currentWeekDays = isVerySmall ? weekDaysShort : (isMobile ? weekDaysShort : weekDays);

  return (
    <div className={`
      bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden
      flex flex-col w-full h-full
      ${className}
    `}>
      {/* Navegación */}
      <div className={`
        flex items-center justify-between flex-shrink-0
        ${isVerySmall ? 'p-2' : (isMobile ? 'p-3' : 'p-4')}
        border-b border-white/10
      `}>
        <div className="flex items-center gap-1">
          <button 
            onClick={handlePrevMonth} 
            className={`
              ${isVerySmall ? 'p-1' : (isMobile ? 'p-1.5' : 'p-2')}
              bg-white/[0.03] hover:bg-white/10 active:bg-white/20
              transition-all duration-300 rounded-lg
            `}
          >
            <ChevronLeft className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-white/60`} />
          </button>
          <span className={`
            ${isVerySmall ? 'text-[11px]' : (isMobile ? 'text-sm' : 'text-base')}
            font-medium text-white px-2
          `}>
            {monthNames[currentMonth]} <span className="text-white/40">{currentYear}</span>
          </span>
          <button 
            onClick={handleNextMonth} 
            className={`
              ${isVerySmall ? 'p-1' : (isMobile ? 'p-1.5' : 'p-2')}
              bg-white/[0.03] hover:bg-white/10 active:bg-white/20
              transition-all duration-300 rounded-lg
            `}
          >
            <ChevronRight className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-white/60`} />
          </button>
        </div>
        <button 
          onClick={handleToday} 
          className={`
            ${isVerySmall ? 'px-2 py-1 text-[9px]' : (isMobile ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-sm')}
            bg-white/[0.03] hover:bg-white/10 active:bg-white/20
            transition-all duration-300 font-medium rounded-lg
          `}
        >
          Hoy
        </button>
      </div>

      {/* Días de la semana */}
      <div className={`
        grid grid-cols-7 border-b border-white/10 flex-shrink-0
        ${isVerySmall ? 'py-1' : (isMobile ? 'py-1.5' : 'py-2')}
        px-1
      `}>
        {currentWeekDays.map(day => (
          <div key={day} className={`
            text-center font-medium text-white/40 tracking-wider
            ${isVerySmall ? 'text-[9px]' : (isMobile ? 'text-[10px]' : 'text-xs')}
          `}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendario Grid - AHORA CON scroll SOLO SI ES NECESARIO */}
      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-white/5 last:border-b-0">
            {week.map((day) => renderDayCell(day))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;