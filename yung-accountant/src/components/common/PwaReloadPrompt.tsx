import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * PwaReloadPrompt — Shows a toast when a new version of the app is available.
 * Uses vite-plugin-pwa's virtual module to detect SW updates.
 * User clicks to refresh and activate the new version.
 */
const PwaReloadPrompt: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateServiceWorker, setUpdateServiceWorker] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    // vite-plugin-pwa injects registerSW into the service worker registration
    if ('serviceWorker' in navigator) {
      // Listen for SW updates via the vite-plugin-pwa mechanism
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'SKIP_WAITING') {
          // New SW is waiting — ask user to refresh
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      // Check for waiting service worker
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                setNeedRefresh(true);
                setUpdateServiceWorker(() => async () => {
                  // Send skipWaiting message
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                });
              }
            });
          }
        });
      });

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  if (!needRefresh) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] animate-slide-in-right"
      role="alert"
    >
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl glass-aero"
        style={{
          boxShadow: 'var(--shadow-glass-lg)',
        }}
      >
        <RefreshCw className="w-4 h-4" style={{ color: 'var(--semantic-info)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
          New version available
        </p>
        <button
          onClick={() => updateServiceWorker?.()}
          className="glass-btn-primary px-4 py-1.5 text-xs"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default PwaReloadPrompt;
