// src/pages/Sales/SalesPage.tsx
import { useState, useMemo, useEffect } from 'react';
import { useUserData } from '../../hooks/useUserData';
import SalesOrderDetail from './SalesOrderDetail';
import SalesForm from './SalesForm';
import SalesPrint from './SalesPrint';
import ChangeLeftList from './ChangeLeftList';
import { format } from 'date-fns';
import type { SalesOrder } from '../../db/dexie';

type ViewMode = 'list' | 'detail' | 'form' | 'print' | 'edit' | 'changeLeft';

interface SalesPageProps {
  initialTab?: 'new' | 'history' | 'changeLeft';
}

export default function SalesPage({ initialTab = 'new' }: SalesPageProps) {
  const { salesOrders, isAuthenticated, user } = useUserData();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'changeLeft'>(initialTab);

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab === 'history') {
      window.history.replaceState(null, '', '/sales/history');
    } else if (activeTab === 'changeLeft') {
      window.history.replaceState(null, '', '/sales/change-left');
    } else {
      window.history.replaceState(null, '', '/sales');
    }
  }, [activeTab]);

  // Sync with initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
    setViewMode('list');
  }, [initialTab]);

  const openDetail = (id: number) => {
    setSelectedOrderId(id);
    setViewMode('detail');
  };

  const openEdit = (id: number) => {
    setSelectedOrderId(id);
    setViewMode('edit');
    setActiveTab('new');
  };

  const openPrint = (id: number) => {
    setSelectedOrderId(id);
    setViewMode('print');
  };

  const openChangeLeft = () => {
    setViewMode('changeLeft');
    setActiveTab('changeLeft');
  };

  const handleCancelEdit = () => {
    if (window.confirm('Are you sure you want to cancel editing? Any unsaved changes will be lost.')) {
      setViewMode('list');
      setSelectedOrderId(null);
      setActiveTab('history');
    }
  };

  const handleCancelNew = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      setViewMode('list');
      setSelectedOrderId(null);
      setActiveTab('history');
    }
  };

  const handleSave = () => {
    setViewMode('list');
    setSelectedOrderId(null);
    setActiveTab('history');
  };

  // Filter and sort orders based on search term, status, and ID
  const filteredOrders = useMemo(() => {
    if (!salesOrders) return [];
    
    const filtered = salesOrders.filter(order => {
      const matchesSearch = order.customer?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           order.id?.toString().includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort by ID in descending order (latest/highest ID first) - 10,9,8,7,6,5,4,3,2,1
    return filtered.sort((a, b) => {
      return (b.id || 0) - (a.id || 0);
    });
  }, [salesOrders, searchTerm, statusFilter]);

  // Check if order can be edited 
  // - Draft orders: fully editable
  // - Approved orders: only payment status editable
  // - Fulfilled orders: not editable
  const canEditOrder = (order: SalesOrder) => {
    return order.status === 'draft' || order.status === 'approved';
  };

  // Check if order is fully editable (draft status)
  const isFullyEditable = (order: SalesOrder) => {
    return order.status === 'draft';
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Please log in to access sales management.</p>
        </div>
      </div>
    );
  }

  if (!salesOrders) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Main Header - Only show when not in form/edit mode */}
      {(viewMode === 'list' || viewMode === 'detail' || viewMode === 'print' || viewMode === 'changeLeft') && (
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Sales Orders</h1>
            <p className="text-gray-600 mt-1">Manage customer orders and invoices</p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setActiveTab('new');
                setViewMode('list');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'new' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              New Order
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setViewMode('list');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'history' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Order History
            </button>
            <button
              onClick={openChangeLeft}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'changeLeft' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Change Left
            </button>
          </div>
        </div>
      )}

      {/* Show form views only when in form/edit mode */}
      {(viewMode === 'form' || viewMode === 'edit') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <SalesForm
            orderId={viewMode === 'edit' ? selectedOrderId! : undefined}
            onSave={handleSave}
            onCancel={viewMode === 'edit' ? handleCancelEdit : handleCancelNew}
            userId={user.id!}
          />
        </div>
      )}

      {/* Show order history only when in list mode and active tab is history */}
      {viewMode === 'list' && activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Sales Order History</h2>
            <span className="text-sm text-gray-500">
              {filteredOrders.length} orders total
            </span>
          </div>

          {/* Filters and Search */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search orders by customer or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
              </div>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sales orders found</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first sales order</p>
              <button
                onClick={() => setActiveTab('new')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Create Sales Order
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₦)</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customer || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.date ? format(new Date(order.date), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ₦{typeof order.total === 'number' ? order.total.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'fulfilled'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : order.paymentStatus === 'partially_paid'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {(order.paymentStatus || 'unpaid').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => openDetail(order.id!)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Order Details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {canEditOrder(order) && (
                            <button
                              onClick={() => openEdit(order.id!)}
                              className="text-indigo-600 hover:text-indigo-800 transition-colors"
                              title={isFullyEditable(order) ? "Edit Order" : "Edit Payment Status Only"}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => openPrint(order.id!)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Print Invoice"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Show new order form only when in list mode and active tab is new */}
      {viewMode === 'list' && activeTab === 'new' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Create New Sales Order</h2>
          </div>
          
          <SalesForm
            onSave={handleSave}
            onCancel={handleCancelNew}
            userId={user.id!}
          />
        </div>
      )}

      {/* Show Change Left page */}
      {viewMode === 'changeLeft' && activeTab === 'changeLeft' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <ChangeLeftList userId={user.id!} />
        </div>
      )}

      {/* Render detail and print views */}
      {viewMode === 'detail' && selectedOrderId !== null && (
        <SalesOrderDetail
          orderId={selectedOrderId}
          onBack={() => setViewMode('list')}
          userId={user.id!}
        />
      )}

      {viewMode === 'print' && selectedOrderId !== null && (
        <SalesPrint
          orderId={selectedOrderId}
          onBack={() => setViewMode('list')}
          userId={user.id!}
        />
      )}
    </div>
  );
}