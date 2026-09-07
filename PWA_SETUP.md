# NexTrack PWA (Progressive Web App) Setup

This document describes the PWA features implemented for NexTrack, enabling it to work offline and be installed as a native-like app.

## Features Implemented

### 1. Service Worker (`public/service-worker.js`)
A comprehensive service worker that handles caching and offline support:
- **Cache-first strategy** for static assets (JS, CSS, images, fonts)
- **Network-first strategy** for API calls and HTML pages
- **Automatic cache cleanup** on activation
- **Smart fallback** responses when offline
- Caches on install: essential HTML, manifest, and icon files

### 2. PWA Manifest (`public/manifest.json`)
Already configured with:
- App name and short name
- App description and icons (72px, 96px, 128px, 144px, 192px, 256px)
- Display mode set to "standalone" (full-screen app experience)
- Theme and background colors
- Orientation settings
- App start URL

### 3. HTML Meta Tags (`index.html`)
Already includes:
- Manifest link and viewport configuration
- Apple mobile web app capabilities
- Theme color settings
- Open Graph metadata for sharing
- PWA-specific meta tags

### 4. Service Worker Registration (`src/utils/serviceWorkerManager.ts`)
Utility functions for managing the service worker:
- `registerServiceWorker()` - Registers and monitors SW
- `unregisterServiceWorker()` - Cleans up registration
- `isStandaloneMode()` - Detects if running as installed app
- `checkForUpdates()` - Checks for available updates
- Automatic update checking every 60 seconds
- User notification when updates are available

### 5. PWA Install Hook (`src/hooks/usePWAInstall.ts`)
React hook that handles PWA installation:
```typescript
const { canInstall, installApp, isAppInstalled } = usePWAInstall();
```
- Listens for `beforeinstallprompt` event
- Detects if app is already installed
- Triggers install prompt on demand
- Returns installation state

### 6. UI Components

#### PWAInstallButton (`src/components/PWA/PWAInstallButton.tsx`)
Button that appears in the user menu when PWA can be installed. Users can click to add NexTrack to their home screen/app drawer.

#### PWAUpdateNotification (`src/components/PWA/PWAUpdateNotification.tsx`)
Toast notification that appears when a new version is available. Users can update immediately or postpone.

## How It Works

### Installation Flow
1. User opens NexTrack in a browser (Chrome, Edge, Safari, etc.)
2. When PWA criteria are met, browser shows install prompt
3. User clicks "Install App" in the user menu
4. App is installed to home screen / app drawer
5. App runs in standalone mode (like native app)

### Offline Functionality
1. Service worker caches all static assets on first visit
2. Static assets served from cache (cache-first)
3. API calls try network first, fallback to cache
4. User can continue using the app with limited functionality when offline
5. Data syncs automatically when connection is restored

### Update Handling
1. Service worker checks for updates every 60 seconds
2. When new version is available, notification appears
3. User can choose to update immediately or later
4. Update takes effect on next app reload

## Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Full support | Full PWA features |
| Edge | ✅ Full support | Full PWA features |
| Safari | ✅ Partial | Basic PWA, limited install on iOS |
| Firefox | ✅ Partial | Basic PWA features |
| Opera | ✅ Full support | Full PWA features |

## Testing the PWA

### Desktop (Chrome/Edge)
1. Open app in browser DevTools
2. Go to "Application" tab → "Manifest"
3. Verify manifest loads correctly
4. Go to "Service Workers" to see registration
5. Simulate offline mode and refresh
6. App should still work with cached content

### Mobile (Android Chrome)
1. Open app on mobile Chrome
2. Three-dot menu → "Install app"
3. App opens in full-screen mode
4. Test offline functionality by turning off network

### iOS Safari
1. Open app in Safari
2. Share button → "Add to Home Screen"
3. App adds to home screen with icon
4. Limited offline support (basic caching only)

## Development Notes

### Service Worker Updates
To clear all caches during development, send message from DevTools:
```javascript
navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' });
```

### Modifying Cache Strategy
Edit `public/service-worker.js`:
- Change `ASSETS_TO_CACHE` to cache different files on install
- Modify `isStaticAsset()` function to change what's considered static
- Adjust cache strategy functions for different behaviors

### Force Update
Users can force app update by manually clearing app cache or reinstalling.

## File Structure
```
NexTrack/
├── public/
│   ├── service-worker.js          # Service worker logic
│   ├── manifest.json              # PWA manifest (already existed)
│   └── icons/                     # App icons
├── src/
│   ├── components/PWA/
│   │   ├── PWAInstallButton.tsx    # Install button component
│   │   └── PWAUpdateNotification.tsx # Update notification
│   ├── hooks/
│   │   └── usePWAInstall.ts        # PWA install hook
│   ├── utils/
│   │   └── serviceWorkerManager.ts # Service worker utilities
│   ├── App.tsx                     # Updated with update notification
│   └── main.tsx                    # Service worker registration
└── index.html                      # PWA meta tags (already existed)
```

## Security Considerations

1. **HTTPS Only** - Service workers only work on HTTPS (or localhost)
2. **Scope Limitation** - Service worker is scoped to `/` path
3. **Cache Expiration** - Old caches are cleaned on activation
4. **Content Security** - Only same-origin requests are cached

## Future Enhancements

- [ ] Background sync for offline data submission
- [ ] Push notifications for order updates
- [ ] Periodic background fetch for new orders
- [ ] Native app sharing integration
- [ ] Biometric authentication
- [ ] App-specific storage management
- [ ] Web share target API integration
