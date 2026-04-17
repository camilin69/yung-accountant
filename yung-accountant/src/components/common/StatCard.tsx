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
  primary: 'text-primary',
  success: 'text-green-500',
  danger: 'text-red-500',
  warning: 'text-yellow-500',
};

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color = 'primary' }) => {
  return (
    <div className="card text-center">
      <Icon className={`w-8 h-8 ${colorMap[color]} mx-auto mb-2`} />
      <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
    </div>
  );
};

export default StatCard;