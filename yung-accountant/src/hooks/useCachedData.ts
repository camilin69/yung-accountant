import { useOnlineStatus } from './useOnlineStatus';

/**
 * useCachedData — detects when the user is viewing cached/offline data.
 * Use in pages to conditionally show a "showing cached data" indicator.
 */
export function useCachedData(): {
  isOnline: boolean;
  isShowingCached: boolean;
} {
  const isOnline = useOnlineStatus();

  return {
    isOnline,
    // If offline, any data shown is from cache
    isShowingCached: !isOnline,
  };
}
