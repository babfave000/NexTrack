// src/App.tsx
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory/InventoryPage';
import SalesPage from './pages/Sales/SalesPage';
import PurchasePage from './pages/Purchases/PurchasePage';
import UserProfilePage from './pages/Profile/UserProfilePage';
import SettingsPage from './pages/Settings/SettingsPage';
import Reports from './pages/Reports/Reports';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import UserMenu from './components/Auth/UserMenu';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import AdminPage from './pages/Admin/AdminPage';
import HelpSupportPage from './pages/Support/HelpSupportPage';
import ContactUsPage from './pages/Support/ContactUsPage';
import GuidelinePage from './pages/Support/GuidelinePage';
import CustomToastContainer from './components/Toast/ToastContainer';

// Main navigation links - only essential pages
const MAIN_NAV_LINKS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/inventory', label: 'Inventory' },
  { path: '/sales', label: 'Sales Orders' },
  { path: '/purchase', label: 'Purchase Orders' },
  { path: '/reports', label: 'Reports' },
];

// All available routes (for routing purposes)

// NavBar component that uses useAuth - must be inside AuthProvider
function NavBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <div className="app-nav-brand-row">
          <Link to="/dashboard" className="app-brand">
            <span className="app-brand-mark">N</span>
            <span>NexTrack</span>
          </Link>
          <div className="app-nav-links" aria-label="Main navigation">
            {MAIN_NAV_LINKS.map(({ path, label }) => {
              const isActive = pathname === path || pathname.startsWith(path + '/');
              return (
                <Link
                  key={path}
                  to={path}
                  className={`app-nav-link ${isActive ? 'is-active' : ''}`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}

// Header component for public pages (Welcome, Login)
function PublicHeader() {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-blue-600">
            NexTrack
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Home
                </Link>
                <Link
                  to="/login"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const location = useLocation(); // Get current location

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show PublicHeader on login page, not on welcome page */}
      {!user && location.pathname === '/login' && <PublicHeader />}
      {user && <NavBar />}
      <main className={user ? "max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" : ""}>
        <CustomToastContainer />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<WelcomePage />} />
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
          />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/inventory" element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          } />
          <Route path="/sales" element={
            <ProtectedRoute>
              <SalesPage />
            </ProtectedRoute>
          } />
          <Route path="/sales/history" element={
            <ProtectedRoute>
              <SalesPage initialTab="history" />
            </ProtectedRoute>
          } />
          <Route path="/sales/change-left" element={
            <ProtectedRoute>
              <SalesPage initialTab="changeLeft" />
            </ProtectedRoute>
          } />
          <Route path="/purchase" element={
            <ProtectedRoute>
              <PurchasePage />
            </ProtectedRoute>
          } />
          <Route path="/purchase/history" element={
            <ProtectedRoute>
              <PurchasePage initialTab="history" />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
          {/* Support Routes (Hidden from navbar) */}
          <Route path="/help" element={
            <ProtectedRoute>
              <HelpSupportPage />
            </ProtectedRoute>
          } />
          <Route path="/contact" element={
            <ProtectedRoute>
              <ContactUsPage />
            </ProtectedRoute>
          } />
          <Route path="/guideline" element={
            <ProtectedRoute>
              <GuidelinePage />
            </ProtectedRoute>
          } />
          
          {/* Redirect all unknown routes */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;