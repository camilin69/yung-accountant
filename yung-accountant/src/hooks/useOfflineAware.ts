import { useState, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { OfflineError } from '../services/api/offline.types';

interface OfflineAwareState {
  /** Is the browser currently offline */
  isOffline: boolean;
  /** Should we show connection error / skeletons — true when offline + no cached data */
  showFallback: boolean;
  /** Call this when a fetch error occurs — it detects OfflineError */
  handleFetchError: (error: unknown) => void;
  /** Reset the fallback state (e.g., when retrying) */
  reset: () => void;
}

/**
 * useOfflineAware — hook for pages to handle offline/connectivity gracefully.
 *
 * Usage in a page:
 *   const { showFallback, handleFetchError, isOffline } = useOfflineAware();
 *   try {
 *     await fetchData();
 *   } catch (err) {
 *     handleFetchError(err);
 *   }
 *   if (showFallback) return <ConnectionError ... />;
 */
export function useOfflineAware(hasCachedData: boolean = false): OfflineAwareState {
  const isOffline = !useOnlineStatus();
  const [showFallback, setShowFallback] = useState(false);

  const handleFetchError = useCallback((error: unknown) => {
    if (error instanceof OfflineError) {
      // Only show fallback if we don't have cached data
      if (!hasCachedData) {
        setShowFallback(true);
      }
    }
    // For other errors, let the page handle them normally
  }, [hasCachedData]);

  const reset = useCallback(() => {
    setShowFallback(false);
  }, []);

  return {
    isOffline,
    showFallback,
    handleFetchError,
    reset,
  };
}
