//src/components/FixPurchasesButton.tsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fixExistingPurchases, getPurchasePaymentStats } from '../db/operations/purchases';

export default function FixPurchasesButton() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number } | null>(null);
  const [stats, setStats] = useState<{ total: number; unpaid: number; paid: number } | null>(null);

  const loadStats = async () => {
    if (!user) return;
    const paymentStats = await getPurchasePaymentStats(user.id!);
    setStats({
      total: paymentStats.totalPurchases,
      unpaid: paymentStats.unpaidPurchases,
      paid: paymentStats.paidPurchases,
    });
  };

  const handleFixPurchases = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const updatedCount = await fixExistingPurchases(user.id!);
      setResult({ updated: updatedCount });
      await loadStats(); // Refresh stats
    } catch (error) {
      console.error('Error fixing purchases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-medium text-yellow-800 mb-2">
        Fix Purchase Payment Status
      </h3>
      
      {stats && (
        <div className="mb-3 text-sm text-yellow-700">
          <p>Total Purchases: {stats.total}</p>
          <p>Paid: {stats.paid} | Unpaid: {stats.unpaid}</p>
        </div>
      )}
      
      <button
        onClick={handleFixPurchases}
        disabled={isLoading}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : 'Mark All Purchases as Paid'}
      </button>
      
      {result && (
        <p className="mt-2 text-sm text-green-600">
          Successfully updated {result.updated} purchases to paid status.
        </p>
      )}
      
      <button
        onClick={loadStats}
        className="ml-3 text-yellow-700 hover:text-yellow-800 text-sm underline"
      >
        Refresh Stats
      </button>
    </div>
  );
}