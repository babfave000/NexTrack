// src/components/Suppliers/SupplierList.tsx
import { useState } from 'react';
import { useUserData } from '../../hooks/useUserData';
import { deleteSupplier } from '../../db/operations/suppliers'; // Import from centralized suppliers

interface Supplier {
  id?: number;
  name: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierListProps {
  onEdit?: (supplier: Supplier) => void;
  onSelect?: (supplier: Supplier) => void; // New prop for selection
  selectMode?: boolean; // New prop for selection mode
}

export default function SupplierList({ onEdit, onSelect, selectMode = false }: SupplierListProps) {
  const { isAuthenticated, user, suppliers: userSuppliers } = useUserData();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Keep user ID as number for the supplier operations
  const userId = user?.id ?? null;

  // Filter suppliers based on search term
  const filteredSuppliers = userSuppliers?.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.includes(searchTerm) ||
    supplier.address?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDelete = async (supplierId: number) => {
    if (!userId) return;

    try {
      await deleteSupplier(supplierId, userId); // userId is now a number
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete supplier. Please try again.');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    if (onEdit) {
      onEdit(supplier);
    }
  };

  const handleSelect = (supplier: Supplier) => {
    if (onSelect) {
      onSelect(supplier);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to view suppliers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {selectMode ? 'Select Supplier' : 'Suppliers'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''} found
              {selectMode && ' - Click to select'}
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Supplier List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredSuppliers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No suppliers found' : 'No suppliers yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Get started by adding your first supplier'
              }
            </p>
            {!searchTerm && (
              <p className="text-sm text-gray-500">
                Suppliers will appear here once you add them
              </p>
            )}
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className={`px-6 py-4 transition-colors group ${
                selectMode 
                  ? 'cursor-pointer hover:bg-blue-50 border-l-4 border-l-transparent hover:border-l-blue-500' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={selectMode ? () => handleSelect(supplier) : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  {/* Supplier Avatar */}
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">
                      {supplier.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>

                  {/* Supplier Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {supplier.name}
                      </h3>
                      {selectMode && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Select
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {supplier.contactEmail && (
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{supplier.contactEmail}</span>
                        </div>
                      )}

                      {supplier.phone && (
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{supplier.phone}</span>
                        </div>
                      )}

                      {supplier.address && (
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate max-w-xs">{supplier.address}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Added {formatDate(supplier.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions - Only show if not in select mode */}
                {!selectMode && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                    {onEdit && (
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit supplier"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}

                    {deleteConfirm === supplier.id ? (
                      <div className="flex items-center gap-2 bg-red-50 rounded-lg p-2">
                        <span className="text-xs text-red-700 font-medium">Confirm?</span>
                        <button
                          onClick={() => handleDelete(supplier.id!)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-gray-600 hover:text-gray-800 text-xs font-medium"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(supplier.id!)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete supplier"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      {filteredSuppliers.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredSuppliers.length} of {userSuppliers?.length || 0} suppliers
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}