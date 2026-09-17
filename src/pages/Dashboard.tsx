// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { useUserData } from '../hooks/useUserData';
import { getSalesStats, getPurchaseStats, getInventoryValuation, getLowStockProducts } from '../db/operations';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { usePWAInstall } from '../hooks/usePWAInstall';

// Import types from your database or define matching interfaces
import type { SalesOrder as DbSalesOrder, PurchaseOrder as DbPurchaseOrder } from '../db/dexie';

// Define interfaces that match your database types
interface SalesStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue?: number;
  orders: DbSalesOrder[];
}

interface PurchaseStats {
  totalSpent: number;
  totalOrders: number;
  averageOrderValue?: number;
  orders: DbPurchaseOrder[];
}

interface InventoryStats {
  totalRetailValue: number;
}

// Use database types directly or create compatible interfaces
type SalesOrder = DbSalesOrder;
type PurchaseOrder = DbPurchaseOrder;

export default function Dashboard() {
  const { products } = useUserData();
  const { user, isLoading: authLoading } = useAuth();
  const { settings, businessInfo, refreshBusinessInfo } = useSettings();
  const { canInstall, installApp } = usePWAInstall();
  const [installBannerDismissed, setInstallBannerDismissed] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('nextrack-install-dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats | null>(null);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);
        
        const [salesData, purchaseData, inventoryData, lowStock] = await Promise.all([
          getSalesStats(user.id!, timeRange),
          getPurchaseStats(user.id!, timeRange),
          getInventoryValuation(user.id!),
          getLowStockProducts(user.id!, settings.lowStockThreshold)
        ]);

        setSalesStats(salesData as SalesStats);
        setPurchaseStats(purchaseData as PurchaseStats);
        setInventoryStats(inventoryData);
        setLowStockProducts(lowStock);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user, timeRange, settings.lowStockThreshold]);

  useEffect(() => {
    const reloadBusinessInfo = () => { void refreshBusinessInfo(); };
    window.addEventListener('nextrack:profile-saved', reloadBusinessInfo);
    window.addEventListener('nextrack:profile-synced', reloadBusinessInfo);
    return () => {
      window.removeEventListener('nextrack:profile-saved', reloadBusinessInfo);
      window.removeEventListener('nextrack:profile-synced', reloadBusinessInfo);
    };
  }, [refreshBusinessInfo]);

  const formatCurrency = (amount: number) =>
    `₦${amount?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}`;

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
    });

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded-xl"></div>
            <div className="h-80 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const recentSales = salesStats?.orders?.slice(0, 5) || [];
  const recentPurchases = purchaseStats?.orders?.slice(0, 5) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-red-800">Error Loading Data</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="text-red-700 hover:text-red-900 text-sm font-medium underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Header with Time Filter */}
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-kicker">{businessInfo?.businessName?.trim() || 'Business overview'}</p>
          <h1 className="dashboard-title">Good to see you, {businessInfo?.businessName?.split(' ')[0] || 'there'}</h1>
          <p className="dashboard-subtitle">
            Here is what is moving across
            {businessInfo?.businessName?.trim() ? (
              <> <strong className="font-semibold text-gray-800">{businessInfo.businessName.trim()}</strong> </>
            ) : (
              <> your business </>
            )}
            today.
          </p>
        </div>
        <div className="dashboard-heading-actions flex-wrap">
          <Link to="/guideline" className="dashboard-guide-link">Open guide <span aria-hidden="true">↗</span></Link>
          <label className="dashboard-range">
            <span>Showing</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month' | 'all')}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={isLoading}
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          </label>
        </div>
      </div>

      {canInstall && !installBannerDismissed && (
        <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-600/20 p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-12 -left-6 w-48 h-48 bg-white/5 rounded-full"></div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white text-2xl">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m0 0l-3-3m3 3l3-3M9 3h6a3 3 0 013 3v3M9 3H6a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3V9a3 3 0 00-3-3h-3M9 3a3 3 0 003 3h0a3 3 0 003-3" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-bold text-base sm:text-lg leading-tight">
                  Install NexTrack
                </h3>
                <p className="text-blue-100 text-sm mt-1 leading-relaxed">
                  Add to your home screen for one-tap access, offline support, and a fullscreen native experience.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 sm:flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('nextrack-install-dismissed', '1');
                  } catch { /* noop */ }
                  setInstallBannerDismissed(true);
                }}
                className="min-h-[44px] px-4 rounded-xl text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-sm font-medium"
                aria-label="Dismiss install banner"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('nextrack-install-dismissed', '1');
                  } catch { /* noop */ }
                  setInstallBannerDismissed(true);
                  void installApp();
                }}
                className="min-h-[44px] px-4 sm:px-5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 shadow-md shadow-black/10 transition-colors text-sm font-semibold whitespace-nowrap"
              >
                Install app
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid - Fixed StatCard props */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard 
          title="Total Products" 
          value={products?.length || 0} 
          color="stat-card stat-card-teal"
        />
        <StatCard
          title="Stock Value"
          value={formatCurrency(inventoryStats?.totalRetailValue || 0)}
          color="stat-card stat-card-slate"
        />
        <StatCard
          title="Total Sales"
          value={formatCurrency(salesStats?.totalRevenue || 0)}
          color="stat-card stat-card-coral"
        />
        <StatCard
          title="Total Purchases"
          value={formatCurrency(purchaseStats?.totalSpent || 0)}
          color="stat-card stat-card-gold"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link to="/sales" className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center group">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-200 transition-colors">
            <span className="text-lg">🛒</span>
          </div>
          <span className="text-sm font-medium text-gray-700">New Sale</span>
        </Link>
        
        <Link to="/purchase" className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center group">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-green-200 transition-colors">
            <span className="text-lg">📥</span>
          </div>
          <span className="text-sm font-medium text-gray-700">New Purchase</span>
        </Link>
        
        <Link to="/inventory" className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center group">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-200 transition-colors">
            <span className="text-lg">📦</span>
          </div>
          <span className="text-sm font-medium text-gray-700">Manage Inventory</span>
        </Link>
        
        <Link to="/reports" className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center group">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-amber-200 transition-colors">
            <span className="text-lg">📊</span>
          </div>
          <span className="text-sm font-medium text-gray-700">View Reports</span>
        </Link>
      </div>

      {/* Data Loading State */}
      {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                  <span className="text-xl">🛒</span>
                </span>
                Recent Sales
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                  {recentSales.length} transactions
                </span>
                <span className="text-2xl font-bold text-purple-600">
                  {formatCurrency(salesStats?.totalRevenue || 0)}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {recentSales.length > 0 ? (
                recentSales.map((s: SalesOrder) => (
                  <div key={s.id || `sales-${s.date}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">₦</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors">
                          {s.customer || 'Walk-in Customer'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span>{formatShortDate(s.date)}</span>
                          <span>•</span>
                          <span>{s.items?.length || 0} items</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-purple-700">{formatCurrency(s.total ?? 0)}</div>
                      <div className="text-xs text-gray-500 capitalize">{s.paymentStatus || 'paid'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-4">📊</div>
                  <p className="text-gray-600 mb-2">No sales recorded</p>
                  <p className="text-sm text-gray-500">Get started by creating your first sale</p>
                  <Link to="/sales" className="inline-block mt-4 text-purple-600 hover:text-purple-800 text-sm font-medium">
                    Create Sale →
                  </Link>
                </div>
              )}
            </div>
            
            {recentSales.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Link to="/sales/history" className="flex items-center justify-center gap-2 text-purple-600 hover:text-purple-800 font-medium text-sm">
                  <span>View all sales</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* Recent Purchases Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mr-3">
                  <span className="text-xl">📥</span>
                </span>
                Recent Purchases
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-medium">
                  {recentPurchases.length} transactions
                </span>
                <span className="text-2xl font-bold text-amber-600">
                  {formatCurrency(purchaseStats?.totalSpent || 0)}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {recentPurchases.length > 0 ? (
                recentPurchases.map((p: PurchaseOrder) => (
                  <div key={p.id || `purchase-${p.date}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">₦</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-amber-700 transition-colors">
                          {p.supplier || 'Unnamed Supplier'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span>{formatShortDate(p.date)}</span>
                          <span>•</span>
                          <span>{p.items?.length || 0} items</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-amber-700">{formatCurrency(p.total ?? 0)}</div>
                      <div className="text-xs text-gray-500 capitalize">{p.paymentStatus || 'unpaid'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-4">📦</div>
                  <p className="text-gray-600 mb-2">No purchases recorded</p>
                  <p className="text-sm text-gray-500">Start by adding your first purchase order</p>
                  <Link to="/purchase" className="inline-block mt-4 text-amber-600 hover:text-amber-800 text-sm font-medium">
                    Create Purchase →
                  </Link>
                </div>
              )}
            </div>
            
            {recentPurchases.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Link to="/purchase/history" className="flex items-center justify-center gap-2 text-amber-600 hover:text-amber-800 font-medium text-sm">
                  <span>View all purchases</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && !isLoading && (
        <div className="mt-8 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600">⚠️</span>
            </div>
            <div>
              <h3 className="font-medium text-orange-800">Low Stock Alert</h3>
              <p className="text-sm text-orange-600">
                {lowStockProducts.length} products are running low on stock (below {settings.lowStockThreshold} units)
              </p>
            </div>
            <Link to="/inventory" className="ml-auto text-orange-700 hover:text-orange-900 text-sm font-medium">
              View Inventory →
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className=" backdrop-blur-md border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="border-t border-black/20 mt-8 pt-8 text-center">
            <p className="text-black/80 text-sm">
              © 2026 NexTrack. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}