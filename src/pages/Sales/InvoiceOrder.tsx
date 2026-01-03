// src/pages/Sales/InvoiceOrder.tsx


interface InvoiceItem {
  product: string;
  quantity: number;
  price: number;
}

interface SalesOrder {
  id: number;
  customer?: string;
  date: string;
  items: InvoiceItem[];
  total?: number;
}

export default function InvoiceOrder({ order }: { order: SalesOrder }) {
  const formatCurrency = (amount: number) =>
    `₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const calculatedTotal = order.items?.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.price || 0),
    0
  );

  const total = order.total ?? calculatedTotal;

  return (
    <div className="bg-white shadow-md rounded p-6 text-sm md:text-base print:bg-white print:shadow-none">
      {/* Header */}
      <header className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">NexTrack</h1>
            <p className="text-gray-600">Smart Business Tracker</p>
          </div>
          <div className="w-20 h-20 bg-gray-100 border border-gray-300 flex items-center justify-center text-xs text-gray-500">
            Logo
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <div>
            <strong>Date:</strong>{' '}
            {order.date
              ? new Date(order.date).toLocaleDateString()
              : '—'}
          </div>
          <div><strong>Invoice #:</strong> {order.id}</div>
          <div><strong>Customer:</strong> {order.customer ?? '—'}</div>
        </div>
      </header>

      {/* Table */}
      <table className="w-full border mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">Product</th>
            <th className="border p-2 text-center">Qty</th>
            <th className="border p-2 text-right">Price (₦)</th>
            <th className="border p-2 text-right">Subtotal (₦)</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, idx) => {
            const subtotal = (item.price || 0) * (item.quantity || 0);
            return (
              <tr key={idx}>
                <td className="border p-2">{item.product || '—'}</td>
                <td className="border p-2 text-center">{item.quantity}</td>
                <td className="border p-2 text-right">
                  {formatCurrency(item.price)}
                </td>
                <td className="border p-2 text-right">
                  {formatCurrency(subtotal)}
                </td>
              </tr>
            );
          })}
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded transition"
        >
          🖨️ Print Invoice
        </button>
      </div>
    </div>
  );
}
