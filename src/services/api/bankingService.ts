// src/services/api/bankingService.ts
export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  type: 'debit' | 'credit';
  category?: string;
  status: 'pending' | 'completed' | 'failed';
  invoiceId?: string; // Linked invoice
  matched: boolean; // Whether transaction was matched with an invoice
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
  availableBalance: number;
  currency: string;
  accountNumber: string;
  type: 'checking' | 'savings' | 'credit';
}

export interface Invoice {
  id: string;
  customerName: string;
  total: number;
  dueDate: Date;
  status: 'paid' | 'unpaid';
}

export interface ReconciliationResult {
  matchedTransactions: Transaction[];
  unmatchedTransactions: Transaction[];
  totalMatchedAmount: number;
}

export class BankingService {
  private apiKey: string = '';
  private baseURL: string = '';
  private isConnected: boolean = false;

  async connect(apiKey: string, baseURL: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    
    try {
      const response = await this.testConnection();
      this.isConnected = true;
      return response;
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey || !this.baseURL) {
      throw new Error('API configuration missing');
    }
    
    // Simulate API connection test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real implementation, this would validate credentials
    if (this.apiKey === 'invalid') {
      throw new Error('Invalid API credentials');
    }
    
    return true;
  }

  async getAccounts(): Promise<BankAccount[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to banking API');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
      {
        id: 'acc_1',
        name: 'Business Checking',
        balance: 15420.75,
        availableBalance: 15200.50,
        currency: 'USD',
        accountNumber: '****1234',
        type: 'checking'
      },
      {
        id: 'acc_2',
        name: 'Business Savings',
        balance: 32500.00,
        availableBalance: 32500.00,
        currency: 'USD',
        accountNumber: '****5678',
        type: 'savings'
      }
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTransactions(_accountId: string, _startDate: Date, _endDate: Date): Promise<Transaction[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to banking API');
    }

    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulated transaction data that might match invoices
    return [
      {
        id: 'txn_1',
        date: new Date('2024-01-15'),
        amount: 1500.00,
        description: 'INV-2024-001 Client Payment - ABC Corp',
        type: 'credit',
        category: 'Revenue',
        status: 'completed',
        matched: true,
        invoiceId: 'INV-2024-001'
      },
      {
        id: 'txn_2',
        date: new Date('2024-01-14'),
        amount: 245.50,
        description: 'Office Supplies Purchase',
        type: 'debit',
        category: 'Expenses',
        status: 'completed',
        matched: false
      },
      {
        id: 'txn_3',
        date: new Date('2024-01-13'),
        amount: 299.99,
        description: 'INV-2024-002 XYZ Company',
        type: 'credit',
        category: 'Revenue',
        status: 'completed',
        matched: false // Not automatically matched
      }
    ];
  }

  /**
   * Match bank transactions with unpaid invoices
   */
  async reconcileTransactionsWithInvoices(): Promise<ReconciliationResult> {
    if (!this.isConnected) {
      throw new Error('Not connected to banking API');
    }

    // Get recent transactions from all accounts
    const accounts = await this.getAccounts();
    const allTransactions: Transaction[] = [];
    
    for (let i = 0; i < accounts.length; i++) {
      const transactions = await this.getTransactions(accounts[i].id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
      allTransactions.push(...transactions);
    }

    // Get unpaid invoices from database
    const unpaidInvoices = await this.getUnpaidInvoices();
    
    const result: ReconciliationResult = {
      matchedTransactions: [],
      unmatchedTransactions: [],
      totalMatchedAmount: 0
    };

    // Match transactions with invoices
    for (const transaction of allTransactions) {
      if (transaction.type === 'credit') { // Only match incoming payments
        const matchedInvoice = this.findMatchingInvoice(transaction, unpaidInvoices);
        
        if (matchedInvoice) {
          const matchedTransaction = {
            ...transaction,
            matched: true,
            invoiceId: matchedInvoice.id
          };
          result.matchedTransactions.push(matchedTransaction);
          result.totalMatchedAmount += transaction.amount;
          
          // Update invoice status in database
          await this.updateInvoicePaymentStatus(matchedInvoice.id, 'paid', transaction.id);
        } else {
          result.unmatchedTransactions.push(transaction);
        }
      } else {
        result.unmatchedTransactions.push(transaction);
      }
    }

    console.log('Reconciliation completed:', {
      matched: result.matchedTransactions.length,
      unmatched: result.unmatchedTransactions.length,
      totalAmount: result.totalMatchedAmount
    });

    return result;
  }

  /**
   * Find invoice that matches a transaction
   */
  private findMatchingInvoice(transaction: Transaction, invoices: Invoice[]): Invoice | null {
    // Strategy 1: Check for invoice number in description
    const invoiceMatch = invoices.find(invoice => 
      transaction.description.includes(invoice.id) ||
      transaction.description.includes(invoice.customerName)
    );

    if (invoiceMatch) return invoiceMatch;

    // Strategy 2: Match by amount and date proximity
    const amountMatch = invoices.find(invoice => 
      Math.abs(invoice.total - transaction.amount) < 0.01 && // Exact amount match
      Math.abs(new Date(invoice.dueDate).getTime() - transaction.date.getTime()) < 7 * 24 * 60 * 60 * 1000 // Within 7 days
    );

    return amountMatch || null;
  }

  /**
   * Get unpaid invoices from database
   */
  private async getUnpaidInvoices(): Promise<Invoice[]> {
    // This would query your actual database
    // For now, return mock data
    return [
      {
        id: 'INV-2024-001',
        customerName: 'ABC Corp',
        total: 1500.00,
        dueDate: new Date('2024-01-15'),
        status: 'unpaid'
      },
      {
        id: 'INV-2024-002',
        customerName: 'XYZ Company',
        total: 299.99,
        dueDate: new Date('2024-01-13'),
        status: 'unpaid'
      },
      {
        id: 'INV-2024-003',
        customerName: 'Demo Client',
        total: 500.00,
        dueDate: new Date('2024-01-20'),
        status: 'unpaid'
      }
    ];
  }

  /**
   * Update invoice payment status in database
   */
  private async updateInvoicePaymentStatus(
    invoiceId: string, 
    status: 'paid' | 'unpaid', 
    transactionId: string
  ): Promise<void> {
    // This would update your actual database
    console.log(`Updating invoice ${invoiceId} to ${status} with transaction ${transactionId}`);
    
    // Simulate database update
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get financial summary for dashboard
   */
  async getFinancialSummary(): Promise<{
    totalBalance: number;
    revenueThisMonth: number;
    expensesThisMonth: number;
    pendingTransactions: number;
  }> {
    if (!this.isConnected) {
      throw new Error('Not connected to banking API');
    }

    const accounts = await this.getAccounts();
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Get this month's transactions for revenue/expense calculation
    const allTransactions: Transaction[] = [];
    
    for (const account of accounts) {
      console.log(`Fetching transactions for account ${account.id}`);
      const transactions = await this.getTransactions(account.id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
      allTransactions.push(...transactions);
    }

    const revenueThisMonth = allTransactions
      .filter(t => t.type === 'credit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesThisMonth = allTransactions
      .filter(t => t.type === 'debit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingTransactions = allTransactions
      .filter(t => t.status === 'pending')
      .length;

    return {
      totalBalance,
      revenueThisMonth,
      expensesThisMonth,
      pendingTransactions
    };
  }

  /**
   * Manual transaction-invoice matching for unmatched transactions
   */
  async manuallyMatchTransaction(
    transactionId: string, 
    invoiceId: string
  ): Promise<void> {
    // Update both transaction and invoice records
    console.log(`Manually matching transaction ${transactionId} with invoice ${invoiceId}`);
    await this.updateInvoicePaymentStatus(invoiceId, 'paid', transactionId);
  }

  disconnect(): void {
    this.isConnected = false;
    this.apiKey = '';
    this.baseURL = '';
    console.log('Banking API disconnected');
  }
}

export const bankingService = new BankingService();