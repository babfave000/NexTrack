# NexTrack - Smart Offline Accounting

NexTrack is an offline-first small business accounting and inventory management software. Built with React, TypeScript, and Vite, it works seamlessly online and offline, syncing data automatically when connection is restored.

## ✨ Features

### Core Functionality
- **📦 Inventory Management** - Track products, stock levels, brands, and suppliers
- **💰 Sales Orders** - Create, manage, and print sales orders and invoices
- **📥 Purchase Orders** - Manage supplier purchases and track spending
- **📊 Financial Reports** - View sales trends, inventory valuation, and business metrics
- **👤 Business Profile** - Configure company details, pricing, and preferences
- **⚙️ Settings** - Low-stock alerts, display preferences, and integrations

### PWA Capabilities
- **📱 Install as App** - Add to home screen on mobile and desktop
- **🔌 Offline Support** - Work without internet connection
- **🔄 Auto-Sync** - Sync data automatically when back online
- **⚡ Fast Loading** - Assets cached for instant app launch
- **🔔 Update Notifications** - Get notified when new versions are available

### Technical Highlights
- **Built with React 19** - Modern UI library with fast refresh
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Responsive, utility-first styling
- **Firebase Auth** - Secure user authentication
- **Dexie** - IndexedDB wrapper for offline storage
- **Service Workers** - Progressive Web App support

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd NexTrack

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder, ready for deployment.

### Linting

```bash
npm run lint
```

## 📋 Project Structure

```
NexTrack/
├── public/
│   ├── service-worker.js       # PWA service worker
│   ├── manifest.json            # PWA manifest
│   └── icons/                   # App icons (72-512px)
│
├── src/
│   ├── components/              # React components
│   │   ├── Auth/               # Authentication UI
│   │   ├── Inventory/          # Inventory management
│   │   ├── Orders/             # Order forms and lists
│   │   ├── Toast/              # Notifications
│   │   └── PWA/                # PWA UI components
│   │
│   ├── pages/                   # Full-page components
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── Inventory/           # Inventory pages
│   │   ├── Sales/              # Sales order pages
│   │   ├── Purchases/          # Purchase order pages
│   │   └── Admin/              # Admin panel
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts          # Authentication
│   │   ├── usePWAInstall.ts    # PWA installation
│   │   └── useSettings.ts      # Settings management
│   │
│   ├── db/                      # Database operations
│   │   ├── dexie.ts            # Dexie setup
│   │   └── operations/         # CRUD operations
│   │
│   ├── utils/                   # Utility functions
│   │   ├── serviceWorkerManager.ts # PWA utilities
│   │   └── validation.ts        # Form validation
│   │
│   ├── contexts/                # React contexts
│   │   ├── AuthContext.tsx      # Auth state
│   │   └── SettingsContext.tsx  # App settings
│   │
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # App entry point
│   └── index.css                # Global styles
│
├── index.html                   # HTML template
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # Tailwind config
└── package.json                # Dependencies
```

## 🔐 Authentication

NexTrack uses Firebase Authentication with email/password. Users can:
- Register a new account
- Reset forgotten passwords
- Maintain session across restarts
- Access data securely

## 💾 Data Storage

- **Online**: Firebase Realtime Database (when available)
- **Offline**: IndexedDB via Dexie (always available)
- **Sync**: Automatic bidirectional sync when reconnected

## 📱 PWA Installation

### Desktop (Chrome/Edge)
1. Open NexTrack
2. Click address bar icon or menu → "Install app"
3. App launches in standalone window

### Mobile (Android Chrome)
1. Open NexTrack in Chrome
2. Menu → "Install app"
3. Taps to home screen, launches full-screen

### iOS Safari
1. Open NexTrack in Safari
2. Share → "Add to Home Screen"
3. App adds to home screen with icon

See [PWA_SETUP.md](PWA_SETUP.md) for detailed PWA documentation.

## 🛠️ Development

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Hot Module Reload (HMR)

Changes are instantly reflected in the browser during development with Vite's HMR.

### TypeScript

All components use TypeScript for type safety. Run type checking:

```bash
npx tsc --noEmit
```

## 🐛 Testing

Run the app locally and test the following:

- [ ] Authentication flow (login, signup, reset password)
- [ ] Offline functionality (turn off network, verify app still works)
- [ ] Inventory CRUD operations
- [ ] Sales order creation and printing
- [ ] Purchase order management
- [ ] Dashboard metrics and reports
- [ ] PWA installation and updates
- [ ] Sync when reconnecting to network

## 📦 Dependencies

### Runtime
- **react**: UI library
- **react-router-dom**: Client-side routing
- **firebase**: Authentication and database
- **dexie**: IndexedDB abstraction
- **recharts**: Chart library for reports
- **tailwindcss**: CSS framework
- **date-fns**: Date utilities
- **html2canvas**: PDF export

### Dev
- **vite**: Build tool
- **typescript**: Type checking
- **eslint**: Code linting
- **autoprefixer**: CSS prefixing
- **postcss**: CSS processing

## 🚢 Deployment

### Netlify
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables in Netlify dashboard
5. Deploy!

### Vercel
1. Import project from GitHub
2. Framework: Vite
3. Build command: `npm run build`
4. Configure environment variables
5. Deploy!

### Self-Hosted
```bash
npm run build
# Copy dist/ folder to your web server
# Ensure HTTPS is enabled (required for service workers)
# Configure server to serve index.html for SPA routing
```

## 📚 Key Technologies

- **React 19**: Modern component library with fast refresh
- **TypeScript 5.8**: Type-safe JavaScript
- **Vite 7**: Next-gen bundler and dev server
- **Tailwind CSS 3.4**: Utility-first CSS framework
- **Firebase 12**: Backend-as-a-service
- **Dexie**: Lightweight IndexedDB wrapper

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Support

For issues, feature requests, or support:
- Open an issue on GitHub
- Contact: support@nextrack.ink
- Visit: https://nextrack.ink/help
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
"# NexTrack" 
