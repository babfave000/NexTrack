/**
 * Service Worker Manager
 * Handles registration, updates, and lifecycle management
 */

let userInitiatedSkipWaiting = false;

if (typeof window !== 'undefined') {
  window.addEventListener('sw-user-skipped-waiting', () => {
    userInitiatedSkipWaiting = true;
  });
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('Service Worker registered:', registration);

    // Check for SW updates: hourly passive interval + eager on each tab focus / visibility
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const intervalId = setInterval(() => {
      registration.update().catch((err) => console.warn('SW interval update check failed', err));
    }, ONE_HOUR_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch((err) => console.warn('SW focus update check failed', err));
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });

    // Handle controller change (SW updated): only auto-reload when user explicitly requested the swap
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      if (userInitiatedSkipWaiting) {
        console.log('[SW] controllerchange after explicit user SKIP_WAITING; reloading to activate new SW.');
        window.location.reload();
        return;
      }
      console.log('[SW] controllerchange without user-initiated SKIP_WAITING; skipping auto-reload to preserve form state.');
    });

    // Handle new SW waiting -> user prompt
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          const event = new CustomEvent('sw-update-available', {
            detail: { registration },
          });
          window.dispatchEvent(event);
        }
      });
    });

    // Cleanup listeners on page unload (best-effort)
    window.addEventListener('pagehide', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      try { clearInterval(intervalId); } catch (_) { /* noop */ }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }, { once: true });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
}

export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const success = await registration.unregister();
      if (success) {
        console.log('Service Worker unregistered');
      }
    }
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
  }
}

/**
 * Check if app is running in standalone mode (installed as PWA)
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Get service worker update status
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.update();
    }
    return true;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return false;
  }
}
