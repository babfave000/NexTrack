// src/pages/Sales/ChangeLeftForm.tsx
import { useState, useEffect } from 'react';
import { db } from '../../db/dexie';
import { toast } from 'react-toastify';

interface ChangeLeftFormProps {
  userId: number;
}

interface ChangeLeftRecord {
  id?: number;
  orderId: number;
  customerName: string;
  amount: number;
  status: 'uncollected' | 'collected';
  createdAt: string;
  collectedAt?: string;
  userId: number;
}

interface SalesOrder {
  id?: number;
  customer?: string | null;
  // add other properties from your salesOrders table as needed
}

export default function ChangeLeftForm({ userId }: ChangeLeftFormProps) {
  const [orderId, setOrderId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  useEffect(() => {
    const loadSalesOrders = async () => {
      try {
        const orders = await db.salesOrders
          .where('userId')
          .equals(userId)
          .toArray();
        setSalesOrders(orders);
      } catch (error) {
        console.error('Error loading sales orders:', error);
      }
    };

    loadSalesOrders();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderId || !customerName || !amount) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const changeRecord: Omit<ChangeLeftRecord, 'id'> = {
        orderId: parseInt(orderId),
        customerName,
        amount: parseFloat(amount),
        status: 'uncollected',
        createdAt: new Date().toISOString(),
        userId,
      };

      await db.changeLeft.add(changeRecord);
      
      toast.success('Change left recorded successfully!');
      setOrderId('');
      setCustomerName('');
      setAmount('');
      
    } catch (error) {
      console.error('Error saving change left:', error);
      toast.error('Failed to record change left. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Record Change Left</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order ID *
            </label>
            <select
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Order ID</option>
              {salesOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  #{order.id} - {order.customer || 'Unknown Customer'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter customer name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₦) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50"
          >
            {isLoading ? 'Recording...' : 'Record Change Left'}
          </button>
        </div>
      </form>
    </div>
  );
}