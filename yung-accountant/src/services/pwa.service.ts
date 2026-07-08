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
    return window.matchMedia('(display-mode: standalone)').matches ||
           (navigator as any).standalone === true;
  },

  /** Check if on iOS (Safari doesn't support beforeinstallprompt) */
  isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const vendor = (navigator as any).vendor || '';
    // iPhone / iPod touch — always in user agent
    if (/iPhone|iPod/.test(ua)) return true;
    // iPad (old iPadOS)
    if (/iPad/.test(ua)) return true;
    // Modern iPad (iPadOS 13+) — spoofs as Mac but has touch + Apple vendor
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1 && /Apple/.test(vendor)) return true;
    // Standalone check
    if ((navigator as any).standalone) return true;
    // CSS.supports check — Safari on iOS is the only browser without beforeinstallprompt
    // that has touch support and uses -webkit- prefix heavily
    if (navigator.maxTouchPoints > 0 && /Safari/.test(ua) && !/Chrome|CriOS/.test(ua)) return true;
    return false;
  },

  /** Returns true for ANY platform that can't use beforeinstallprompt */
  needsManualInstall(): boolean {
    return this.isIOS() || !this.getPrompt();
  },

  /** Check if on a browser that supports beforeinstallprompt */
  supportsInstallPrompt(): boolean {
    return !this.isIOS();
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
