// src/pages/Purchases/PurchaseOrderDetail.tsx

import { useState, useEffect } from 'react';
import { type PurchaseOrder } from '../../db/dexie';
import PurchasePreview from './PurchasePreview';
import { getPurchaseOrder } from '../../db/operations/purchases';

interface Props {
  poId: number;
  onBack: () => void;
  userId: number;
}

export default function PurchaseOrderDetail({ poId, onBack, userId }: Props) {
  const [purchaseOrder, setPurchaseOrder] = useState<(PurchaseOrder & { id: number }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPurchaseOrder = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const order = await getPurchaseOrder(poId, userId);
        
        if (order) {
          setPurchaseOrder(order as PurchaseOrder & { id: number });
        } else {
          setError('Purchase order not found or access denied.');
        }
      } catch (err) {
        console.error('Error loading purchase order:', err);
        setError('Failed to load purchase order.');
      } finally {
        setIsLoading(false);
      }
    };

    if (poId && userId) {
      loadPurchaseOrder();
    }
  }, [poId, userId]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Purchase Orders
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading purchase order details...</p>
        </div>
      </div>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Purchase Orders
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase Order Not Found</h3>
            <p className="text-gray-600 mb-4">
              {error || 'The purchase order you are looking for does not exist or you do not have permission to view it.'}
            </p>
            <button
              onClick={onBack}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Return to Purchase Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Purchase Orders
        </button>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Order #{purchaseOrder.id}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            purchaseOrder.status === 'approved' 
              ? 'bg-green-100 text-green-800'
              : purchaseOrder.status === 'fulfilled'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {purchaseOrder.status || 'draft'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">💰 Purchase Order Details</h1>
          <p className="text-blue-100">Supplier order information and item breakdown</p>
        </div>

        <div className="p-6">
          <PurchasePreview order={purchaseOrder} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => window.print()}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
          </svg>
          Print
        </button>
        
        <button
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}