// utils/formatters.ts

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (date: string, format: 'short' | 'long' | 'relative' = 'short'): string => {
  const d = new Date(date);
  
  if (format === 'short') {
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  }
  if (format === 'long') {
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (format === 'relative') {
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return formatDate(date, 'short');
  }
  
  return d.toISOString().split('T')[0];
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    'Food': '🍔',
    'Transport': '🚗',
    'Weed': '🌿',
    'Entertainment': '🎮',
    'Shopping': '🛍️',
    'Health': '💪',
    'Education': '📚',
    'Savings': '💰',
    'Rent': '🏠',
    'Utilities': '⚡',
    'Income': '💵',
    'Other': '📝'
  };
  return icons[category] || '📝';
};

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Food': 'text-orange-400',
    'Transport': 'text-blue-400',
    'Weed': 'text-green-400',
    'Entertainment': 'text-purple-400',
    'Shopping': 'text-pink-400',
    'Health': 'text-red-400',
    'Education': 'text-yellow-400',
    'Savings': 'text-emerald-400',
    'Income': 'text-green-500'
  };
  return colors[category] || 'text-gray-400';
};