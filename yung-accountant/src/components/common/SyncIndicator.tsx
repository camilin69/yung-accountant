import React, { useEffect, useState } from 'react';
import { CloudUpload, CheckCircle2, Loader2 } from 'lucide-react';
import { useBackgroundSync } from '../../hooks/useBackgroundSync';

/**
 * SyncIndicator — subtle bar shown when mutations are queued for background sync.
 *
 * States:
 *  - Pending: "X changes waiting to sync"
 *  - Replaying: "Syncing..." with spinner
 *  - Complete: brief green checkmark, then disappears
 *
 * Only renders when there's something to communicate.
 */
const SyncIndicator: React.FC = () => {
  const { isPending, isReplaying, lastSync } = useBackgroundSync();
  const [showComplete, setShowComplete] = useState(false);

  // Flash a "synced" checkmark briefly when sync finishes
  useEffect(() => {
    if (lastSync) {
      setShowComplete(true);
      const timeout = setTimeout(() => setShowComplete(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [lastSync]);

  if (!isPending && !isReplaying && !showComplete) return null;

  // Completed state
  if (showComplete) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-1.5 py-1 animate-fade-in-down"
        style={{
          background: 'rgba(34, 197, 94, 0.10)',
          borderBottom: '2px solid rgba(34, 197, 94, 0.30)',
        }}
      >
        <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--semantic-income)' }} />
        <span
          className="text-[10px] font-medium tracking-[0.03em]"
          style={{ color: 'var(--semantic-income)', opacity: 0.9 }}
        >
          Changes synced
        </span>
      </div>
    );
  }

  // Pending / replaying state
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-1.5 py-1 animate-fade-in-down"
      style={{
        background: 'rgba(245, 158, 11, 0.10)',
        borderBottom: '2px solid rgba(245, 158, 11, 0.30)',
      }}
    >
      {isReplaying ? (
        <Loader2
          className="w-3 h-3 flex-shrink-0 animate-spin"
          style={{ color: 'var(--semantic-info)' }}
        />
      ) : (
        <CloudUpload
          className="w-3 h-3 flex-shrink-0"
          style={{ color: 'var(--semantic-warning)' }}
        />
      )}
      <span
        className="text-[10px] font-medium tracking-[0.03em]"
        style={{ color: 'var(--semantic-warning)', opacity: 0.8 }}
      >
        {isReplaying ? 'Syncing changes…' : 'Changes pending sync'}
      </span>
    </div>
  );
};

export default SyncIndicator;
