/**
 * OfflineError — thrown when an API call fails while offline with no cached data.
 * Components can catch this and show skeleton loading states instead of errors.
 */
export class OfflineError extends Error {
  /** true when the response came from cache */
  public readonly fromCache: boolean;

  constructor(message: string, fromCache: boolean = false) {
    super(message);
    this.name = 'OfflineError';
    this.fromCache = fromCache;
  }
}

/**
 * OfflineResponse — the structured JSON returned by the SW when offline with no cache.
 */
export interface OfflineResponse {
  offline: true;
  cached: false;
  message: string;
}
