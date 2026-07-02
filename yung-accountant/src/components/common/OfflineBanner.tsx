import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * OfflineBanner — Thin compact indicator shown when offline.
 * Subtle — just a thin line + icon, not invasive.
 */
const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-1.5 py-1 animate-fade-in-down"
      style={{
        background: 'rgba(245, 158, 11, 0.10)',
        borderBottom: '2px solid rgba(245, 158, 11, 0.30)',
      }}
    >
      <WifiOff className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--semantic-warning)' }} />
      <span className="text-[10px] font-medium tracking-[0.03em]" style={{ color: 'var(--semantic-warning)', opacity: 0.8 }}>
        Offline — cached data
      </span>
    </div>
  );
};

export default OfflineBanner;
