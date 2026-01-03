// src/pages/Purchases/PurchaseOrders.tsx

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import OrderForm from '../../components/Orders/OrderForm';
import OrderList from '../../components/Orders/OrderList';
import PurchasePreview from './PurchasePreview';

import { db, type PurchaseOrder } from '../../db/dexie';

export default function PurchaseOrders() {
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Load orders live from Dexie
  const orders = useLiveQuery(() => db.purchaseOrders.toArray(), []);

  useEffect(() => {
    if (selectedPOId && orders) {
      const order = orders.find((o) => String(o.id) === selectedPOId) || null;
      setSelectedOrder(order);
    } else {
      setSelectedOrder(null);
    }
  }, [selectedPOId, orders]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🧾 Purchase Orders</h1>

      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">➕ New Purchase Order</h2>
        <OrderForm mode="purchase" onSave={() => setSelectedPOId(null)} />
      </div>

      <div className="bg-white shadow rounded p-4">
        <h2 className="text-lg font-semibold mb-2">📋 All Purchase Orders</h2>
        <OrderList
          mode="purchase"
          onView={(id: number) => setSelectedPOId(String(id))}
        />
      </div>

      {/* Preview Purchase Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 relative">
            <button
              className="absolute top-2 right-4 text-gray-500 hover:text-black text-lg"
              onClick={() => setSelectedPOId(null)}
              aria-label="Close Preview"
            >
              ✕
            </button>
            <PurchasePreview order={selectedOrder as PurchaseOrder & { id: number }} />
          </div>
        </div>
      )}
    </div>
  );
}
