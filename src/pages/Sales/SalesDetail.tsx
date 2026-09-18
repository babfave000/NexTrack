// src/pages/Sales/SalesDetail.tsx

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import InvoiceOrder from './InvoiceOrder';

const SalesDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Top action bar — on screen only, never on paper */}
      <div className="print-hidden flex flex-wrap justify-between items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-[44px] px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition"
        >
          Back
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/sales/${order.id}/edit`}
            className="inline-flex items-center min-h-[44px] px-4 py-2 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-medium transition"
          >
            Edit
          </Link>
          <Link
            to={`/sales/${order.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center min-h-[44px] px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition"
          >
            Open print view
          </Link>
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
      </div>

      <InvoiceOrder
        order={{
          id: order.id ?? 0,
          customer: order.customer,
          date: order.date,
          items: order.items,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          notes: order.notes,
        }}
        showPrintButton={false}
      />
    </div>
  );
};

export default SalesDetail;
