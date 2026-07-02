// Capture beforeinstallprompt early — before any React component mounts
// Settings page reads from this module

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type Listener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

// Listen immediately (module load time — before React mounts)
window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  console.log('[PWA] beforeinstallprompt captured! Install button should appear.');
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  console.log('[PWA] App installed successfully!');
  notify();
});

console.log('[PWA] Service initialized, listening for install prompt...');

export const pwaService = {
  /** Get the deferred install prompt (null if not available) */
  getPrompt(): BeforeInstallPromptEvent | null {
    return deferredPrompt;
  },

  /** Check if already installed */
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches;
  },

  /** Trigger the install prompt. Returns true if accepted. */
  async install(): Promise<boolean> {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return outcome === 'accepted';
  },

  /** Subscribe to prompt availability changes */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
