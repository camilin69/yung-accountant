// pages/Simulation/constants.tsx

import { Calendar as CalendarIcon } from 'lucide-react';
import type { SelectOption } from '../../components/common/CustomSelect';

export const periodOptions: SelectOption[] = [
  { id: 'day', label: 'Daily', icon: <CalendarIcon className="w-4 h-4 text-blue-400" /> },
  { id: 'week', label: 'Weekly', icon: <CalendarIcon className="w-4 h-4 text-yellow-400" /> },
  { id: 'month', label: 'Monthly', icon: <CalendarIcon className="w-4 h-4 text-purple-400" /> },
];

export const periodIcons: Record<string, React.ReactNode> = {
  day: <CalendarIcon className="w-3 h-3 text-blue-400" />,
  week: <CalendarIcon className="w-3 h-3 text-yellow-400" />,
  month: <CalendarIcon className="w-3 h-3 text-purple-400" />,
};

export const SORT_BY_OPTIONS = [
  { value: 'createdAt', label: 'Created' },
  { value: 'amount', label: 'Amount' },
  { value: 'period', label: 'Period' },
  { value: 'category', label: 'Category' },
  { value: 'startDate', label: 'Start Date' },
  { value: 'duration', label: 'Duration' },
  { value: 'total', label: 'Total' },
] as const;

export type SortBy = typeof SORT_BY_OPTIONS[number]['value'];