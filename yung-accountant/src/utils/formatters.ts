// utils/formatters.ts

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatNumberWithDots = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('es-CO');
};

export const parseDottedNumber = (value: string): number => {
  return parseFloat(value.replace(/\./g, '')) || 0;
};

// Función para formatear fecha SIN offset de zona horaria
export const formatDate = (date: string | undefined | null, format: 'short' | 'long' | 'relative' = 'short'): string => {
  if (!date) return '';

  try {
    // Always try the YYYY-MM-DD regex first — it parses as a LOCAL date
    // and avoids the timezone shift caused by new Date("YYYY-MM-DD")
    // which the ECMAScript spec treats as UTC midnight.
    const pgMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (pgMatch) {
      const [_, year, month, day] = pgMatch;
      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (format === 'short') {
        return localDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      }
      if (format === 'long') {
        return localDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      if (format === 'relative') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diff = Math.floor((today.getTime() - localDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        if (diff < 7) return `${diff} days ago`;
        if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
        return localDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      }
      return `${day}/${month}/${year}`;
    }

    // Fallback for non-standard date formats (timestamps, etc.)
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    if (format === 'short') {
      return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    }
    if (format === 'long') {
      return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (format === 'relative') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dateObj = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diff = Math.floor((today.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      if (diff < 7) return `${diff} days ago`;
      if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
      return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    }
    return d.toLocaleDateString('es-CO');
  } catch {
    return '';
  }
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

export const formatInputNumber = (input: string): string => {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return num.toLocaleString('es-CO');
};

// ── Timezone-aware date utilities ──────────────────────────────────
// new Date().toISOString() returns UTC — in negative timezones (e.g.
// Colombia UTC-5), 10 PM June 30 becomes 3 AM July 1 UTC, shifting
// date-only YYYY-MM-DD strings by a full day.
//
// These helpers always use LOCAL date components so "today" means the
// user's actual calendar date, never a UTC-shifted tomorrow/yesterday.

/** Returns today's date as YYYY-MM-DD in the LOCAL timezone. */
export const getLocalDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** Converts a Date to YYYY-MM-DD in the LOCAL timezone. */
export const toLocalDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** Returns current datetime as ISO 8601 with LOCAL timezone offset
 *  (e.g. "2026-06-30T22:00:00-05:00" for Colombia at 10 PM).
 *  The backend can parse this correctly because the offset is explicit. */
export const getLocalISOString = (): string => {
  const now = new Date();
  const tzOffset = -now.getTimezoneOffset();
  const sign = tzOffset >= 0 ? '+' : '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${sign}${pad(Math.floor(Math.abs(tzOffset) / 60))}:${pad(Math.abs(tzOffset) % 60)}`;
};

/** @deprecated Use getLocalISOString() for timestamps or getLocalDateString() for dates. */
export const getCurrentDateTime = (): string => {
  return getLocalISOString();
};

export const isValidDate = (date: string): boolean => {
  const [year, month, day] = date.split('-');
  const selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate >= today;
};

export const formatDateTime = (dateString: string): string => {
  const [year, month, day] = dateString.split('T')[0].split('-');
  const timePart = dateString.split('T')[1]?.split('.')[0] || '00:00:00';
  const [hours, minutes] = timePart.split(':');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
  const dateStr = date.toLocaleDateString('es-CO', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  const timeStr = date.toLocaleTimeString('es-CO', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  return `${dateStr} ${timeStr}`;
};