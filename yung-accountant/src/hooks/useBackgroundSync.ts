import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Background Sync state returned by useBackgroundSync.
 */
export interface BackgroundSyncState {
  /** True when mutations are queued and waiting for replay */
  isPending: boolean;
  /** True when a sync replay is actively in progress */
  isReplaying: boolean;
  /** Timestamp of the last successful sync, or null */
  lastSync: Date | null;
  /** Manually trigger a sync check (useful after coming online) */
  checkSync: () => Promise<void>;
}

const SYNC_TAG = 'workbox-background-sync:api-mutations';
const POLL_INTERVAL_MS = 2000;
/** If replaying hasn't resolved after this many ms, force-reset (stale tag guard). */
const REPLAY_TIMEOUT_MS = 20_000;

/**
 * useBackgroundSync — monitors the workbox-background-sync queue.
 *
 * Uses the Background Sync API (syncManager.getTags) to detect pending
 * mutations, and listens for SYNC_COMPLETED messages from the SW.
 *
 * Includes a 20s timeout — if a stale sync tag persists (e.g. from a
 * previous session or failed cleanup), we reset the indicator rather
 * than showing "Syncing changes…" forever.
 *
 * Dispatches a 'bg-sync:completed' custom event on `window` when sync
 * finishes — stores and pages can listen for this to refresh stale data.
 */
export function useBackgroundSync(): BackgroundSyncState {
  const isOnline = useOnlineStatus();
  const [isPending, setIsPending] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const replaySinceRef = useRef<number | null>(null);
  const replayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevent sending duplicate REPLAY_QUEUE messages while one is in flight
  const replayMessageSentRef = useRef(false);
  // Tracks whether stores have reported offline mutations via bg-sync:pending
  const hasPendingMutationsRef = useRef(false);
  // Prevent duplicate bg-sync:completed dispatches within the same sync cycle
  const completedDispatchedRef = useRef(false);

  /**
   * Ask the SW to replay any queued mutations. Uses postMessage which
   * works instantly — unlike Chrome's Background Sync API which is gated
   * behind user-engagement heuristics and can delay hours.
   */
  const triggerReplay = useCallback(async () => {
    if (replayMessageSentRef.current) {
      return;
    }
    replayMessageSentRef.current = true;
    try {
      const reg = await navigator.serviceWorker?.ready;
      const sw = reg?.active || reg?.waiting || reg?.installing;
      if (sw) {
        sw.postMessage({ type: 'REPLAY_QUEUE' });
      } else {
        replayMessageSentRef.current = false;
      }
    } catch (err) {
      replayMessageSentRef.current = false;
    }
  }, []);

  /**
   * Force-reset the replay state. Called when the timeout fires — if Chrome
   * hasn't fired the sync event within REPLAY_TIMEOUT_MS, we take matters
   * into our own hands by telling the SW to replay via postMessage.
   */
  const forceResetReplay = useCallback(async () => {
    setIsReplaying(false);
    setIsPending(false);
    hasPendingMutationsRef.current = false;
    replayMessageSentRef.current = false;
    replaySinceRef.current = null;
    if (replayTimeoutRef.current) {
      clearTimeout(replayTimeoutRef.current);
      replayTimeoutRef.current = null;
    }
    await triggerReplay();
  }, [triggerReplay]);

  const checkSync = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      // Background Sync API is Chrome/Edge/Samsung only — feature-detect
      if (!reg.sync) {
        // Firefox/Safari: no sync API — the SW still queues with workbox
        // but we can't poll for pending tags.
        return;
      }
      const tags = await reg.sync.getTags();
      const hasPending = tags.some(t => t.startsWith(SYNC_TAG));
      setIsPending(hasPending);
      if (hasPending) {
        triggerReplay();
      }
      // If we were replaying and now there's nothing pending, sync finished
      if (!hasPending) {
        replayMessageSentRef.current = false;
        hasPendingMutationsRef.current = false;
      }
      if (!hasPending && isReplaying) {
        if (completedDispatchedRef.current) {
          // Already dispatched via SW message — just clean up state
          setIsReplaying(false);
          return;
        }
        completedDispatchedRef.current = true;
        setIsReplaying(false);
        replaySinceRef.current = null;
        if (replayTimeoutRef.current) {
          clearTimeout(replayTimeoutRef.current);
          replayTimeoutRef.current = null;
        }
        const now = new Date();
        setLastSync(now);
        window.dispatchEvent(
          new CustomEvent('bg-sync:completed', { detail: { timestamp: now } }),
        );
      }
    } catch {
      // SyncManager may throw if not supported — ignore
    }
  }, [isReplaying, triggerReplay]);

  // Set up SW message listener for SYNC_COMPLETED from the SW's onSync broadcast
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETED') {
        if (completedDispatchedRef.current) return; // Already handled
        completedDispatchedRef.current = true;
        const now = new Date();
        setIsPending(false);
        setIsReplaying(false);
        hasPendingMutationsRef.current = false;
        replayMessageSentRef.current = false;
        setLastSync(now);
        window.dispatchEvent(
          new CustomEvent('bg-sync:completed', { detail: { timestamp: now } }),
        );
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Poll for pending sync when online; go pending when offline
  useEffect(() => {
    if (isOnline) {
      // Check immediately on coming online
      checkSync();
      // Also trigger replay if stores reported offline mutations
      // while we were offline — don't rely solely on getTags().
      if (hasPendingMutationsRef.current) {
        triggerReplay();
      }
      // Keep polling while pending items exist
      pollRef.current = setInterval(() => {
        checkSync();
      }, POLL_INTERVAL_MS);
    } else {
      // Offline → assume any queued mutations are pending
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      // If we were replaying, we're now just pending
      if (isReplaying) setIsReplaying(false);
      // Reset guards for the next offline→online cycle
      replayMessageSentRef.current = false;
      completedDispatchedRef.current = false;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isOnline, checkSync, isReplaying]);

  // When pending items are detected, mark as replaying and arm the safety timeout
  useEffect(() => {
    if (isPending && isOnline && !isReplaying) {
      setIsReplaying(true);
      replaySinceRef.current = Date.now();
      // Safety timeout: if replaying doesn't resolve within REPLAY_TIMEOUT_MS,
      // force-reset (stale sync tag from a previous session or failed cleanup).
      replayTimeoutRef.current = setTimeout(() => {
        forceResetReplay();
      }, REPLAY_TIMEOUT_MS);
    }
  }, [isPending, isOnline, isReplaying, forceResetReplay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (replayTimeoutRef.current) {
        clearTimeout(replayTimeoutRef.current);
      }
    };
  }, []);

  // Listen for bg-sync:pending dispatched by stores on optimistic adds.
  // If online, trigger replay immediately — don't wait for the poll.
  useEffect(() => {
    const handlePending = () => {
      hasPendingMutationsRef.current = true;
      setIsPending(true);
      if (isOnline) {
        triggerReplay();
      } else {
        setIsReplaying(false);
      }
    };
    window.addEventListener('bg-sync:pending', handlePending);
    return () => window.removeEventListener('bg-sync:pending', handlePending);
  }, [isOnline, triggerReplay]);

  return { isPending, isReplaying, lastSync, checkSync };
}
