// components/common/StatCard.tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  color?: 'primary' | 'success' | 'danger' | 'warning';
}

const colorMap = {
  primary: 'text-[var(--theme-primary)]',
  success: 'text-green-500',
  danger: 'text-red-500',
  warning: 'text-yellow-500',
};

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color = 'primary' }) => {
  return (
    <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-6 text-center transition-all duration-300 hover:border-[var(--theme-primary)]/30 hover:-translate-y-1">
      <Icon className={`w-8 h-8 ${colorMap[color]} mx-auto mb-2`} />
      <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="text-sm text-[var(--theme-text-tertiary)]">{title}</div>
    </div>
  );
};

export default StatCard;