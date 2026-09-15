import { useState, useEffect } from 'react';

export default function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handleSWUpdate = () => {
      setShowUpdate(true);
      requestAnimationFrame(() => setMounted(true));
    };

    window.addEventListener('sw-update-available', handleSWUpdate);

    return () => {
      window.removeEventListener('sw-update-available', handleSWUpdate);
    };
  }, []);

  if (!showUpdate) return null;

  const handleUpdate = () => {
    window.dispatchEvent(new CustomEvent('sw-user-skipped-waiting'));
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleLater = () => {
    setMounted(false);
    setTimeout(() => setShowUpdate(false), 320);
  };

  return (
    <div
      className={
        'pwa-update-root fixed bottom-6 right-6 z-50 max-w-sm transition-all duration-300 ease-out transform ' +
        (mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')
      }
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 pt-0.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Update available</h3>
            <p className="mt-1 text-sm text-gray-600">A new version of NexTrack is ready to use.</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleUpdate}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                Update now
              </button>
              <button
                onClick={handleLater}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
