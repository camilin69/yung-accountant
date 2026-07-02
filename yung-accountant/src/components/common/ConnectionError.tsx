import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface ConnectionErrorProps {
  /** Custom message override */
  message?: string;
  /** Show a retry button */
  onRetry?: () => void;
  /** Whether to show skeletons behind the message */
  showSkeletons?: boolean;
  /** Skeleton component to show as background */
  skeleton?: React.ReactNode;
}

/**
 * ConnectionError — shown when data can't load due to network issues.
 * Friendly message + optional retry button + optional skeleton background.
 * Keeps the page alive — never dead.
 */
const ConnectionError: React.FC<ConnectionErrorProps> = ({
  message,
  onRetry,
  showSkeletons = false,
  skeleton,
}) => {
  const { t } = useTranslation();
  return (
    <div className="relative">
      {/* Skeleton background (blurred, shows structure) */}
      {showSkeletons && skeleton && (
        <div className="opacity-30 pointer-events-none select-none">
          {skeleton}
        </div>
      )}

      {/* Overlay message */}
      <div className={`flex flex-col items-center justify-center py-16 px-4 ${showSkeletons ? 'absolute inset-0' : ''}`}>
        <div
          className="flex flex-col items-center text-center max-w-sm w-full p-8 rounded-[2rem] glass-aero animate-scale-in"
          style={{ zIndex: 1 }}
        >
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center mb-5"
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <WifiOff className="w-8 h-8" style={{ color: 'var(--semantic-warning)' }} />
          </div>

          {/* Title */}
          <h3
            className="text-lg font-medium mb-2"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {t('offline.title')}
          </h3>

          {/* Message */}
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: 'var(--theme-text-tertiary)' }}
          >
            {message || t('offline.message')}
          </p>

          {/* Retry button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'var(--theme-background-glass-hover)',
                border: '1px solid var(--theme-border-medium)',
                color: 'var(--theme-text-primary)',
              }}
            >
              <RefreshCw className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              {t('offline.retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionError;
