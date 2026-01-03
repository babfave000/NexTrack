// src/components/Suppliers/SupplierForm.tsx
import { useState, useEffect } from 'react';
import { useUserData } from '../../hooks/useUserData';
import { addSupplier } from '../../db/operations/suppliers'; // Import from centralized suppliers

// Function to capitalize first letter of each word
const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

interface SupplierFormProps {
  onSaved?: () => void;
}

export default function SupplierForm({ onSaved }: SupplierFormProps) {
  const { isAuthenticated, user } = useUserData();
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Keep user ID as number for the supplier operations
  const userId = user?.id ?? null;

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const validateEmail = (email: string) =>
    !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !userId) {
      setError('Please log in to add suppliers.');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    const trimmedName = name.trim();
    const trimmedEmail = contactEmail.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      setError('Supplier name is required.');
      setIsLoading(false);
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      // Use the centralized addSupplier function from suppliers.ts
      // Pass userId as number (no conversion to string)
      await addSupplier({
        name: capitalizeWords(trimmedName),
        contactEmail: trimmedEmail,
        phone: trimmedPhone,
        address: trimmedAddress,
      }, userId); // userId is now a number

      setSuccess('Supplier added successfully.');
      setName('');
      setContactEmail('');
      setPhone('');
      setAddress('');
      onSaved?.();
    } catch (err) {
      console.error('Error adding supplier:', err);
      setError(err instanceof Error ? err.message : 'Failed to add supplier.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(capitalizeWords(e.target.value));
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 max-w-md w-full">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to manage suppliers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 max-w-md w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Add New Supplier</h2>
          <p className="text-sm text-gray-600">Add supplier to centralized supplier list</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="supplier-name" className="block text-sm font-medium text-gray-700">
            Supplier Name *
          </label>
          <input
            id="supplier-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter supplier name"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="supplier-email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="supplier-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="supplier@example.com"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="supplier-phone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            id="supplier-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="+234 800 000 0000"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="supplier-address" className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <textarea
            id="supplier-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Supplier address..."
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Adding Supplier...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Save Supplier
            </>
          )}
        </button>
      </form>

      {/* User Info Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Adding supplier for: <span className="font-medium text-gray-700">{user?.name}</span>
        </p>
      </div>
    </div>
  );
}