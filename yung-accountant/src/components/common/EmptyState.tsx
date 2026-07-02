import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  /** Lucide icon or ReactNode to display */
  icon?: React.ReactNode;
  /** Main heading */
  title: string;
  /** Supporting description */
  description: string;
  /** Optional CTA button label */
  actionLabel?: string;
  /** CTA button click handler */
  onAction?: () => void;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * EmptyState — Reusable empty state component for data pages.
 *
 * Renders a centered glass-aero card with an icon, title, description,
 * and an optional call-to-action button. Use when a page or section
 * has no data to display.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center py-16 px-4 ${className}`}>
      <div
        className="flex flex-col items-center text-center max-w-sm w-full p-8 rounded-[2rem] glass-aero animate-fade-in-up"
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center mb-5"
          style={{
            background: 'var(--theme-background-glass-hover)',
            color: 'var(--theme-primary)',
          }}
        >
          {icon || <PackageOpen className="w-8 h-8" />}
        </div>

        {/* Title */}
        <h3
          className="text-lg font-medium mb-2"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className="text-sm leading-relaxed mb-6"
          style={{ color: 'var(--theme-text-tertiary)' }}
        >
          {description}
        </p>

        {/* CTA */}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="glass-btn glass-btn-primary px-6 py-2.5"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
