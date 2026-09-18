// src/pages/Sales/SalesOrderDetail.tsx
import { useUserData } from '../../hooks/useUserData';
import InvoicePreview from './InvoicePreview';
import { useEffect, useMemo, useState } from 'react';
import { getSalesOrder } from '../../db/operations/sales';
import type { SalesOrder } from '../../db/dexie';

interface Props {
  orderId: number;
  onBack: () => void;
  userId: number;
}

interface InvoiceItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  price: number;
  total: number;
  product: string;
}

interface InvoiceOrder extends Omit<SalesOrder, 'items'> {
  id: number;
  items: InvoiceItem[];
}

export default function SalesOrderDetail({ orderId, onBack, userId }: Props) {
  const { products } = useUserData();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const orderData = await getSalesOrder(orderId, userId);
        setOrder(orderData);
      } catch (error) {
        console.error('Error loading order:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [orderId, userId]);

  const invoiceOrder = useMemo((): InvoiceOrder | null => {
    if (!order || !products) return null;

    return {
      ...order,
      id: order.id!,
      items: order.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const price = product?.salePrice ?? 0;
        return {
          ...item,
          product: product?.name ?? 'Unknown Product',
          price,
          total: item.quantity * price,
        };
      }),
    };
  }, [order, products]);

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading order details...</p>
      </div>
    );
  }

  if (!invoiceOrder) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Order not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Top action bar — on screen only, never on paper */}
      <div className="print-hidden flex flex-wrap justify-between items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="min-h-[44px] px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition"
        >
          Back
        </button>

        <button
          type="button"
          onClick={() => {
            try {
              window.focus();
              window.print();
            } catch {
              /* noop */
            }
          }}
          className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 17h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h2M7 21h10a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2z"
            />
          </svg>
          Print Invoice
        </button>
      </div>

      <InvoicePreview order={invoiceOrder} showPrintButton={false} />
    </div>
  );
}