/**
 * Type declarations for Web APIs not yet in TypeScript's default DOM lib.
 *
 * - Background Sync API (SyncManager) — Chrome/Edge/Samsung
 *   https://developer.mozilla.org/en-US/docs/Web/API/SyncManager
 */

export {};

declare global {
  interface SyncManager {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  }

  // `sync` is Chrome-only — optional for Firefox/Safari compatibility
  interface ServiceWorkerRegistration {
    readonly sync?: SyncManager;
  }
}
