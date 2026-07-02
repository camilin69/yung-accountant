import React from 'react';

/**
 * SkeletonCard — Glass card placeholder with shimmer animation.
 * Mimics the glass-sm card shape. Use in card grids during data fetch.
 */
export const SkeletonCard: React.FC<{ className?: string; lines?: number }> = ({
  className = '',
  lines = 3,
}) => (
  <div className={`skeleton rounded-[1.5rem] p-6 ${className}`} aria-hidden="true">
    {/* Header bar */}
    <div className="h-5 w-2/3 rounded-lg mb-4" style={{ background: 'var(--theme-background-glass-hover)' }} />
    {/* Content lines */}
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-lg"
          style={{
            background: 'var(--theme-background-glass-hover)',
            width: `${85 - i * 12}%`,
          }}
        />
      ))}
    </div>
  </div>
);

/**
 * SkeletonTable — Table row placeholders with shimmer.
 * Use in list/table views during data fetch.
 */
export const SkeletonTable: React.FC<{ className?: string; rows?: number; cols?: number }> = ({
  className = '',
  rows = 5,
  cols = 4,
}) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    {/* Header */}
    <div className="flex gap-4 p-4">
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={`h-${i}`}
          className="h-4 rounded-lg flex-1"
          style={{ background: 'var(--theme-background-glass-hover)' }}
        />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={rowIdx} className="flex gap-4 p-4 skeleton rounded-xl">
        {Array.from({ length: cols }).map((_, colIdx) => (
          <div
            key={`${rowIdx}-${colIdx}`}
            className="h-3 rounded-lg flex-1"
            style={{ background: 'var(--theme-background-glass-hover)', opacity: 0.6 }}
          />
        ))}
      </div>
    ))}
  </div>
);

/**
 * SkeletonStat — Stat card placeholder with shimmer.
 * Mimics StatCard shape. Use in stat grids during data fetch.
 */
export const SkeletonStat: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`skeleton rounded-[1.5rem] p-5 flex flex-col items-center justify-center gap-3 ${className}`}
    aria-hidden="true"
    style={{ minHeight: '120px' }}
  >
    {/* Icon placeholder */}
    <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--theme-background-glass-hover)' }} />
    {/* Value placeholder */}
    <div className="h-6 w-20 rounded-lg" style={{ background: 'var(--theme-background-glass-hover)' }} />
    {/* Label placeholder */}
    <div className="h-3 w-16 rounded-lg" style={{ background: 'var(--theme-background-glass-hover)', opacity: 0.6 }} />
  </div>
);
