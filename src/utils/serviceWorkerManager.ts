/**
 * Service Worker Manager
 * Handles registration, updates, and lifecycle management
 */

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

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute

    // Handle controller change (SW updated)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Handle new SW waiting
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available, notify user
          const event = new CustomEvent('sw-update-available', {
            detail: { registration },
          });
          window.dispatchEvent(event);
        }
      });
    });

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
