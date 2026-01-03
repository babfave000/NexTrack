// src/pages/Purchases/PurchasePreview.tsx

import type { PurchaseOrder as DBPurchaseOrder } from '../../db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';

export interface PurchaseItem {
  product: string;
  quantity: number;
  price: number;
}

export interface PurchaseOrder {
  id: number;
  supplier: string;
  date: string;
  items: PurchaseItem[];
  total: number;
}

interface PurchasePreviewProps {
  order: DBPurchaseOrder & { id: number };
}

export default function PurchasePreview({ order }: PurchasePreviewProps) {
  const products = useLiveQuery(() => db.products.toArray(), []);

  const formatCurrency = (value: number) =>
    `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const getProductName = (productId: number) => {
    const product = products?.find(p => p.id === productId);
    return product?.name || `Product #${productId}`;
  };

  return (
    <div
      className="bg-white shadow p-6 rounded print:p-0 print:shadow-none print:bg-white"
      aria-label="Purchase Order Preview"
    >
      {/* Header Info */}
      <div className="mb-6 space-y-1">
        <div className="text-2xl font-bold">NexTrack</div>
        <div className="text-sm">Date: {formatDate(order.date)}</div>
        <div className="text-sm">
          PO #: <strong>{order.id}</strong>
        </div>
        <div className="text-sm">
          Supplier: <strong>{order.supplier}</strong>
        </div>
      </div>

      {/* Purchase Table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 mb-4 text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="border p-2">Product</th>
              <th className="border p-2 text-center">Qty</th>
              <th className="border p-2 text-right">Unit Price</th>
              <th className="border p-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.length > 0 ? (
              order.items.map((item, i) => (
                <tr key={i} className="border-t">
                  <td className="border p-2">{getProductName(item.productId)}</td>
                  <td className="border p-2 text-center">{item.quantity}</td>
                  <td className="border p-2 text-right">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="border p-2 text-right">
                    {formatCurrency(item.price * item.quantity)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-2 italic text-gray-500" colSpan={4}>
                  No items in this purchase order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="text-right text-base font-semibold mt-2">
        Total: {formatCurrency(order.total)}
      </div>

      {/* Print Button */}
      <div className="mt-6 text-center print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          aria-label="Print Purchase Order"
        >
          🖨️ Print Purchase Order
        </button>
      </div>
    </div>
  );
}