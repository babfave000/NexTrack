// src/pages/Sales/SalesPrint.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSalesOrder } from '../../db/operations/sales';
import { useSettings } from '../../hooks/useSettings';
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

const SalesPrint = ({ orderId, onBack, userId }: SalesPrintProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { businessInfo } = useSettings();
  const actualOrderId = orderId || (id ? Number(id) : undefined);
  const [order, setOrder] = useState<PrintableOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoPrinted, setAutoPrinted] = useState(false);

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
    if (!order || autoPrinted) return;
    setAutoPrinted(true);
    // Defer print until after layout + fonts/images settle so the slip
    // renders at portrait A4 size instead of pulling in stale chrome.
    let rafId = 0;
    const timer = window.setTimeout(() => {
      rafId = window.requestAnimationFrame(() => {
        try {
          window.focus();
          window.print();
        } catch {
          /* noop — print disabled in some iframes/contexts */
        }
      });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [order, autoPrinted]);

  if (isLoading) return <div className="p-4 text-gray-600">Preparing invoice...</div>;
  if (!order) return <div className="p-4 text-gray-600">Order not found or access denied.</div>;

  const totalAmount = order.items?.reduce((sum: number, item: SalesOrderItem) => sum + (item.total || 0), 0) || 0;
  const businessName = businessInfo?.businessName?.trim() || 'NexTrack';
  const businessEmail = businessInfo?.email?.trim();
  const businessPhone = businessInfo?.phone?.trim();
  const businessAddress = businessInfo?.address?.trim();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-2 sm:px-4">
      {/* Print-only actions (never appear on paper) */}
      <div className="print-hidden max-w-3xl mx-auto mb-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="min-h-[44px] px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            try { window.focus(); window.print(); } catch { /* noop */ }
          }}
          className="min-h-[44px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          Print Invoice
        </button>
      </div>

      {/* THE SLIP — ONLY this node and its children are visible on paper */}
      <div
        className="print-slip max-w-3xl mx-auto bg-white p-6 sm:p-10 shadow-lg sm:rounded-xl"
        style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}
      >
        {/* Header (business + invoice title) */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-gray-200 mb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {businessName}
            </h1>
            {businessAddress && (
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{businessAddress}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-gray-700">
              {businessPhone && <p>Tel: {businessPhone}</p>}
              {businessEmail && <p>Email: {businessEmail}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-gray-900 uppercase tracking-wide">Sales Invoice</h2>
            {order.id !== undefined && (
              <p className="text-sm text-gray-600 mt-1">Invoice #INV-{String(order.id).padStart(5, '0')}</p>
            )}
            <p className="text-sm text-gray-600 mt-0.5">Date: {order.date}</p>
          </div>
        </div>

        {/* Customer / status block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <p className="font-semibold text-gray-800 mb-1">Bill To</p>
            <p className="text-gray-700">{order.customer || '—'}</p>
          </div>
          <div className="md:text-right">
            <p className="text-gray-700">
              <span className="font-semibold text-gray-800">Status:</span>{' '}
              <span className="capitalize">{(order.status as string) || '—'}</span>
            </p>
            <p className="text-gray-700 mt-0.5">
              <span className="font-semibold text-gray-800">Payment:</span>{' '}
              <span className="capitalize">{order.paymentStatus || '—'}</span>
            </p>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-4 border-collapse">
          <thead>
            <tr className="border-y border-gray-300 bg-gray-50">
              <th className="text-left p-2 font-semibold text-gray-800">Description</th>
              <th className="text-right p-2 font-semibold text-gray-800 w-16">Qty</th>
              <th className="text-right p-2 font-semibold text-gray-800 w-28">Unit Price</th>
              <th className="text-right p-2 font-semibold text-gray-800 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item: SalesOrderItem, idx: number) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="p-2 text-gray-800">{item.productName}</td>
                <td className="p-2 text-right text-gray-800">{item.quantity}</td>
                <td className="p-2 text-right text-gray-800">{formatCurrency(item.unitPrice)}</td>
                <td className="p-2 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <div className="w-full max-w-xs">
            <div className="flex justify-between py-1 border-t border-gray-200 text-sm text-gray-700">
              <span>Subtotal</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-900 text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 text-sm text-gray-700 space-y-1">
          <p className="font-semibold">Thank you for your business!</p>
          <p>If you have any questions about this invoice, please contact us.</p>
          <p className="text-gray-500 text-xs pt-2">
            Generated by {businessName} via NexTrack · {order.date}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalesPrint;