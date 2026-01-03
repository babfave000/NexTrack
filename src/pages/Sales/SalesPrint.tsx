// src/pages/Sales/SalesPrint.tsx
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSalesOrder } from '../../db/operations/sales';
import type { SalesOrder, SalesOrderItem } from '../../db/dexie';

const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

interface SalesPrintProps {
  orderId?: number;
  onBack?: () => void;
  userId: number;
}

interface PrintableOrder extends Omit<SalesOrder, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  id?: number;
}

const SalesPrint = ({ orderId, userId }: SalesPrintProps) => {
  const { id } = useParams<{ id: string }>();
  const actualOrderId = orderId || (id ? Number(id) : undefined);
  const [order, setOrder] = useState<PrintableOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      if (actualOrderId) {
        try {
          const orderData = await getSalesOrder(actualOrderId, userId);
          setOrder(orderData);
        } catch (error) {
          console.error('Error loading order:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadOrder();
  }, [actualOrderId, userId]);

  useEffect(() => {
    if (order) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [order]);

  if (isLoading) return <div className="p-4 text-gray-600">Preparing invoice...</div>;
  if (!order) return <div className="p-4 text-gray-600">Order not found or access denied.</div>;

  const totalAmount = order.items?.reduce((sum: number, item: SalesOrderItem) => sum + (item.total || 0), 0) || 0;

  return (
    <div className="p-8 print:p-0 bg-gray-100 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white p-6 shadow print:shadow-none print:border print:rounded-none print:p-4">
        <h1 className="text-2xl font-bold mb-2">Sales Invoice</h1>
        <p><strong>Date:</strong> {order.date}</p>
        <p><strong>Customer:</strong> {order.customer || '—'}</p>
        <p><strong>Status:</strong> {order.status || '—'}</p>
        <p><strong>Payment:</strong> {order.paymentStatus || '—'}</p>

        <hr className="my-4" />

        <table className="w-full mb-4 text-sm">
          <thead>
            <tr className="border-b border-t bg-gray-50">
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2">Qty</th>
              <th className="text-right p-2">Price</th>
              <th className="text-right p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item: SalesOrderItem, idx: number) => (
              <tr key={idx} className="border-b">
                <td className="p-2">{item.productName}</td>
                <td className="p-2 text-right">{item.quantity}</td>
                <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="p-2 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right font-bold text-lg">
          Total: {formatCurrency(totalAmount)}
        </div>

        <div className="mt-6 text-sm">
          <p>Thank you for your business!</p>
          <p className="text-gray-600">NexTrack Invoice System</p>
        </div>
      </div>
    </div>
  );
};

export default SalesPrint;