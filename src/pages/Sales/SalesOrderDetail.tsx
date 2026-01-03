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
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="text-sm text-blue-600 hover:underline mb-4"
      >
        ← Back to Sales Orders
      </button>

      <h2 className="text-xl font-bold mb-4">🧾 Sales Invoice</h2>

      <InvoicePreview order={invoiceOrder} />
    </div>
  );
}