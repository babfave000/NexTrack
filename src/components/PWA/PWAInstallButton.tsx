/**
 * PWA Install Button Component
 * Shows install prompt when PWA is installable
 */

import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useState } from 'react';

export default function PWAInstallButton() {
  const { canInstall, installApp, isAppInstalled } = usePWAInstall();
  const [justInstalled, setJustInstalled] = useState(false);

  if (isAppInstalled || justInstalled || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    await installApp();
    setJustInstalled(true);
    setTimeout(() => setJustInstalled(false), 3000);
  };

  return (
    <button
      onClick={handleInstall}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
      title="Install NexTrack as an app on your device"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Install App
    </button>
  );
}
