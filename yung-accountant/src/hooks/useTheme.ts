// hooks/useTheme.ts
import { useContext } from 'react';
import { ThemeContext, type ThemeContextType } from '../contexts/ThemeContext';

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Hook para estilos específicos basados en el tema
export const useThemeStyles = () => {
  const { currentMode } = useTheme();

  const getChartColors = () => {
    const isDark = currentMode === 'dark';
    
    const baseColors = {
      income: {
        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.5)' : 'rgba(5, 150, 105, 0.3)',
        borderColor: isDark ? '#10B981' : '#059669',
      },
      expense: {
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.5)' : 'rgba(220, 38, 38, 0.3)',
        borderColor: isDark ? '#EF4444' : '#DC2626',
      },
      success: {
        backgroundColor: isDark ? 'rgba(34, 197, 94, 0.5)' : 'rgba(22, 163, 74, 0.3)',
        borderColor: isDark ? '#22C55E' : '#16A34A',
      },
      warning: {
        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.5)' : 'rgba(217, 119, 6, 0.3)',
        borderColor: isDark ? '#F59E0B' : '#D97706',
      },
    };

    return baseColors;
  };

  const getCardClassName = (variant: 'default' | 'gradient' = 'default') => {
    const baseClass = 'rounded-xl transition-all duration-300 card-hover';
    
    if (variant === 'gradient') {
      return `bg-gradient-to-br from-[var(--theme-background-secondary)] to-[var(--theme-background-primary)] border border-[var(--theme-border-light)] ${baseClass}`;
    }
    return `bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] ${baseClass}`;
  };

  const getGradientTextClass = () => {
    return 'gradient-text';
  };

  const getPrimaryButtonClass = () => {
    return 'btn-primary btn-hover';
  };

  const getBadgeClass = (type: 'success' | 'warning' | 'error' | 'info') => {
    const isDark = currentMode === 'dark';
    const badgeClasses = {
      success: isDark 
        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
        : 'bg-green-100 text-green-700 border border-green-200',
      warning: isDark
        ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
        : 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      error: isDark
        ? 'bg-red-500/20 text-red-500 border border-red-500/30'
        : 'bg-red-100 text-red-700 border border-red-200',
      info: isDark
        ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30'
        : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary-dark)] border border-[var(--theme-primary)]/20',
    };
    return badgeClasses[type];
  };

  const getStatCardClass = () => {
    return 'bg-gradient-to-br from-[var(--theme-background-secondary)] to-[var(--theme-background-primary)] rounded-xl p-5 border border-[var(--theme-border-light)] transition-all duration-300 card-hover';
  };

  return {
    getChartColors,
    getCardClassName,
    getGradientTextClass,
    getPrimaryButtonClass,
    getBadgeClass,
    getStatCardClass,
  };
};

export const useCurrentRole = () => {
  const { currentRole } = useTheme();
  return currentRole;
};

export const useCurrentMode = () => {
  const { currentMode } = useTheme();
  return currentMode;
};