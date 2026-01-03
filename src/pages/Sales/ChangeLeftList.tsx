// src/pages/Sales/ChangeLeftList.tsx
import { useState, useEffect, useCallback } from 'react';
import { db } from '../../db/dexie';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

interface ChangeLeftRecord {
  id?: number;
  orderId: number;
  customerName: string;
  amount: number;
  status: 'uncollected' | 'collected';
  createdAt: string;
  collectedAt?: string;
  userId: number;
  organizationId?: number;
}

interface ChangeLeftListProps {
  userId: number;
}

export default function ChangeLeftList({ userId }: ChangeLeftListProps) {
  const [changeRecords, setChangeRecords] = useState<ChangeLeftRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadChangeRecords = useCallback(async () => {
    try {
      const records = await db.changeLeft
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('createdAt');
      setChangeRecords(records);
    } catch (error) {
      console.error('Error loading change records:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadChangeRecords();
  }, [loadChangeRecords]);

  const markAsCollected = async (recordId: number) => {
    if (window.confirm('Are you sure you want to mark this change as collected?')) {
      try {
        await db.changeLeft.update(recordId, {
          status: 'collected',
          collectedAt: new Date().toISOString(),
        });
        
        toast.success('Change marked as collected!');
        loadChangeRecords();
      } catch (error) {
        console.error('Error updating change record:', error);
        toast.error('Failed to update record. Please try again.');
      }
    }
  };

  // FIXED: Use proper decimal precision for calculations
  const totalUncollected = changeRecords
    .filter(record => record.status === 'uncollected')
    .reduce((sum, record) => {
      // Convert to cents to avoid floating point errors
      const amountInCents = Math.round(record.amount * 100);
      const sumInCents = Math.round(sum * 100);
      return (sumInCents + amountInCents) / 100;
    }, 0);

  const totalCollected = changeRecords
    .filter(record => record.status === 'collected')
    .reduce((sum, record) => {
      // Convert to cents to avoid floating point errors
      const amountInCents = Math.round(record.amount * 100);
      const sumInCents = Math.round(sum * 100);
      return (sumInCents + amountInCents) / 100;
    }, 0);

  // FIXED: Format currency with proper rounding
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="h-12 bg-gray-200 rounded mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Change Left Records</h2>
        <div className="text-sm text-gray-500">
          {changeRecords.length} record{changeRecords.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800">
            <div className="text-sm font-medium">Total Uncollected</div>
            <div className="text-2xl font-bold">{formatCurrency(totalUncollected)}</div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800">
            <div className="text-sm font-medium">Total Collected</div>
            <div className="text-2xl font-bold">{formatCurrency(totalCollected)}</div>
          </div>
        </div>
      </div>

      {changeRecords.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No change records found</h3>
          <p className="text-gray-600">Record change left from new sales orders</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₦)</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Recorded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Collected</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {changeRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{record.orderId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(record.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.status === 'collected'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(record.createdAt), 'dd MMM yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.collectedAt
                      ? format(new Date(record.collectedAt), 'dd MMM yyyy HH:mm')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    {record.status === 'uncollected' && (
                      <button
                        onClick={() => markAsCollected(record.id!)}
                        className="text-green-600 hover:text-green-800 transition-colors"
                        title="Mark as Collected"
                      >
                        Mark Collected
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}