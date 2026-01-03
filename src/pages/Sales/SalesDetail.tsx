// src/pages/Sales/SalesDetail.tsx

import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { format } from 'date-fns';

const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

const SalesDetail = () => {
  const { id } = useParams<{ id: string }>();
  const order = useLiveQuery(() => db.salesOrders.get(Number(id)), [id]);

  if (!order) {
    return (
      <div className="p-6">
        <h2 className="text-xl text-red-600">Sales Order Not Found</h2>
        <p>
          Please check the URL or return to the{' '}
          <Link to="/sales" className="text-blue-500 underline">
            Sales List
          </Link>.
        </p>
      </div>
    );
  }

  const total = order.items?.reduce((sum, i) => sum + (i.total ?? 0), 0) ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Order #{order.id}</h1>
        <div className="space-x-3">
          <Link
            to={`/sales/${order.id}/edit`}
            className="text-yellow-600 hover:underline"
          >
            Edit
          </Link>
          <Link
            to={`/sales/${order.id}/print`}
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Print
          </Link>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white shadow p-6 rounded-md border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <strong>Date:</strong>{' '}
            {order.date ? format(new Date(order.date), 'yyyy-MM-dd') : '—'}
          </p>
          <p>
            <strong>Customer:</strong> {order.customer || '—'}
          </p>
          <p>
            <strong>Status:</strong>{' '}
            <span
              className={`ml-2 font-semibold ${
                order.status === 'approved'
                  ? 'text-green-600'
                  : order.status === 'draft'
                  ? 'text-gray-600'
                  : 'text-blue-600'
              }`}
            >
              {order.status}
            </span>
          </p>
          <p>
            <strong>Payment Status:</strong>{' '}
            <span
              className={`ml-2 ${
                order.paymentStatus === 'paid'
                  ? 'text-green-600'
                  : order.paymentStatus === 'partially_paid'
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {order.paymentStatus}
            </span>
          </p>
          <p className="col-span-2">
            <strong>Notes:</strong> {order.notes || '—'}
          </p>
        </div>

        {/* Product Table */}
        <h2 className="text-xl font-semibold mt-8 mb-2">Products</h2>
        {order.items?.length > 0 ? (
          <table className="w-full text-sm border-t">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Product</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Unit Price (₦)</th>
                <th className="p-2 text-right">Total (₦)</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{item.productName}</td>
                  <td className="p-2 text-right">{item.quantity}</td>
                  <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="p-2 text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 mt-4">No products listed for this order.</p>
        )}

        {/* Total */}
        <div className="text-right mt-6">
          <p className="text-lg font-bold">Total: {formatCurrency(total)}</p>
        </div>

        {/* Stock note */}
        {order.status === 'approved' && (
          <p className="mt-4 text-green-600 text-sm">
            ✅ Stock has been deducted for this order.
          </p>
        )}
      </div>
    </div>
  );
};

export default SalesDetail;
