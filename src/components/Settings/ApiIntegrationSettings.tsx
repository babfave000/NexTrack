// src/components/Settings/ApiIntegrationSettings.tsx
import { useState, useEffect } from 'react';
import { bankingService, type BankAccount, type Transaction } from '../../services/api/bankingService';

interface ApiConfig {
  enabled: boolean;
  apiKey: string;
  baseURL: string;
  service: string;
  isConnected?: boolean;
}

interface BankingAccount {
  id: string;
  name: string;
  accountNumber: string;
  balance: number;
}

interface BankingTransaction {
  id: string;
  description: string;
  date: Date;
  category: string;
  type: 'credit' | 'debit';
  amount: number;
}

interface EmailItem {
  id: string;
  to: string;
  subject: string;
  status: string;
  sentAt: Date;
}

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
}

interface PaymentTransaction {
  id: string;
  amount: number;
  status: string;
  customer: string;
  createdAt: Date;
}

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand?: string;
  bank?: string;
}

interface PreviewData {
  banking: {
    accounts: BankingAccount[];
    transactions: BankingTransaction[];
  };
  email: {
    sent: EmailItem[];
    templates: EmailTemplate[];
  };
  payments: {
    transactions: PaymentTransaction[];
    methods: PaymentMethod[];
  };
}

// Helper function to convert service types to preview types
const convertToBankingAccount = (account: BankAccount): BankingAccount => ({
  id: account.id,
  name: account.name,
  accountNumber: account.accountNumber || 'N/A',
  balance: account.balance
});

const convertToBankingTransaction = (transaction: Transaction): BankingTransaction => ({
  id: transaction.id,
  description: transaction.description,
  date: transaction.date,
  category: transaction.category || 'Uncategorized',
  type: transaction.type,
  amount: transaction.amount
});

export default function ApiIntegrationSettings() {
  const [integrations, setIntegrations] = useState<Record<string, ApiConfig>>({
    email: { enabled: false, apiKey: '', baseURL: '', service: 'email', isConnected: false },
    banking: { enabled: false, apiKey: '', baseURL: '', service: 'banking', isConnected: false },
    payments: { enabled: false, apiKey: '', baseURL: '', service: 'payments', isConnected: false }
  });

  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData>({
    banking: { accounts: [], transactions: [] },
    email: { sent: [], templates: [] },
    payments: { transactions: [], methods: [] }
  });

  useEffect(() => {
    const savedIntegrations = localStorage.getItem('nexTrack_apiIntegrations');
    if (savedIntegrations) {
      setIntegrations(JSON.parse(savedIntegrations));
    }
  }, []);

  const saveIntegrations = (newIntegrations: Record<string, ApiConfig>) => {
    localStorage.setItem('nexTrack_apiIntegrations', JSON.stringify(newIntegrations));
  };

  const handleToggleIntegration = async (service: string) => {
    const newEnabled = !integrations[service].enabled;
    const newIntegrations = {
      ...integrations,
      [service]: {
        ...integrations[service],
        enabled: newEnabled
      }
    };
    
    setIntegrations(newIntegrations);
    saveIntegrations(newIntegrations);

    if (!newEnabled) {
      const disconnectedIntegrations = {
        ...newIntegrations,
        [service]: {
          ...newIntegrations[service],
          isConnected: false
        }
      };
      setIntegrations(disconnectedIntegrations);
      saveIntegrations(disconnectedIntegrations);
    }
  };

  const handleApiConfigChange = (service: string, field: string, value: string) => {
    const newIntegrations = {
      ...integrations,
      [service]: {
        ...integrations[service],
        [field]: value,
        isConnected: false
      }
    };
    setIntegrations(newIntegrations);
    saveIntegrations(newIntegrations);
  };

  const testConnection = async (service: string) => {
    setIsTesting(service);
    
    try {
      const config = integrations[service];
      
      if (service === 'banking') {
        await bankingService.connect(config.apiKey, config.baseURL);
      }
      // Simulate other service connections
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newIntegrations = {
        ...integrations,
        [service]: {
          ...integrations[service],
          isConnected: true
        }
      };
      setIntegrations(newIntegrations);
      saveIntegrations(newIntegrations);

      alert(`✅ ${getServiceDisplayName(service)} connected successfully!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to connect to ${getServiceDisplayName(service)}: ${errorMessage}`);
    } finally {
      setIsTesting(null);
    }
  };

  const previewServiceData = async (service: string) => {
    try {
      setIsTesting(`${service}-preview`);
      
      if (service === 'banking') {
        const accounts = await bankingService.getAccounts();
        const transactions = await bankingService.getTransactions(
          accounts[0]?.id || '1',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date()
        );
        
        // Convert service types to preview types
        const convertedAccounts = accounts.map(convertToBankingAccount);
        const convertedTransactions = transactions.map(convertToBankingTransaction);
        
        setPreviewData(prev => ({ 
          ...prev, 
          banking: { 
            accounts: convertedAccounts, 
            transactions: convertedTransactions 
          } 
        }));
      }
      else if (service === 'email') {
        // Simulate email service data
        const emailData = {
          sent: [
            { id: '1', to: 'customer@example.com', subject: 'Invoice #INV-001', status: 'Delivered', sentAt: new Date() },
            { id: '2', to: 'vendor@supplier.com', subject: 'Purchase Order #PO-123', status: 'Opened', sentAt: new Date(Date.now() - 86400000) }
          ],
          templates: [
            { id: '1', name: 'Invoice Template', type: 'Transactional' },
            { id: '2', name: 'Welcome Email', type: 'Marketing' }
          ]
        };
        setPreviewData(prev => ({ ...prev, email: emailData }));
      }
      else if (service === 'payments') {
        // Simulate payment gateway data
        const paymentData = {
          transactions: [
            { id: 'pay_1', amount: 299.99, status: 'succeeded', customer: 'Customer A', createdAt: new Date() },
            { id: 'pay_2', amount: 150.50, status: 'pending', customer: 'Customer B', createdAt: new Date(Date.now() - 172800000) }
          ],
          methods: [
            { id: 'pm_1', type: 'card', last4: '4242', brand: 'Visa' },
            { id: 'pm_2', type: 'bank_account', bank: 'Chase', last4: '6789' }
          ]
        };
        setPreviewData(prev => ({ ...prev, payments: paymentData }));
      }

      alert(`✅ ${getServiceDisplayName(service)} preview loaded! Check the demo below.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to load ${getServiceDisplayName(service)} preview: ${errorMessage}`);
    } finally {
      setIsTesting(null);
    }
  };

  const getServiceDisplayName = (service: string) => {
    const names: Record<string, string> = {
      email: 'Email Service',
      banking: 'Banking API',
      payments: 'Payment Gateway'
    };
    return names[service] || service;
  };

  const renderServicePreview = (service: string) => {
    const data = previewData[service as keyof PreviewData];
    if (!data) return null;

    // Use block-scoped variables with type assertions
    switch (service) {
      case 'banking': {
        const bankingData = data as PreviewData['banking'];
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">Preview - Banking Data (v3.0)</h4>
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-600 mb-2">Connected Accounts</h5>
              <div className="space-y-2">
                {bankingData.accounts.map((account) => (
                  <div key={account.id} className="flex justify-between items-center p-2 bg-white rounded border">
                    <div>
                      <p className="font-medium text-sm">{account.name}</p>
                      <p className="text-xs text-gray-500">{account.accountNumber}</p>
                    </div>
                    <p className="font-semibold text-green-600">
                      ${account.balance.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-600 mb-2">Recent Transactions</h5>
              <div className="space-y-2">
                {bankingData.transactions.slice(0, 3).map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-2 bg-white rounded border">
                    <div>
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-gray-500">
                        {transaction.date.toLocaleDateString()} • {transaction.category}
                      </p>
                    </div>
                    <p className={`font-semibold ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}${transaction.amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'email': {
        const emailData = data as PreviewData['email'];
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">Preview - Email Service (v3.0)</h4>
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-600 mb-2">Recent Emails</h5>
              <div className="space-y-2">
                {emailData.sent.map((email) => (
                  <div key={email.id} className="flex justify-between items-center p-2 bg-white rounded border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{email.subject}</p>
                      <p className="text-xs text-gray-500">To: {email.to}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        email.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {email.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {email.sentAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-600 mb-2">Email Templates</h5>
              <div className="grid grid-cols-2 gap-2">
                {emailData.templates.map((template) => (
                  <div key={template.id} className="p-2 bg-white rounded border text-center">
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-gray-500">{template.type}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'payments': {
        const paymentsData = data as PreviewData['payments'];
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">Preview - Payment Gateway (v3.0)</h4>
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-600 mb-2">Recent Payments</h5>
              <div className="space-y-2">
                {paymentsData.transactions.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-2 bg-white rounded border">
                    <div>
                      <p className="font-medium text-sm">{payment.customer}</p>
                      <p className="text-xs text-gray-500">Payment #{payment.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">${payment.amount}</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        payment.status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-600 mb-2">Payment Methods</h5>
              <div className="grid grid-cols-2 gap-2">
                {paymentsData.methods.map((method) => (
                  <div key={method.id} className="p-2 bg-white rounded border text-center">
                    <p className="font-medium text-sm capitalize">{method.type}</p>
                    <p className="text-xs text-gray-500">
                      {method.type === 'card' ? `${method.brand} •••• ${method.last4}` : `${method.bank} •••• ${method.last4}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">🔌 API Integrations</h2>
      
      <div className="space-y-6">
        {/* Banking API Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-700">Banking API</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-500">Connect to your bank for automatic transaction matching</p>
              </div>
              {integrations.banking.isConnected && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
              )}
            </div>
            <button
              onClick={() => handleToggleIntegration('banking')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                integrations.banking.enabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  integrations.banking.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {integrations.banking.enabled && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-600">🚀</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Banking API - Coming in v3.0</h4>
                    <p className="text-sm text-yellow-700">
                      Automatic payment reconciliation and cash flow monitoring. Test integration setup now.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={integrations.banking.apiKey}
                    onChange={(e) => handleApiConfigChange('banking', 'apiKey', e.target.value)}
                    placeholder="Enter your banking API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                  <input
                    type="text"
                    value={integrations.banking.baseURL}
                    onChange={(e) => handleApiConfigChange('banking', 'baseURL', e.target.value)}
                    placeholder="https://api.bank.com/v1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => testConnection('banking')}
                  disabled={isTesting === 'banking' || !integrations.banking.apiKey || !integrations.banking.baseURL}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {isTesting === 'banking' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={() => previewServiceData('banking')}
                  disabled={isTesting === 'banking-preview' || !integrations.banking.isConnected}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {isTesting === 'banking-preview' ? 'Loading...' : 'Preview Features'}
                </button>
              </div>

              {renderServicePreview('banking')}
            </div>
          )}
        </div>

        {/* Email Service Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-700">Email Service</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-500">Automated invoice delivery and customer communications</p>
              </div>
              {integrations.email.isConnected && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
              )}
            </div>
            <button
              onClick={() => handleToggleIntegration('email')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                integrations.email.enabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  integrations.email.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {integrations.email.enabled && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-600">🚀</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Email Service - Coming in v3.0</h4>
                    <p className="text-sm text-yellow-700">
                      Automated invoice delivery, email tracking, and customer communication templates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={integrations.email.apiKey}
                    onChange={(e) => handleApiConfigChange('email', 'apiKey', e.target.value)}
                    placeholder="Enter your email service API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                  <input
                    type="text"
                    value={integrations.email.baseURL}
                    onChange={(e) => handleApiConfigChange('email', 'baseURL', e.target.value)}
                    placeholder="https://api.emailservice.com/v1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => testConnection('email')}
                  disabled={isTesting === 'email' || !integrations.email.apiKey || !integrations.email.baseURL}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {isTesting === 'email' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={() => previewServiceData('email')}
                  disabled={isTesting === 'email-preview' || !integrations.email.isConnected}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {isTesting === 'email-preview' ? 'Loading...' : 'Preview Features'}
                </button>
              </div>

              {renderServicePreview('email')}
            </div>
          )}
        </div>

        {/* Payment Gateway Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-700">Payment Gateway</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-500">Secure online payment processing</p>
              </div>
              {integrations.payments.isConnected && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
              )}
            </div>
            <button
              onClick={() => handleToggleIntegration('payments')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                integrations.payments.enabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  integrations.payments.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {integrations.payments.enabled && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-600">🚀</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Payment Gateway - Coming in v3.0</h4>
                    <p className="text-sm text-yellow-700">
                      Secure payment processing, subscription management, and multi-currency support.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={integrations.payments.apiKey}
                    onChange={(e) => handleApiConfigChange('payments', 'apiKey', e.target.value)}
                    placeholder="Enter your payment gateway API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                  <input
                    type="text"
                    value={integrations.payments.baseURL}
                    onChange={(e) => handleApiConfigChange('payments', 'baseURL', e.target.value)}
                    placeholder="https://api.payments.com/v1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => testConnection('payments')}
                  disabled={isTesting === 'payments' || !integrations.payments.apiKey || !integrations.payments.baseURL}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {isTesting === 'payments' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={() => previewServiceData('payments')}
                  disabled={isTesting === 'payments-preview' || !integrations.payments.isConnected}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {isTesting === 'payments-preview' ? 'Loading...' : 'Preview Features'}
                </button>
              </div>

              {renderServicePreview('payments')}
            </div>
          )}
        </div>

        {/* Features Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-800 mb-2">Email Service</h4>
            <div className="text-sm text-purple-700 space-y-1">
              <p>• Automated invoice delivery</p>
              <p>• Email open/click tracking</p>
              <p>• Customizable templates</p>
              <p>• Bulk email campaigns</p>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">Banking API</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>• Automatic payment matching</p>
              <p>• Cash flow monitoring</p>
              <p>• Expense categorization</p>
              <p>• Real-time reconciliation</p>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Payment Gateway</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Secure payment processing</p>
              <p>• Subscription management</p>
              <p>• Multi-currency support</p>
              <p>• Fraud detection</p>
            </div>
          </div>
        </div>

        {/* Version Notice */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 text-center">
          <h4 className="font-semibold text-blue-800 mb-1">🚀 All Integrations Coming in v3.0</h4>
          <p className="text-sm text-blue-700">
            These powerful integrations will transform your inventory management into a complete business automation platform.
            Stay tuned for the next major release!
          </p>
        </div>
      </div>
    </div>
  );
}