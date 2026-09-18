// src/pages/Sales/InvoiceOrder.tsx
import { useSettings } from '../../hooks/useSettings';
import type { OrderStatus, PaymentStatus } from '../../db/dexie';

interface InvoiceItemLike {
  product?: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  price?: number;
  total?: number;
}

interface InvoiceOrderLike {
  id: number | string;
  customer?: string | null;
  date?: string | null;
  items: InvoiceItemLike[];
  total?: number | null;
  status?: OrderStatus | string | null;
  paymentStatus?: PaymentStatus | string | null;
  notes?: string | null;
}

interface InvoiceOrderProps {
  order: InvoiceOrderLike;
  showPrintButton?: boolean;
}

export default function InvoiceOrder({ order, showPrintButton = true }: InvoiceOrderProps) {
  const { businessInfo } = useSettings();

  const businessName = businessInfo?.businessName?.trim() || 'NexTrack';
  const businessEmail = businessInfo?.email?.trim();
  const businessPhone = businessInfo?.phone?.trim();
  const businessAddress = businessInfo?.address?.trim();
  const businessWebsite = businessInfo?.website?.trim();

  const formatCurrency = (amount: number) =>
    `₦${(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (d?: string | null) => {
    if (!d) return '—';
    try {
      const date = new Date(d);
      if (Number.isNaN(date.getTime())) return d;
      return date.toISOString().slice(0, 10);
    } catch {
      return d;
    }
  };

  const invoiceNumber =
    typeof order.id === 'string' && order.id.startsWith('INV-')
      ? order.id
      : `INV-${String(order.id).padStart(5, '0')}`;

  const calculatedItems = (order.items || []).map((i) => {
    const description = i.product?.trim() || i.productName?.trim() || 'Unknown Product';
    const qty = Number(i.quantity) || 0;
    const unitPrice = Number(i.unitPrice ?? i.price ?? 0) || 0;
    const lineTotal =
      typeof i.total === 'number' && Number.isFinite(i.total) ? i.total : qty * unitPrice;
    return { description, qty, unitPrice, lineTotal };
  });

  const subtotal = calculatedItems.reduce((sum, l) => sum + l.lineTotal, 0);
  const total =
    typeof order.total === 'number' && Number.isFinite(order.total) ? order.total : subtotal;

  const statusLabel =
    typeof order.status === 'string' && order.status.length > 0
      ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
      : '—';

  const paymentLabel =
    typeof order.paymentStatus === 'string' && order.paymentStatus.length > 0
      ? order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)
      : '—';

  const invoiceDate = formatDate(order.date);

  return (
    <div
      className="print-slip max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-10"
      style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}
    >
      {/* Header: Business (left) + Sales Invoice metadata (right) */}
      <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-gray-200 mb-6">
        <div className="min-w-0 flex-1 max-w-[60%]">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight break-words">
            {businessName}
          </h1>
          <div className="mt-2 space-y-1 text-sm text-gray-700">
            {businessEmail && (
              <p>
                <span className="font-medium">Email:</span> {businessEmail}
              </p>
            )}
            {businessPhone && (
              <p>
                <span className="font-medium">Phone:</span> {businessPhone}
              </p>
            )}
            {businessAddress && (
              <p className="whitespace-pre-line leading-snug">
                <span className="font-medium">Address:</span> {businessAddress}
              </p>
            )}
            {businessWebsite && (
              <p>
                <span className="font-medium">Website:</span> {businessWebsite}
              </p>
            )}
          </div>
        </div>

        <div className="text-right min-w-[180px] sm:min-w-[240px]">
          <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-900">
            Sales Invoice
          </h2>
          <div className="mt-3 space-y-1.5 text-sm text-gray-700">
            <p>
              <span className="font-semibold text-gray-800">Invoice #:</span>{' '}
              <span className="font-mono">{invoiceNumber}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-800">Date:</span> {invoiceDate}
            </p>
          </div>
        </div>
      </div>

      {/* Bill To / Status & Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 mb-2 text-base">Bill To</h3>
          <p className="text-gray-800 whitespace-pre-line leading-relaxed break-words">
            {order.customer?.trim() || '—'}
          </p>
        </div>

        <div className="md:text-right space-y-1.5">
          <p className="text-gray-700">
            <span className="font-semibold text-gray-900">Status:</span>{' '}
            <span className="font-medium text-gray-800">{statusLabel}</span>
          </p>
          <p className="text-gray-700">
            <span className="font-semibold text-gray-900">Payment:</span>{' '}
            <span className="font-medium text-gray-800">{paymentLabel}</span>
          </p>
        </div>
      </div>

      {/* Items table */}
      <div className="mb-6 overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-800">
              <th className="text-left p-3 font-semibold border-b border-gray-200">Description</th>
              <th className="text-right p-3 font-semibold border-b border-gray-200 w-16">Qty</th>
              <th className="text-right p-3 font-semibold border-b border-gray-200 w-32">Unit Price</th>
              <th className="text-right p-3 font-semibold border-b border-gray-200 w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {calculatedItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No items on this invoice.
                </td>
              </tr>
            ) : (
              calculatedItems.map((line, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                  <td className="p-3 text-gray-800 align-top">{line.description}</td>
                  <td className="p-3 text-right text-gray-800 align-top tabular-nums">{line.qty}</td>
                  <td className="p-3 text-right text-gray-800 align-top tabular-nums">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="p-3 text-right text-gray-900 font-medium align-top tabular-nums">
                    {formatCurrency(line.lineTotal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals (right-aligned block) */}
      <div className="flex justify-end mb-8">
        <div className="w-full max-w-xs sm:max-w-sm text-sm">
          <div className="flex justify-between items-center py-2 border-t border-gray-200 text-gray-700">
            <span className="font-medium">Subtotal</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center py-3 mt-1 border-t-2 border-gray-900 text-lg font-bold text-gray-900">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-gray-200 text-sm text-gray-700 space-y-2">
        <p className="font-semibold text-gray-900">Thank you for your business!</p>
        <p>If you have any questions about this invoice, please contact us.</p>
        <p className="text-gray-500 text-xs pt-1">
          Generated by {businessName} via NexTrack · {invoiceDate}
        </p>
      </div>

      {/* On-screen print action — never appears on paper */}
      {showPrintButton && (
        <div className="print-hidden mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              try {
                window.focus();
                window.print();
              } catch {
                /* noop — print disabled in some iframes/contexts */
              }
            }}
            className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition"
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
      )}
    </div>
  );
}
