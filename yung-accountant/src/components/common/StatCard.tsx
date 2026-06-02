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
  primary: '#3B82F6', success: '#10B981', danger: '#EF4444', warning: '#F59E0B',
};

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color = 'primary' }) => {
  const c = colorMap[color];
  return (
    <div className="group rounded-[2rem] p-6 text-center transition-all duration-700 ease-out hover:-translate-y-2 cursor-default glass-aero">
      <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center mx-auto mb-3 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
        style={{ backgroundColor: `${c}14`, boxShadow: `0 4px 16px -4px ${c}20` }}>
        <Icon className="w-6 h-6" style={{ color: c }} />
      </div>
      <div className="text-[26px] font-light tracking-[-0.02em] transition-all duration-500 group-hover:scale-105" style={{ color: 'var(--theme-text-primary)' }}>{value}</div>
      <div className="text-[12px] font-medium tracking-[0.04em] uppercase mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>{title}</div>
    </div>
  );
};

export default StatCard;