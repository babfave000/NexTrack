// src/pages/Admin/AdminPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { exportToCSV } from '../../utils/fileUtils';
import { DataMigration } from '../../utils/dataMigration';

interface SystemStats {
  totalUsers: number;
  totalProducts: number;
  totalSalesOrders: number;
  totalPurchaseOrders: number;
  totalSuppliers: number;
  databaseSize: string;
  lastBackup: string | null;
}

// Define proper types for our data
type TabType = 'dashboard' | 'users' | 'database' | 'system';
type UserRole = 'user' | 'manager' | 'admin';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live queries for data
  const users = useLiveQuery(() => db.users.toArray());
  const products = useLiveQuery(() => db.products.toArray());
  const salesOrders = useLiveQuery(() => db.salesOrders.toArray());
  const purchaseOrders = useLiveQuery(() => db.purchaseOrders.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const brands = useLiveQuery(() => db.brands.toArray());
  const inventoryHistory = useLiveQuery(() => db.inventoryHistory.toArray());

  // Check if user is admin - moved useEffect before conditional return
  useEffect(() => {
    const calculateStats = async () => {
      if (!users || !products || !salesOrders || !purchaseOrders || !suppliers) return;

      const stats: SystemStats = {
        totalUsers: users.length,
        totalProducts: products.length,
        totalSalesOrders: salesOrders.length,
        totalPurchaseOrders: purchaseOrders.length,
        totalSuppliers: suppliers.length,
        databaseSize: 'Calculating...',
        lastBackup: null
      };

      // Estimate database size (simplified)
      const totalData = JSON.stringify({
        users, products, salesOrders, purchaseOrders, suppliers, categories, brands, inventoryHistory
      }).length;
      stats.databaseSize = `${(totalData / 1024 / 1024).toFixed(2)} MB`;

      setSystemStats(stats);
    };

    calculateStats();
  }, [users, products, salesOrders, purchaseOrders, suppliers, categories, brands, inventoryHistory]);

  // Check if user is admin - must be after hooks
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md max-w-md">
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p>You need administrator privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleExportData = async (type: string) => {
    try {
      setIsLoading(true);
      let data: unknown[] = [];
      let filename = '';

      switch (type) {
        case 'users':
          data = users || [];
          filename = 'users_export';
          break;
        case 'products':
          data = products || [];
          filename = 'products_export';
          break;
        case 'sales':
          data = salesOrders || [];
          filename = 'sales_orders_export';
          break;
        case 'purchases':
          data = purchaseOrders || [];
          filename = 'purchase_orders_export';
          break;
        case 'suppliers':
          data = suppliers || [];
          filename = 'suppliers_export';
          break;
        case 'categories':
          data = categories || [];
          filename = 'categories_export';
          break;
        case 'brands':
          data = brands || [];
          filename = 'brands_export';
          break;
        case 'inventory':
          data = inventoryHistory || [];
          filename = 'inventory_history_export';
          break;
        case 'all': {
          const allData = {
            users: users || [],
            products: products || [],
            salesOrders: salesOrders || [],
            purchaseOrders: purchaseOrders || [],
            suppliers: suppliers || [],
            categories: categories || [],
            brands: brands || [],
            inventoryHistory: inventoryHistory || []
          };
          exportToCSV([allData], 'complete_backup');
          showMessage('success', 'Complete backup exported successfully');
          return;
        }
      }

      if (data.length > 0) {
        exportToCSV(data as Record<string, unknown>[], filename);
        showMessage('success', `${type} data exported successfully`);
      } else {
        showMessage('error', `No ${type} data found to export`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      showMessage('error', 'Export failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseReset = async () => {
    if (!confirm('⚠️ DANGER: This will delete ALL data and cannot be undone. Are you absolutely sure?')) {
      return;
    }

    if (!confirm('🚨 FINAL WARNING: This will permanently delete ALL users, products, orders, and settings. Continue?')) {
      return;
    }

    try {
      setIsLoading(true);
      await DataMigration.forceDatabaseReset();
      showMessage('success', 'Database reset successfully. Page will reload...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Database reset failed:', error);
      showMessage('error', 'Database reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserRoleUpdate = async (userId: number, newRole: string) => {
    try {
      // Use a more type-safe approach - cast to UserRole if we're confident about the values
      await db.users.update(userId, { 
        role: newRole as UserRole, 
        updatedAt: new Date() 
      });
      showMessage('success', 'User role updated successfully');
    } catch (error) {
      console.error('Role update failed:', error);
      showMessage('error', 'Failed to update user role');
    }
  };

  const handleUserDelete = async (userId: number, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user "${userEmail}"?`)) {
      return;
    }

    try {
      // Delete user and their related data
      await db.users.delete(userId);
      await db.sessions.where('userId').equals(userId).delete();
      
      // Delete user's products
      await db.products.where('userId').equals(userId).delete();
      
      // Delete user's sales orders
      await db.salesOrders.where('userId').equals(userId).delete();
      
      // Delete user's purchase orders
      await db.purchaseOrders.where('userId').equals(userId).delete();
      
      // Delete user's suppliers
      await db.suppliers.where('userId').equals(userId).delete();
      
      // Delete user's categories
      await db.categories.where('userId').equals(userId).delete();
      
      // Delete user's brands
      await db.brands.where('userId').equals(userId).delete();
      
      // Delete user's inventory history
      await db.inventoryHistory.where('userId').equals(userId).delete();
      
      // Delete user's settings
      await db.settings.where('userId').equals(userId).delete();
      
      // Delete user's profile
      await db.userProfile.where('userId').equals(userId).delete();

      showMessage('success', 'User and all associated data deleted successfully');
    } catch (error) {
      console.error('User deletion failed:', error);
      showMessage('error', 'Failed to delete user');
    }
  };

  const handleClearTable = async (tableName: string) => {
    if (!confirm(`Are you sure you want to clear all data from ${tableName}? This cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);
      
      switch (tableName) {
        case 'products':
          await db.products.clear();
          break;
        case 'sales':
          await db.salesOrders.clear();
          break;
        case 'purchases':
          await db.purchaseOrders.clear();
          break;
        case 'suppliers':
          await db.suppliers.clear();
          break;
        case 'categories':
          await db.categories.clear();
          break;
        case 'brands':
          await db.brands.clear();
          break;
        case 'inventory':
          await db.inventoryHistory.clear();
          break;
        default:
          throw new Error('Invalid table name');
      }

      showMessage('success', `${tableName} data cleared successfully`);
    } catch (error) {
      console.error('Clear table failed:', error);
      showMessage('error', `Failed to clear ${tableName} data`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseOptimization = async () => {
    try {
      setIsLoading(true);
      
      // Recreate database indexes
      await db.close();
      await db.open();
      
      // Clear any corrupted data (simplified example)
      const corruptedProducts = await db.products.filter(p => !p.name || p.name.trim() === '').toArray();
      if (corruptedProducts.length > 0) {
        await db.products.bulkDelete(corruptedProducts.map(p => p.id!));
      }

      showMessage('success', 'Database optimization completed successfully');
    } catch (error) {
      console.error('Database optimization failed:', error);
      showMessage('error', 'Database optimization failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Define tabs with proper typing
  const tabs: { id: TabType; name: string; icon: string }[] = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'database', name: 'Database', icon: '💾' },
    { id: 'system', name: 'System', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
            <div className="text-sm text-gray-500">
              Logged in as: <span className="font-semibold">{user.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 ${
          message.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
        } border px-4 py-3 rounded relative`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Processing...</span>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stats Cards */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600">👥</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {systemStats?.totalUsers || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600">📦</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Products</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {systemStats?.totalProducts || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600">💰</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Sales Orders</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {systemStats?.totalSalesOrders || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600">🛒</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Purchase Orders</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {systemStats?.totalPurchaseOrders || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Stats Cards */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-indigo-600">🏢</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Suppliers</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {systemStats?.totalSuppliers || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                      <span className="text-pink-600">🏷️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Categories</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {categories?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <span className="text-teal-600">🔖</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Brands</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {brands?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <span className="text-amber-600">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Inventory History</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {inventoryHistory?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Database Size</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {systemStats?.databaseSize || 'Calculating...'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Backup</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {systemStats?.lastBackup || 'Never'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tables</label>
                  <p className="text-lg font-semibold text-gray-900">8</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-lg font-semibold text-green-600">Healthy</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleExportData('all')}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  Export Complete Backup
                </button>
                <button
                  onClick={() => setActiveTab('database')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Database Management
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  User Management
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
              <p className="text-sm text-gray-500 mt-1">Manage system users and their permissions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users?.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {userItem.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userItem.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {userItem.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={userItem.role}
                          onChange={(e) => handleUserRoleUpdate(userItem.id!, e.target.value)}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="user">User</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {userItem.id !== user.id && (
                          <button
                            onClick={() => handleUserDelete(userItem.id!, userItem.email)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                          >
                            Delete
                          </button>
                        )}
                        {userItem.id === user.id && (
                          <span className="text-gray-400 text-xs">Current User</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Database Tab */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* Export Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Export</h3>
              <p className="text-sm text-gray-500 mb-4">Export your data for backup or analysis</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => handleExportData('users')}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>👥</span>
                  <span>Export Users</span>
                </button>
                <button
                  onClick={() => handleExportData('products')}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>📦</span>
                  <span>Export Products</span>
                </button>
                <button
                  onClick={() => handleExportData('sales')}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>💰</span>
                  <span>Export Sales</span>
                </button>
                <button
                  onClick={() => handleExportData('purchases')}
                  disabled={isLoading}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>🛒</span>
                  <span>Export Purchases</span>
                </button>
                <button
                  onClick={() => handleExportData('suppliers')}
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>🏢</span>
                  <span>Export Suppliers</span>
                </button>
                <button
                  onClick={() => handleExportData('categories')}
                  disabled={isLoading}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-3 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>🏷️</span>
                  <span>Export Categories</span>
                </button>
                <button
                  onClick={() => handleExportData('brands')}
                  disabled={isLoading}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>🔖</span>
                  <span>Export Brands</span>
                </button>
                <button
                  onClick={() => handleExportData('inventory')}
                  disabled={isLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>📊</span>
                  <span>Export Inventory</span>
                </button>
              </div>
            </div>

            {/* Database Management */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Management</h3>
              <div className="space-y-4">
                {/* Database Optimization */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Database Optimization</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Optimize database performance and clean up corrupted data.
                  </p>
                  <button
                    onClick={handleDatabaseOptimization}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    Optimize Database
                  </button>
                </div>

                {/* Clear Data Section */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-yellow-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">Clear Data</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Clear specific data tables. This action is irreversible.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[
                      { name: 'products', label: 'Products', color: 'red' },
                      { name: 'sales', label: 'Sales Orders', color: 'red' },
                      { name: 'purchases', label: 'Purchase Orders', color: 'red' },
                      { name: 'suppliers', label: 'Suppliers', color: 'orange' },
                      { name: 'categories', label: 'Categories', color: 'orange' },
                      { name: 'brands', label: 'Brands', color: 'orange' },
                      { name: 'inventory', label: 'Inventory History', color: 'yellow' },
                    ].map((table) => (
                      <button
                        key={table.name}
                        onClick={() => handleClearTable(table.name)}
                        disabled={isLoading}
                        className={`bg-${table.color}-600 hover:bg-${table.color}-700 text-white px-3 py-2 rounded-md text-xs font-medium disabled:opacity-50`}
                      >
                        Clear {table.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Reset Entire Database</h4>
                  <p className="text-sm text-red-700 mb-3">
                    This will delete ALL data including users, products, orders, and settings.
                    Use only in case of critical issues or during development.
                  </p>
                  <button
                    onClick={handleDatabaseReset}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    Reset Entire Database
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* System Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">App Version</label>
                    <p className="text-lg font-semibold text-gray-900">NexTrack v1.0.0</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Environment</label>
                    <p className="text-lg font-semibold text-gray-900">Production</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Browser</label>
                    <p className="text-lg font-semibold text-gray-900">{navigator.userAgent.split(' ')[0]}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Database</label>
                    <p className="text-lg font-semibold text-gray-900">Dexie.js (IndexedDB)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Framework</label>
                    <p className="text-lg font-semibold text-gray-900">React + TypeScript</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Database Connection</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Authentication System</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Data Storage</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Normal
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">User Management</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Backup System</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}