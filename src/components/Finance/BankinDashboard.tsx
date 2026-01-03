// src/components/Finance/BankingDashboard.tsx
import { useState, useEffect, useCallback } from 'react';
import { bankingService, type BankAccount, type Transaction, type ReconciliationResult } from '../../services/api/bankingService';

export default function BankingDashboard() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const loadAccountTransactions = useCallback(async (accountId: string) => {
    setIsLoading(true);
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
      const endDate = new Date();
      const transactionsData = await bankingService.getTransactions(accountId, startDate, endDate);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadBankingData = useCallback(async () => {
    // Remove the private property check since isConnected is private
    setIsLoading(true);
    try {
      const accountsData = await bankingService.getAccounts();
      
      setAccounts(accountsData);
      if (accountsData.length > 0) {
        setSelectedAccount(accountsData[0].id);
        await loadAccountTransactions(accountsData[0].id);
      }
    } catch (error) {
      console.error('Failed to load banking data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadAccountTransactions]);

  const handleReconcile = async () => {
    setIsLoading(true);
    try {
      const result = await bankingService.reconcileTransactionsWithInvoices();
      setReconciliation(result);
      alert(`✅ Reconciled ${result.matchedTransactions.length} transactions!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`❌ Reconciliation failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
    loadAccountTransactions(accountId);
  };

  useEffect(() => {
    loadBankingData();
  }, [loadBankingData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">🏦 Banking Dashboard</h2>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {accounts.map(account => (
          <div key={account.id} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">{account.name}</h3>
            <p className="text-2xl font-bold text-green-600">
              ${account.balance.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              Available: ${account.availableBalance.toLocaleString()}
            </p>
            <button
              onClick={() => handleAccountChange(account.id)}
              className={`mt-2 px-3 py-1 text-sm rounded ${
                selectedAccount === account.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              View Transactions
            </button>
          </div>
        ))}
      </div>

      {/* Reconciliation Section */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-800">Payment Reconciliation</h3>
            <p className="text-sm text-blue-600">
              Automatically match bank transactions with unpaid invoices
            </p>
          </div>
          <button
            onClick={handleReconcile}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Reconciling...' : 'Reconcile Payments'}
          </button>
        </div>

        {reconciliation && (
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-green-600 font-bold">
                {reconciliation.matchedTransactions.length}
              </div>
              <div className="text-gray-600">Matched</div>
            </div>
            <div className="text-center">
              <div className="text-orange-600 font-bold">
                {reconciliation.unmatchedTransactions.length}
              </div>
              <div className="text-gray-600">Unmatched</div>
            </div>
            <div className="text-center">
              <div className="text-blue-600 font-bold">
                ${reconciliation.totalMatchedAmount.toLocaleString()}
              </div>
              <div className="text-gray-600">Total Matched</div>
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div>
        <h3 className="font-medium text-gray-700 mb-3">Recent Transactions</h3>
        <div className="space-y-2">
          {transactions.map(transaction => (
            <div
              key={transaction.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                transaction.matched ? 'bg-green-50 border-green-200' : 'bg-gray-50'
              }`}
            >
              <div>
                <div className="font-medium">{transaction.description}</div>
                <div className="text-sm text-gray-500">
                  {transaction.date.toLocaleDateString()} • 
                  {transaction.matched && (
                    <span className="text-green-600 ml-1">
                      ✓ Matched with {transaction.invoiceId}
                    </span>
                  )}
                </div>
              </div>
              <div className={`font-bold ${
                transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'credit' ? '+' : '-'}${transaction.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}