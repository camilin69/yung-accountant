import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * CachedBadge — subtle indicator shown on pages when displaying cached/offline data.
 * Only appears when the browser is offline.
 */
const CachedBadge: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium animate-fade-in"
      style={{
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        color: 'var(--semantic-warning)',
      }}
      role="status"
      aria-label="Showing cached data"
    >
      <WifiOff className="w-3 h-3" />
      Cached
    </div>
  );
};

export default CachedBadge;
