/**
 * offlineHelper — utilities for offline-aware rendering and optimistic mutations.
 *
 * Pattern:
 *   if (shouldShowSkeletons(isOnline, dataArray)) { return <Skeletons />; }
 *   // render data normally
 */

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export function shouldSkipFetch(hasExistingData: boolean): boolean {
  if (!isOffline()) return false;
  if (hasExistingData) return true;
  return false;
}

/**
 * Should skeletons be shown? Only when:
 * - Offline AND
 * - No data in store AND
 * - Not currently loading (prevents flash during fetch)
 */
export function shouldShowSkeletons(online: boolean, dataLength: number, isLoading: boolean): boolean {
  if (online) return false;           // Online — never show skeletons
  if (isLoading) return false;        // Still loading — wait for result
  if (dataLength > 0) return false;   // Has data — render normally
  return true;                        // Offline + empty + done loading → skeletons
}

// ── Optimistic mutation helpers ──────────────────────────────────

/** Generates a temporary client-side ID for optimistic inserts. */
export function generateTempId(prefix: string = 'temp'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Returns true when `error` looks like a connectivity failure where
 *  the request was queued by the service worker for background sync.
 *
 *  Does NOT check navigator.onLine — the backend can be unreachable
 *  even when the browser has internet (server down, VPN drop, etc.).
 *  In all cases where ERR_NETWORK fires, the SW's BackgroundSyncPlugin
 *  will have queued the mutation. */
export function isOfflineMutationError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.name === 'OfflineError') return true;
    // ERR_NETWORK — fetch didn't reach the server. SW queued it.
    if ((error as any).code === 'ERR_NETWORK') return true;
  }
  return false;
}

/** Checks whether an ID is a client-generated temp ID (not yet synced).
 *  All server-issued IDs are UUIDs (8-4-4-4-12 hex), so any string that
 *  doesn't match the UUID pattern is an optimistic / temp ID. */
export function isOptimistic(id: string): boolean {
  // UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
