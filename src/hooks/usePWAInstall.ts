/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * usePWAInstall - Hook to handle PWA install prompt
 * Listens for the beforeinstallprompt event and provides a way to trigger installation
 */

import { useEffect, useState } from 'react';

interface PWAInstallHookResult {
  canInstall: boolean;
  installApp: () => void;
  isAppInstalled: boolean;
}

export function usePWAInstall(): PWAInstallHookResult {
  const [canInstall, setCanInstall] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Stash the event for later use
      setInstallPrompt(e);
      setCanInstall(true);
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setCanInstall(false);
      setIsAppInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;

    // Show the install prompt
    (installPrompt as any).prompt();

    // Wait for user response
    const { outcome } = await (installPrompt as any).userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the prompt
    setInstallPrompt(null);
    setCanInstall(false);
  };

  return { canInstall, installApp, isAppInstalled };
}
