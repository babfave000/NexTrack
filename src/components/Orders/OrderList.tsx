// src/components/Orders/OrderList.tsx
import { useUserData } from '../../hooks/useUserData';

interface Props {
  mode: 'sales' | 'purchase';
  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
}

interface BaseOrder {
  id?: number;
  date?: string | Date;
  items?: unknown[];
  total?: number;
  status: string;
}

interface SalesOrder extends BaseOrder {
  customer: string;
  paymentStatus: string;
}

interface PurchaseOrder extends BaseOrder {
  supplier: string;
}

type Order = SalesOrder | PurchaseOrder;

export default function OrderList({ mode, onView, onEdit }: Props) {
  const { salesOrders, purchaseOrders } = useUserData();
  const orders = mode === 'sales' ? salesOrders : purchaseOrders;

  const renderStatusBadge = (status: string) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    if (status === 'approved') return `${base} bg-green-100 text-green-800`;
    if (status === 'fulfilled') return `${base} bg-blue-100 text-blue-800`;
    return `${base} bg-yellow-100 text-yellow-800`;
  };

  const renderPaymentBadge = (paymentStatus: string) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    if (paymentStatus === 'paid') return `${base} bg-green-100 text-green-800`;
    if (paymentStatus === 'partially_paid') return `${base} bg-orange-100 text-orange-800`;
    return `${base} bg-red-100 text-red-800`;
  };

  // Safe type guard functions
  const isSalesOrder = (order: Order): order is SalesOrder => {
    return mode === 'sales' && 'customer' in order;
  };

  const isPurchaseOrder = (order: Order): order is PurchaseOrder => {
    return mode === 'purchase' && 'supplier' in order;
  };

  const getOrderName = (order: Order): string => {
    if (isSalesOrder(order)) {
      return order.customer;
    } else if (isPurchaseOrder(order)) {
      return order.supplier;
    }
    
    // Fallback: check for properties that might exist
    const orderWithAnyProps = order as Record<string, unknown>;
    if (orderWithAnyProps.customer && typeof orderWithAnyProps.customer === 'string') {
      return orderWithAnyProps.customer;
    }
    if (orderWithAnyProps.supplier && typeof orderWithAnyProps.supplier === 'string') {
      return orderWithAnyProps.supplier;
    }
    
    return 'Unknown';
  };

  const getPaymentStatus = (order: Order): string => {
    if (isSalesOrder(order)) {
      return order.paymentStatus || 'unpaid';
    }
    
    // Fallback: check for paymentStatus property
    const orderWithAnyProps = order as unknown as Record<string, unknown>;
    if (orderWithAnyProps.paymentStatus && typeof orderWithAnyProps.paymentStatus === 'string') {
      return orderWithAnyProps.paymentStatus;
    }
    
    return 'unpaid';
  };

  if (!orders) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          {mode === 'sales' ? 'Sales Orders' : 'Purchase Orders'}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {mode === 'sales' ? 'Customer' : 'Supplier'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₦)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              {mode === 'sales' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length > 0 ? (
              (orders as Order[]).map((order) => {
                const name = getOrderName(order);
                const paymentStatus = getPaymentStatus(order);
                const itemsCount = Array.isArray(order.items) ? order.items.length : 0;

                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.date ? new Date(order.date).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{itemsCount} items</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₦{(order.total ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={renderStatusBadge(order.status)}>
                        {order.status}
                      </span>
                    </td>
                    {mode === 'sales' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={renderPaymentBadge(paymentStatus)}>
                          {paymentStatus.replace('_', ' ')}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => order.id && onView?.(order.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => order.id && onEdit?.(order.id)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors text-sm font-medium"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td 
                  colSpan={mode === 'sales' ? 7 : 6} 
                  className="px-6 py-8 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>No {mode} orders found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}