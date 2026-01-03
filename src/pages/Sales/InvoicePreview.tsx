// src/pages/Sales/InvoicePreview.tsx


interface InvoiceItem {
  product: string;
  quantity: number;
  price: number;
  total?: number;
}

interface SalesOrder {
  id: number;
  customer?: string;
  date: string;
  items: InvoiceItem[];
  total?: number;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);

export default function InvoicePreview({ order }: { order: SalesOrder }) {
  const calculatedTotal = order.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const total = order.total ?? calculatedTotal;

  return (
    <div className="bg-white shadow p-6 rounded print:p-0 print:shadow-none print:bg-white text-sm md:text-base">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-blue-700">NexTrack</h1>
        <p className="text-gray-600">Smart Business Tracker</p>

        <div className="mt-4 space-y-1 text-sm">
          <div>
            <strong>Date:</strong>{' '}
            {order.date ? new Date(order.date).toLocaleDateString() : '—'}
          </div>
          <div>
            <strong>Invoice #:</strong> {order.id ?? '—'}
          </div>
          <div>
            <strong>Customer:</strong> {order.customer || '—'}
          </div>
        </div>
      </div>

      {/* Item Table */}
      <table className="w-full border mb-6">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="border p-2">Product</th>
            <th className="border p-2 text-center">Qty</th>
            <th className="border p-2 text-right">Unit Price</th>
            <th className="border p-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border p-2">{item.product}</td>
              <td className="border p-2 text-center">{item.quantity}</td>
              <td className="border p-2 text-right">
                {formatCurrency(item.price)}
              </td>
              <td className="border p-2 text-right">
                {formatCurrency(item.quantity * item.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="text-right text-lg font-semibold">
        Total: {formatCurrency(total)}
      </div>

      {/* Print Button */}
      <div className="mt-6 text-center print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded shadow transition"
        >
          🖨️ Print Invoice
        </button>
      </div>
    </div>
  );
}
