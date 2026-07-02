// pages/Habits/HabitStats.tsx
import React from 'react';
import { Target, CheckCircle, Flame, TrendingUp } from 'lucide-react';

interface HabitStatsProps {
  activeHabitsCount: number;
  completedToday: number;
  totalCurrentStreak: number;
  totalBestStreak: number;
}

export const HabitStats: React.FC<HabitStatsProps> = ({
  activeHabitsCount,
  completedToday,
  totalCurrentStreak,
  totalBestStreak,
}) => {
  const stats = [
    {
      icon: <Target className="w-5 h-5" style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />,
      label: 'Active Habits',
      value: activeHabitsCount.toString(),
      color: '#3B82F6',
      delay: 0,
    },
    {
      icon: <CheckCircle className="w-5 h-5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />,
      label: 'Completed Today',
      value: completedToday.toString(),
      color: '#10B981',
      delay: 100,
    },
    {
      icon: <Flame className="w-5 h-5" style={{ color: '#F97316' }} strokeWidth={1.5} />,
      label: 'Total Streak',
      value: totalCurrentStreak.toString(),
      color: '#F97316',
      delay: 200,
    },
    {
      icon: <TrendingUp className="w-5 h-5" style={{ color: 'var(--semantic-warning)' }} strokeWidth={1.5} />,
      label: 'Best Streak',
      value: totalBestStreak.toString(),
      color: '#F59E0B',
      delay: 300,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      {stats.map((stat, i) => (
        <div 
          key={i}
          className="group rounded-[1.75rem] p-5 transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-1 cursor-default glass-sm"
          style={{ animationDelay: `${stat.delay}ms` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
              style={{ backgroundColor: `${stat.color}14`, boxShadow: `0 4px 12px -4px ${stat.color}15` }}
            >
              {stat.icon}
            </div>
            <span className="text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>
              {stat.label}
            </span>
          </div>
          <p className="text-[24px] font-light tracking-[-0.02em] transition-all duration-500 group-hover:scale-105 origin-left" style={{ color: 'var(--theme-text-primary)' }}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
};